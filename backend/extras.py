"""Servicios NASA extra: eventos naturales (EONET) e imagen diaria de la Tierra (EPIC/DSCOVR).

La clave de NASA se envía solo en la cabecera X-Api-Key hacia api.nasa.gov; nunca se
guarda en URLs, mensajes de error, respuestas ni logs.
"""
import os
import re
import threading
import time

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from . import config

router = APIRouter()

EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events'
EPIC_LIST_URL = 'https://api.nasa.gov/EPIC/api/natural'
EPIC_ARCHIVE_URL = 'https://api.nasa.gov/EPIC/archive/natural'
EVENTS_TTL = 15 * 60
EPIC_TTL = 60 * 60
EPIC_DIR = config.CACHE_DIR / 'epic'

CATEGORIAS = {
    'drought': 'Sequía',
    'dustHaze': 'Polvo y bruma',
    'earthquakes': 'Sismos',
    'floods': 'Inundaciones',
    'landslides': 'Deslizamientos',
    'manmade': 'Origen humano',
    'seaLakeIce': 'Hielo marino y lacustre',
    'severeStorms': 'Tormentas severas',
    'snow': 'Nieve',
    'tempExtremes': 'Temperaturas extremas',
    'volcanoes': 'Volcanes',
    'waterColor': 'Color del agua',
    'wildfires': 'Incendios',
}

_events_cache = {}   # days -> (marca_de_tiempo, payload)
_events_lock = threading.Lock()
_epic_meta = {}      # 'meta' -> (marca_de_tiempo, dict)
_epic_lock = threading.Lock()
_epic_file_lock = threading.Lock()


class _ErrorDescarga(Exception):
    """Fallo de red o de la API remota; el mensaje nunca contiene la clave."""


# --------------------------------------------------------------------------- descargas

def _cliente():
    return httpx.Client(timeout=30, follow_redirects=True, headers={'User-Agent': config.USER_AGENT})


def _cabeceras_clave():
    return {'X-Api-Key': config.NASA_API_KEY}


def _fetch_json(url, params=None, headers=None):
    """Descarga JSON. Ante cualquier error lanza _ErrorDescarga sin exponer la URL ni la clave."""
    try:
        with _cliente() as client:
            resp = client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as exc:
        raise _ErrorDescarga(f'HTTP {exc.response.status_code}') from None
    except Exception as exc:  # red, tiempo de espera, JSON inválido...
        raise _ErrorDescarga(type(exc).__name__) from None


def _fetch_bytes(url, headers=None):
    """Descarga binaria con la misma política de errores que _fetch_json."""
    try:
        with _cliente() as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.content
    except httpx.HTTPStatusError as exc:
        raise _ErrorDescarga(f'HTTP {exc.response.status_code}') from None
    except Exception as exc:
        raise _ErrorDescarga(type(exc).__name__) from None


# --------------------------------------------------------------------------- eventos

def _punto_de_geometria(geom):
    """Devuelve (lon, lat) de un Point o del centroide simple de un Polygon; None si no sirve."""
    try:
        tipo = geom.get('type')
        coords = geom.get('coordinates')
        if tipo == 'Point':
            return float(coords[0]), float(coords[1])
        if tipo == 'Polygon':
            anillo = coords[0]
            if len(anillo) > 1 and anillo[0] == anillo[-1]:
                anillo = anillo[:-1]  # el último vértice repite al primero
            if not anillo:
                return None
            lon = sum(float(p[0]) for p in anillo) / len(anillo)
            lat = sum(float(p[1]) for p in anillo) / len(anillo)
            return lon, lat
    except (TypeError, ValueError, IndexError, AttributeError):
        pass
    return None


def _normalizar_evento(ev):
    """Convierte un evento EONET al formato del contrato; None si no tiene geometría utilizable."""
    candidatas = []
    for geom in ev.get('geometry') or []:
        punto = _punto_de_geometria(geom) if isinstance(geom, dict) else None
        if punto and geom.get('date'):
            candidatas.append((str(geom['date']), punto))
    if not candidatas:
        return None
    fecha, (lon, lat) = max(candidatas, key=lambda c: c[0])
    cats = ev.get('categories') or []
    cat_id = cats[0].get('id') if cats else None
    cat_nombre = cats[0].get('title') if cats else None
    fuentes = ev.get('sources') or []
    return {
        'id': ev.get('id'),
        'title': ev.get('title'),
        'category': cat_id,
        'category_label': CATEGORIAS.get(cat_id, cat_nombre or cat_id),
        'date': fecha,
        'lon': lon,
        'lat': lat,
        'closed': bool(ev.get('closed')),
        'link': ev.get('link'),
        'source_url': (fuentes[0].get('url') if fuentes else None),
    }


def _normalizar_eventos(datos):
    eventos = [e for e in (_normalizar_evento(x) for x in datos.get('events') or []) if e]
    eventos.sort(key=lambda e: e['date'], reverse=True)
    return {'events': eventos, 'source': 'NASA EONET v3'}


@router.get('/api/events')
def events(days: int = Query(30, ge=1, le=120)):
    """Eventos naturales recientes de EONET, con caché de 15 minutos por valor de days."""
    with _events_lock:
        entrada = _events_cache.get(days)
        if entrada and time.time() - entrada[0] < EVENTS_TTL:
            return entrada[1]
        try:
            crudo = _fetch_json(EONET_URL, {'status': 'all', 'days': days})
            payload = _normalizar_eventos(crudo)
        except _ErrorDescarga:
            if entrada:
                return {**entrada[1], 'stale': True}
            raise HTTPException(502, 'No se pudo consultar EONET y no hay copia en caché. '
                                     'Inténtalo de nuevo en unos minutos.') from None
        _events_cache[days] = (time.time(), payload)
        return payload


# --------------------------------------------------------------------------- EPIC

def _meta_epic():
    """Metadatos de la imagen EPIC más reciente (caché de 1 hora)."""
    if not config.NASA_API_KEY:
        raise HTTPException(503, 'Falta NASA_API_KEY en .env')
    with _epic_lock:
        entrada = _epic_meta.get('meta')
        if entrada and time.time() - entrada[0] < EPIC_TTL:
            return entrada[1]
        try:
            lista = _fetch_json(EPIC_LIST_URL, None, _cabeceras_clave())
            primero = lista[0]
            fecha_hora = str(primero['date'])
            nombre = str(primero['image'])
            # El nombre termina en una ruta de archivo: solo se aceptan caracteres seguros.
            if not re.fullmatch(r'[A-Za-z0-9_]+', nombre) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', fecha_hora[:10]):
                raise ValueError('respuesta EPIC inesperada')
        except (_ErrorDescarga, KeyError, IndexError, TypeError, ValueError):
            raise HTTPException(502, 'No se pudo consultar la API EPIC de NASA.') from None
        dia = fecha_hora[:10]
        meta = {'date': dia, 'image_name': nombre, 'caption': primero.get('caption') or ''}
        _epic_meta['meta'] = (time.time(), meta)
        return meta


@router.get('/api/earth-today')
def earth_today():
    """Metadatos de la imagen diaria de la Tierra (EPIC / DSCOVR)."""
    meta = _meta_epic()
    return {'date': meta['date'], 'caption': meta['caption'],
            'image': '/api/earth-today/image', 'source': 'NASA EPIC / DSCOVR'}


@router.get('/api/earth-today/image')
def earth_today_image():
    """Sirve el JPEG de EPIC, descargándolo una sola vez a data/cache/epic."""
    meta = _meta_epic()
    destino = EPIC_DIR / f"{meta['image_name']}.jpg"
    with _epic_file_lock:
        if not destino.exists():
            anio, mes, dia = meta['date'].split('-')
            url = f"{EPIC_ARCHIVE_URL}/{anio}/{mes}/{dia}/jpg/{meta['image_name']}.jpg"
            try:
                datos = _fetch_bytes(url, _cabeceras_clave())
            except _ErrorDescarga:
                raise HTTPException(502, 'No se pudo descargar la imagen de EPIC.') from None
            EPIC_DIR.mkdir(parents=True, exist_ok=True)
            tmp = destino.with_name(f'{destino.name}.{os.getpid()}.{threading.get_ident()}.tmp')
            tmp.write_bytes(datos)
            os.replace(tmp, destino)  # escritura atómica
    return FileResponse(destino, media_type='image/jpeg',
                        headers={'Cache-Control': 'public, max-age=3600'})
