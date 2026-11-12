"""Geometría pura: cajas, ventanas de píxeles, KML, ajuste por huella y área por fila. Sin red."""
import math
import re
from functools import lru_cache

import numpy as np
from pyproj import Transformer

from .errors import InvalidInput

KM_POR_GRADO_LON = 111.320
KM_POR_GRADO_LAT = 110.574


def polygon_bbox(footprint):
    """(oeste, sur, este, norte) de un Polygon GeoJSON."""
    puntos = footprint['coordinates'][0]
    lons = [p[0] for p in puntos]
    lats = [p[1] for p in puntos]
    return min(lons), min(lats), max(lons), max(lats)


def polygon_center(footprint):
    w, s, e, n = polygon_bbox(footprint)
    return [round((w + e) / 2, 4), round((s + n) / 2, 4)]


def corner_coordinates(bounds):
    """Esquinas en el orden de una fuente `image` de MapLibre: NO, NE, SE, SO."""
    w, s, e, n = bounds
    return [[w, n], [e, n], [e, s], [w, s]]


def parse_aoi(text):
    """Convierte 'w,s,e,n' en una tupla validada; si no es válido lanza InvalidInput."""
    mensaje = 'El área (aoi) debe ser «oeste,sur,este,norte» con oeste < este y sur < norte.'
    try:
        w, s, e, n = [float(x) for x in text.split(',')]
    except (ValueError, AttributeError):
        raise InvalidInput(mensaje) from None
    if not all(math.isfinite(x) for x in (w, s, e, n)):
        raise InvalidInput(mensaje)
    if not (-180 <= w < e <= 180 and -90 <= s < n <= 90):
        raise InvalidInput(mensaje)
    return w, s, e, n


def pixel_window(aoi, bbox, shape):
    """Intersecta el aoi con el cuadro y lo ajusta a la cuadrícula: (col0, fila0, col1, fila1).

    `shape` es (alto, ancho) del cuadro completo. Intersección vacía → InvalidInput.
    """
    alto, ancho = shape
    w, s, e, n = bbox
    res_lon, res_lat = (e - w) / ancho, (n - s) / alto
    aw, as_, ae, an = aoi
    col0 = max(0, math.floor((aw - w) / res_lon + 1e-9))
    col1 = min(ancho, math.ceil((ae - w) / res_lon - 1e-9))
    fila0 = max(0, math.floor((n - an) / res_lat + 1e-9))
    fila1 = min(alto, math.ceil((n - as_) / res_lat - 1e-9))
    if col1 <= col0 or fila1 <= fila0:
        raise InvalidInput('El área (aoi) no se cruza con el cuadro de esta pila.')
    return col0, fila0, col1, fila1


def window_bounds(bbox, shape, window):
    """Límites geográficos (w, s, e, n) de una ventana de píxeles."""
    alto, ancho = shape
    w, s, e, n = bbox
    res_lon, res_lat = (e - w) / ancho, (n - s) / alto
    col0, fila0, col1, fila1 = window
    return (w + col0 * res_lon, n - fila1 * res_lat, w + col1 * res_lon, n - fila0 * res_lat)


def point_to_pixel(lon, lat, bbox, shape):
    """(columna, fila) del píxel que contiene el punto, o None si cae fuera del cuadro."""
    alto, ancho = shape
    w, s, e, n = bbox
    if not (w <= lon < e and s < lat <= n):
        return None
    col = min(ancho - 1, int((lon - w) / (e - w) * ancho))
    fila = min(alto - 1, int((n - lat) / (n - s) * alto))
    return col, fila


def row_area_km2(bounds, size):
    """Área en km² de un píxel en cada fila de una ventana. `size` = (alto, ancho)."""
    alto, ancho = size
    w, s, e, n = bounds
    res_lon, res_lat = (e - w) / ancho, (n - s) / alto
    lat = n - (np.arange(alto) + 0.5) * res_lat
    return (res_lon * KM_POR_GRADO_LON * np.cos(np.radians(lat))) * (res_lat * KM_POR_GRADO_LAT)


def parse_kml(text):
    """Caja (w, s, e, n) del LatLonQuad de un KML de ASF; ValueError si no se puede leer."""
    coincidencia = re.search(r'<coordinates>([^<]+)</coordinates>', text or '')
    if not coincidencia:
        raise ValueError('El KML no contiene coordenadas.')
    puntos = []
    for trozo in coincidencia.group(1).split():
        partes = trozo.split(',')
        puntos.append((float(partes[0]), float(partes[1])))
    if len(puntos) < 4:
        raise ValueError('El KML debe traer las cuatro esquinas.')
    lons, lats = [p[0] for p in puntos], [p[1] for p in puntos]
    return min(lons), min(lats), max(lons), max(lats)


def valid_box(valid, min_count=3):
    """Caja de píxeles válidos (col0, fila0, col1, fila1): columnas/filas con ≥ min_count válidos."""
    columnas = np.flatnonzero(valid.sum(axis=0) >= min_count)
    filas = np.flatnonzero(valid.sum(axis=1) >= min_count)
    if columnas.size == 0 or filas.size == 0:
        raise InvalidInput('La imagen no tiene suficientes píxeles con dato para georreferenciarla.')
    return int(columnas[0]), int(filas[0]), int(columnas[-1]) + 1, int(filas[-1]) + 1


def fit_footprint(valid, footprint_bbox):
    """Georreferencia por huella: caja de píxeles válidos ↔ caja de la huella CMR.

    Devuelve (w, s, e, n) de la imagen completa. Error medido frente al KML: 0,3–2,9 px.
    """
    alto, ancho = valid.shape
    c0, r0, c1, r1 = valid_box(valid)
    fw, fs, fe, fn = footprint_bbox
    paso_x, paso_y = (fe - fw) / (c1 - c0), (fn - fs) / (r1 - r0)
    oeste = fw - c0 * paso_x
    norte = fn + r0 * paso_y
    return oeste, norte - alto * paso_y, oeste + ancho * paso_x, norte


# ---------------------------------------------------------------- proyecciones (lupa calibrada)

@lru_cache(maxsize=16)
def transformer(epsg, hacia_lonlat):
    """Transformador pyproj entre lon/lat (EPSG:4326) y el EPSG del producto, siempre en orden x, y."""
    origen, destino = (epsg, 4326) if hacia_lonlat else (4326, epsg)
    return Transformer.from_crs(origen, destino, always_xy=True)


def grid_locator(grid):
    """Función (lon, lat, forma) → (columna, fila) o None para una ventana en la proyección del producto.

    `grid` = {'epsg', 'x0', 'y0', 'dx', 'dy'}: esquina superior izquierda de la ventana y tamaño de
    píxel con signo, en metros de la proyección.
    """
    hacia_proyeccion = transformer(int(grid['epsg']), False)

    def locate(lon, lat, shape):
        x, y = hacia_proyeccion.transform(lon, lat)
        col = math.floor((x - grid['x0']) / grid['dx'])
        fila = math.floor((y - grid['y0']) / grid['dy'])
        if not (0 <= col < shape[1] and 0 <= fila < shape[0]):
            return None
        return col, fila

    return locate
