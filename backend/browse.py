"""Imágenes browse de ASF: validación de URL, descarga con caché, KML y georreferencia."""
import hashlib
import os
import threading
import uuid
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

import httpx
import numpy as np
from PIL import Image

from . import config, geo, net
from .errors import InvalidInput, UpstreamError
from .ttl import TtlCache

MAX_BYTES = 40 * 1024 * 1024        # tope de descarga por imagen
MAX_DESCARGAS = 4                   # el PC del usuario es modesto
PNG_FIRMA = b'\x89PNG\r\n\x1a\n'
RESIZED_DIR = config.BROWSE_DIR / 'resized'
RANGO_CALIDAD = {'validated': 3, 'provisional': 2, 'beta': 1}

_cupos = threading.BoundedSemaphore(MAX_DESCARGAS)
_candados = {}
_candados_guarda = threading.Lock()
_kmls = {}
_mallas = TtlCache(64)


# ---------------------------------------------------------------- validación y caché en disco

def validate_asf_url(url, sufijo, mensaje):
    """Acepta solo https://<BROWSE_HOST>/…<sufijo>, sin credenciales ni puerto raro. Si no → InvalidInput."""
    try:
        partes = urlparse(url or '')
        puerto = partes.port
    except ValueError:
        raise InvalidInput(mensaje) from None
    if partes.scheme != 'https' or (partes.hostname or '').lower() != config.BROWSE_HOST:
        raise InvalidInput(mensaje)
    if partes.username or partes.password or puerto not in (None, 443):
        raise InvalidInput(mensaje)
    if not partes.path.lower().endswith(sufijo):
        raise InvalidInput(mensaje)
    return url


def validate_browse_url(url):
    """Acepta solo https://<BROWSE_HOST>/…*.png. Cualquier otra cosa → InvalidInput."""
    return validate_asf_url(
        url, '.png', 'Solo se aceptan imágenes browse PNG de nisar.asf.earthdatacloud.nasa.gov por https.')


def cache_path(url):
    """Ruta estable en disco para una URL (hash: evita nombres largos y caracteres raros)."""
    return config.BROWSE_DIR / (hashlib.sha1(url.encode('utf-8')).hexdigest()[:24] + '.png')


def _candado(clave):
    with _candados_guarda:
        return _candados.setdefault(clave, threading.Lock())


def _descargar(url, destino):
    """Descarga en streaming a un temporal y lo mueve al destino (escritura atómica)."""
    temporal = destino.with_name(f'{destino.name}.{uuid.uuid4().hex}.part')
    try:
        with _cupos:
            try:
                with net.client.stream('GET', url) as respuesta:
                    if respuesta.status_code != 200:
                        raise UpstreamError(
                            f'ASF respondió {respuesta.status_code} al pedir la imagen; '
                            'puede no estar disponible públicamente.')
                    declarado = int(respuesta.headers.get('content-length') or 0)
                    if declarado > MAX_BYTES:
                        raise UpstreamError('La imagen supera el tamaño máximo permitido (40 MB).')
                    total = 0
                    with open(temporal, 'wb') as archivo:
                        for trozo in respuesta.iter_bytes(65536):
                            total += len(trozo)
                            if total > MAX_BYTES:
                                raise UpstreamError('La imagen supera el tamaño máximo permitido (40 MB).')
                            archivo.write(trozo)
            except httpx.HTTPError as error:
                raise UpstreamError(
                    'No fue posible descargar la imagen desde ASF. Reintenta en unos momentos.') from error
        with open(temporal, 'rb') as archivo:
            if archivo.read(8) != PNG_FIRMA:
                raise UpstreamError('ASF devolvió un archivo que no es una imagen PNG.')
        os.replace(temporal, destino)
    finally:
        temporal.unlink(missing_ok=True)


def fetch_browse(url):
    """Devuelve la ruta local de la imagen browse; la descarga una sola vez (candado por archivo)."""
    validate_browse_url(url)
    destino = cache_path(url)
    if destino.exists():
        return destino
    with _candado(destino.name):
        if not destino.exists():
            _descargar(url, destino)
    return destino


# ---------------------------------------------------------------- lectura de píxeles

@lru_cache(maxsize=6)
def _leer(ruta, modo, mtime):
    with Image.open(ruta) as imagen:
        arreglo = np.asarray(imagen.convert(modo))
    arreglo.flags.writeable = False
    return arreglo


def load_array(ruta, modo='RGB'):
    """Matriz (alto, ancho, canales) uint8 de solo lectura; se guardan las últimas 6 en memoria."""
    ruta = Path(ruta)
    return _leer(str(ruta), modo, ruta.stat().st_mtime_ns)


def image_file(url, ancho=None):
    """Ruta de la imagen (o de su versión reducida a `ancho` px, con caché) para /api/image."""
    original = fetch_browse(url)
    if ancho is None:
        return original
    with Image.open(original) as imagen:
        if imagen.size[0] <= ancho:
            return original
        destino = RESIZED_DIR / f'{original.stem}_{ancho}.png'
        if destino.exists():
            return destino
        alto = max(1, round(imagen.size[1] * ancho / imagen.size[0]))
        reducida = imagen.convert('RGBA').resize((ancho, alto), Image.LANCZOS)
    RESIZED_DIR.mkdir(parents=True, exist_ok=True)
    temporal = destino.with_name(f'{destino.name}.{uuid.uuid4().hex}.part')
    try:
        reducida.save(temporal, 'PNG', compress_level=3)
        os.replace(temporal, destino)
    finally:
        temporal.unlink(missing_ok=True)
    return destino


# ---------------------------------------------------------------- KML y georreferencia

def kml_bbox(url):
    """Caja del KML listado, o None si no responde 200 o no se puede leer (p. ej. 401)."""
    if url in _kmls:
        return _kmls[url]
    respuesta = net.get(url, what='el KML de ASF', ok=(200, 401, 403, 404), attempts=2)
    caja = None
    if respuesta.status_code == 200:
        try:
            caja = geo.parse_kml(respuesta.text)
        except (ValueError, IndexError):
            caja = None
    _kmls[url] = caja
    return caja


def resolve_gcov_grid(stack, pair, valid):
    """Caja geográfica del cuadro de una pila GCOV y cómo se obtuvo.

    Orden: KML propio de alguna escena del par → KML de otra escena de la pila (la caja geográfica
    es fija por pila) → ajuste por huella. `valid` es la máscara de píxeles con dato.
    Devuelve ((w, s, e, n), 'kml' | 'stack-kml' | 'footprint').
    """
    clave = stack['id']
    encontrado, valor = _mallas.get(clave)
    if encontrado:
        return valor
    propios = [s for s in pair if s.get('kml_url') and '/BROWSE/' in s['kml_url']]
    ids_propios = {s['id'] for s in propios}
    ajenos = sorted((s for s in stack['scenes'] if s.get('kml_url') and '/BROWSE/' in s['kml_url']
                     and s['id'] not in ids_propios and s['analyzable']),
                    key=lambda s: (RANGO_CALIDAD[s['quality']], s['date']), reverse=True)[:6]
    resultado = None
    for escena in propios:
        caja = kml_bbox(escena['kml_url'])
        if caja:
            resultado = (caja, 'kml')
            break
    if resultado is None:        # la caja es fija por pila aunque cambie el tamaño en píxeles entre modos
        for escena in ajenos:
            caja = kml_bbox(escena['kml_url'])
            if caja:
                resultado = (caja, 'stack-kml')
                break
    if resultado is None:
        resultado = (geo.fit_footprint(valid, geo.polygon_bbox(stack['footprint'])), 'footprint')
    _mallas.set(clave, resultado, 3600)
    return resultado


def resolve_overlay(registro, valid):
    """Georreferencia de un producto suelto (interferograma): KML listado si responde, si no huella."""
    if registro.get('kml_url'):
        caja = kml_bbox(registro['kml_url'])
        if caja:
            return caja, 'kml'
    return geo.fit_footprint(valid, geo.polygon_bbox(registro['footprint'])), 'footprint'
