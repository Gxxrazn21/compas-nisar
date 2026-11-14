"""Buscador de lugares: convierte el nombre de una ciudad o una dirección en coordenadas.

Usa Nominatim, el geocodificador de OpenStreetMap. Su política de uso pide identificar la
aplicación, no pasar de una petición por segundo y guardar los resultados. Aquí se cumplen
las tres: la cabecera User-Agent, una espera entre peticiones y una caché en memoria.
"""
import threading
import time

from fastapi import APIRouter, HTTPException, Query

from .extras import _ErrorDescarga, _fetch_json

router = APIRouter()

NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
FUENTE = 'OpenStreetMap Nominatim'
TTL = 24 * 60 * 60
MAX_ENTRADAS = 500
MAX_LUGARES = 5
INTERVALO = 1.1   # segundos entre peticiones a Nominatim

_cache = {}       # (consulta, idioma) -> (marca_de_tiempo, payload)
_lock = threading.Lock()
_ultima = 0.0     # time.monotonic() de la última petición


def _normalizar_lugar(item):
    """Convierte un resultado de Nominatim al formato del contrato; None si no sirve."""
    try:
        etiqueta = str(item['display_name']).strip()
        lon = float(item['lon'])
        lat = float(item['lat'])
    except (KeyError, TypeError, ValueError):
        return None
    if not etiqueta or not (-180 <= lon <= 180 and -90 <= lat <= 90):
        return None
    nombre = str(item.get('name') or '').strip() or etiqueta.split(',')[0].strip()
    return {'name': nombre, 'label': etiqueta, 'lon': lon, 'lat': lat,
            'kind': item.get('addresstype') or item.get('type')}


def _consultar(consulta, idioma):
    """Pide los lugares a Nominatim respetando la espera mínima entre peticiones."""
    global _ultima
    espera = INTERVALO - (time.monotonic() - _ultima)
    if espera > 0:
        time.sleep(espera)
    try:
        crudo = _fetch_json(NOMINATIM_URL, {'q': consulta, 'format': 'jsonv2', 'limit': MAX_LUGARES,
                                            'accept-language': idioma})
    finally:
        _ultima = time.monotonic()
    if not isinstance(crudo, list):
        raise _ErrorDescarga('respuesta inesperada')
    lugares = [lugar for lugar in (_normalizar_lugar(item) for item in crudo) if lugar]
    return {'places': lugares, 'source': FUENTE}


@router.get('/api/places')
def places(q: str = Query(max_length=120), lang: str = Query('en', pattern='^(es|en)$')):
    """Lugares que coinciden con un nombre o una dirección, con caché de un día."""
    consulta = ' '.join(q.split())
    if len(consulta) < 2:
        raise HTTPException(422, 'Escribe al menos dos letras para buscar un lugar.')
    clave = (consulta.casefold(), lang)
    with _lock:
        entrada = _cache.get(clave)
        if entrada and time.time() - entrada[0] < TTL:
            return entrada[1]
        try:
            payload = _consultar(consulta, lang)
        except _ErrorDescarga:
            raise HTTPException(502, 'No se pudo consultar el buscador de lugares. '
                                     'Inténtalo de nuevo o usa coordenadas.') from None
        if len(_cache) >= MAX_ENTRADAS:
            _cache.clear()
        _cache[clave] = (time.time(), payload)
        return payload
