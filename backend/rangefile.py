"""Archivo de solo lectura sobre HTTP por rangos para abrir un HDF5 remoto de ASF con h5py.

El token de Earthdata viaja únicamente en la cabecera `Authorization` y solo hacia el host de ASF.
La URL del `.h5` responde con una redirección a una URL firmada de CloudFront: no se siguen
redirecciones automáticamente, para decidir a qué host va cada cabecera. Los bloques descargados se
guardan en una caché LRU de memoria acotada y se pueden precalentar en paralelo (máximo 4 hilos).
"""
import io
import threading
import time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlparse

import httpx

from . import browse, config
from .errors import ServiceUnavailable, UpstreamError

BLOCK = 1024 * 1024               # tamaño de cada petición de rango
MAX_THREADS = 4                   # el PC del usuario es modesto
CACHE_MAX_BYTES = 192 * 1024 * 1024
MAX_SALTOS = 3                    # redirecciones que se siguen a mano al firmar
REINTENTOS = 3

_descargas = threading.BoundedSemaphore(MAX_THREADS)   # tope global de descargas simultáneas

MENSAJE_URL = 'Solo se aceptan archivos .h5 de nisar.asf.earthdatacloud.nasa.gov por https.'
MENSAJE_LOGIN = ('ASF rechazó el token de Earthdata. Inicia sesión una vez en https://urs.earthdata.nasa.gov '
                 'con la misma cuenta, acepta los términos de ASF (Alaska Satellite Facility) y vuelve a '
                 'generar el token si caducó; después reintenta.')


def validate_h5_url(url):
    """Acepta solo https://<BROWSE_HOST>/…*.h5, sin credenciales ni puerto raro."""
    return browse.validate_asf_url(url, '.h5', MENSAJE_URL)


def _es_asf(url):
    return (urlparse(url).hostname or '').lower() == config.BROWSE_HOST


class RangeFile(io.RawIOBase):
    """Archivo HDF5 remoto de solo lectura con firma de URL, caché de bloques y precalentamiento."""

    def __init__(self, url, token=None, transport=None, block=BLOCK, cache_bytes=CACHE_MAX_BYTES):
        super().__init__()
        self.url = validate_h5_url(url)
        self._token = token if token is not None else config.EARTHDATA_TOKEN
        if not self._token:
            raise ServiceUnavailable('Falta EARTHDATA_TOKEN en .env: la lupa calibrada lee el producto GCOV '
                                     'completo de ASF y necesita un token de Earthdata Login.')
        self._block = block
        self._cache_bytes = cache_bytes
        self._client = httpx.Client(timeout=httpx.Timeout(90.0, connect=15.0), follow_redirects=False,
                                    headers={'User-Agent': config.USER_AGENT}, transport=transport)
        self._cache = OrderedDict()
        self._cache_size = 0
        self._cache_lock = threading.Lock()
        self._sign_lock = threading.Lock()
        self._generation = 0
        self._directo = False          # ASF sirvió el archivo sin redirigir
        self.requests = 0
        self.bytes = 0
        self.pos = 0
        self._signed = None
        self.size = 0
        self._sign()
        self.size = self._read_size()

    # ------------------------------------------------------------ firma y peticiones

    def _headers(self, destino, extra=None):
        """Cabeceras de una petición: el token solo si el destino es exactamente el host de ASF."""
        headers = dict(extra or {})
        if _es_asf(destino):
            headers['Authorization'] = f'Bearer {self._token}'
        return headers

    def _sign(self):
        """Pide la URL firmada a ASF (con token) siguiendo a mano las redirecciones del propio ASF."""
        destino = self.url
        for _ in range(MAX_SALTOS):
            try:
                with self._client.stream('GET', destino, headers=self._headers(destino, {'Range': 'bytes=0-0'})
                                         ) as respuesta:
                    estado, location = respuesta.status_code, respuesta.headers.get('location')
            except httpx.HTTPError:
                raise UpstreamError('No fue posible contactar a ASF para firmar la descarga. '
                                    'Reintenta en unos momentos.') from None
            if estado in (301, 302, 303, 307, 308) and location:
                siguiente = urljoin(destino, location)
                if urlparse(siguiente).scheme != 'https':
                    raise UpstreamError('ASF redirigió a una dirección que no usa https; se descartó.')
                if _es_asf(siguiente):
                    destino = siguiente            # sigue dentro de ASF: se mantiene la cabecera
                    continue
                self._signed, self._directo = siguiente, False
                return
            if estado in (401, 403):
                raise UpstreamError(MENSAJE_LOGIN)
            if estado in (200, 206):
                self._signed, self._directo = destino, True
                return
            raise UpstreamError(f'ASF respondió {estado} al firmar la descarga del producto.')
        raise UpstreamError('ASF encadenó demasiadas redirecciones al firmar la descarga.')

    def _resign(self, generacion_vista):
        """Vuelve a firmar si nadie lo hizo ya desde que este hilo vio el fallo."""
        with self._sign_lock:
            if self._generation == generacion_vista:
                self._sign()
                self._generation += 1

    def _get_range(self, start, end):
        """Bytes [start, end] (inclusive). 403 → firma de nuevo una vez; 5xx y fallos de red → reintentos."""
        resignado = False
        intento = 0
        while True:
            generacion = self._generation
            destino = self._signed
            try:
                with _descargas:
                    respuesta = self._client.get(
                        destino, headers=self._headers(destino, {'Range': f'bytes={start}-{end}'}))
            except httpx.HTTPError:
                respuesta = None
            if respuesta is not None and respuesta.status_code == 206:
                contenido = respuesta.content
                if len(contenido) != end - start + 1:
                    raise UpstreamError('ASF devolvió un fragmento incompleto del producto.')
                with self._cache_lock:
                    self.requests += 1
                    self.bytes += len(contenido)
                return contenido
            if respuesta is not None and respuesta.status_code == 403 and not resignado:
                self._resign(generacion)
                resignado = True
                continue
            if respuesta is not None and respuesta.status_code in (401, 403):
                raise UpstreamError(MENSAJE_LOGIN)
            intento += 1
            if intento >= REINTENTOS:
                if respuesta is None:
                    raise UpstreamError('Se perdió la conexión con ASF al leer el producto. Reintenta.')
                raise UpstreamError(f'ASF respondió {respuesta.status_code} al leer el producto.')
            time.sleep(0.5 * intento)

    def _read_size(self):
        """Tamaño total del archivo, de la cabecera Content-Range de una petición de un byte."""
        destino = self._signed
        try:
            with _descargas:
                respuesta = self._client.get(destino, headers=self._headers(destino, {'Range': 'bytes=0-0'}))
            return int(respuesta.headers['content-range'].split('/')[1])
        except (httpx.HTTPError, KeyError, ValueError, IndexError):
            raise UpstreamError('No fue posible medir el tamaño del producto en ASF.') from None

    # ------------------------------------------------------------ caché de bloques

    def _block_bytes(self, indice):
        with self._cache_lock:
            if indice in self._cache:
                self._cache.move_to_end(indice)
                return self._cache[indice]
        inicio = indice * self._block
        datos = self._get_range(inicio, min(inicio + self._block, self.size) - 1)
        with self._cache_lock:
            if indice not in self._cache:
                self._cache[indice] = datos
                self._cache_size += len(datos)
                while self._cache_size > self._cache_bytes and len(self._cache) > 1:
                    _, viejo = self._cache.popitem(last=False)
                    self._cache_size -= len(viejo)
        return datos

    def blocks_for(self, rangos):
        """Índices de bloque que cubren una lista de (desplazamiento, tamaño) en bytes."""
        indices = set()
        for desplazamiento, tamano in rangos:
            if tamano <= 0:
                continue
            ultimo = min(desplazamiento + tamano, self.size) - 1
            indices.update(range(desplazamiento // self._block, ultimo // self._block + 1))
        return sorted(indices)

    def prefetch(self, rangos):
        """Descarga en paralelo (hasta 4 hilos) los bloques que cubren `rangos` y que aún no están."""
        with self._cache_lock:
            faltan = [i for i in self.blocks_for(rangos) if i not in self._cache]
        if not faltan:
            return
        with ThreadPoolExecutor(max_workers=MAX_THREADS) as pool:
            list(pool.map(self._block_bytes, faltan))

    # ------------------------------------------------------------ interfaz de archivo

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else self.pos + offset if whence == 1 else self.size + offset
        return self.pos

    def readinto(self, buffer):
        n = min(len(buffer), max(0, self.size - self.pos))
        hecho = 0
        while hecho < n:
            indice, desplazamiento = divmod(self.pos, self._block)
            trozo = self._block_bytes(indice)[desplazamiento:desplazamiento + n - hecho]
            buffer[hecho:hecho + len(trozo)] = trozo
            hecho += len(trozo)
            self.pos += len(trozo)
        return hecho

    def close(self):
        if not self.closed:
            self._client.close()
            self._cache.clear()
        super().close()
