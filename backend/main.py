"""Aplicación FastAPI del Observatorio NISAR. Contrato: docs/contrato-api.md.

Los endpoints son síncronos (`def`): FastAPI los ejecuta en un pool de hilos, y las descargas
usan httpx.Client con un tope global de 4 simultáneas.
"""
import json
import math
from datetime import date

from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import browse, catalog, change, config, geo, i18n, series, zoom
from .errors import ApiError, InvalidInput, NotFound
from .extras import router as extras_router
from .demo import router as demo_router
from .places import router as places_router

VERSION = '0.2.0'

app = FastAPI(title='Observatorio NISAR', version=VERSION)


def _error(request: Request, status: int, detail, headers=None):
    """Respuesta de error en el idioma de la petición (inglés si no pide español)."""
    idioma = i18n.request_lang(request.headers.get('accept-language'))
    return JSONResponse(status_code=status, content={'detail': i18n.translate(detail, idioma)}, headers=headers)


@app.exception_handler(ApiError)
def _api_error(request: Request, error: ApiError):
    return _error(request, error.status, error.detail)


@app.exception_handler(StarletteHTTPException)
def _http_error(request: Request, error: StarletteHTTPException):
    return _error(request, error.status_code, error.detail, getattr(error, 'headers', None))


@app.exception_handler(RequestValidationError)
def _validation_error(request: Request, error: RequestValidationError):
    campos = sorted({str(e['loc'][-1]) for e in error.errors() if e.get('loc')})
    return _error(request, 422, 'Parámetros ausentes o inválidos: ' + (', '.join(campos) or 'consulta') + '.')


# ---------------------------------------------------------------- validaciones de entrada

def _lonlat(lon, lat):
    if not (math.isfinite(lon) and math.isfinite(lat) and -180 <= lon <= 180 and -90 <= lat <= 90):
        raise InvalidInput('Coordenadas fuera de rango: lon entre -180 y 180, lat entre -90 y 90.')
    return lon, lat


def _fecha(texto, nombre):
    try:
        return date.fromisoformat(texto).isoformat()
    except (ValueError, TypeError):
        raise InvalidInput(f'La fecha «{nombre}» debe tener el formato AAAA-MM-DD.') from None


def _escena(pila, fecha):
    for escena in pila['scenes']:
        if escena['date'] == fecha:
            return escena
    raise NotFound(f'La pila {pila["id"]} no tiene una escena del {fecha} '
                   f'(disponibles entre {pila["first"]} y {pila["last"]}).')


# ---------------------------------------------------------------- endpoints

@app.get('/api/health')
def health():
    return {'status': 'ok', 'version': VERSION, 'nasa_key': bool(config.NASA_API_KEY),
            'earthdata': bool(config.EARTHDATA_TOKEN)}


@app.get('/api/stacks')
def stacks(lon: float, lat: float):
    lon, lat = _lonlat(lon, lat)
    return {'point': [lon, lat], 'stacks': [catalog.stack_public(p) for p in catalog.stacks_at_point(lon, lat)]}


@app.get('/api/stack/{stack_id}')
def stack(stack_id: str):
    return catalog.stack_public(catalog.get_stack(stack_id))


@app.get('/api/change')
def change_endpoint(stack: str, before: str, after: str, aoi: str | None = None):
    antes, despues = _fecha(before, 'before'), _fecha(after, 'after')
    if not antes < despues:
        raise InvalidInput('La fecha «before» debe ser anterior a «after».')
    area = geo.parse_aoi(aoi) if aoi else None
    pila = catalog.get_stack(stack)
    return change.compute_change(pila, _escena(pila, antes), _escena(pila, despues), area)


@app.get('/api/zoom')
def zoom_endpoint(stack: str, before: str, after: str, lon: float, lat: float, size_km: float = 15.0):
    lon, lat = _lonlat(lon, lat)
    if not (math.isfinite(size_km) and 5 <= size_km <= 30):
        raise InvalidInput('El parámetro «size_km» debe estar entre 5 y 30.')
    antes, despues = _fecha(before, 'before'), _fecha(after, 'after')
    if not antes < despues:
        raise InvalidInput('La fecha «before» debe ser anterior a «after».')
    pila = catalog.get_stack(stack)
    return zoom.compute_zoom(pila, _escena(pila, antes), _escena(pila, despues), lon, lat, size_km)


@app.get('/api/probe')
def probe(change_id: str = Query(alias='change'), lon: float = 0.0, lat: float = 0.0):
    lon, lat = _lonlat(lon, lat)
    return change.probe(change_id, lon, lat)


@app.get('/api/series')
def series_endpoint(stack: str, lon: float, lat: float, max: int = 12, radius: int = 4,
                    aoi: str | None = None):
    lon, lat = _lonlat(lon, lat)
    if not 2 <= max <= 60:
        raise InvalidInput('El parámetro «max» debe estar entre 2 y 60.')
    if not 0 <= radius <= 50:
        raise InvalidInput('El parámetro «radius» debe estar entre 0 y 50.')
    area = geo.parse_aoi(aoi) if aoi else None
    return series.build_series(catalog.get_stack(stack), lon, lat, max, radius, area)


@app.get('/api/image')
def image(url: str, w: int = 1024):
    browse.validate_browse_url(url)
    if not 64 <= w <= 2048:
        raise InvalidInput('El ancho «w» debe estar entre 64 y 2048.')
    return FileResponse(browse.image_file(url, w), media_type='image/png',
                        headers={'Cache-Control': 'public, max-age=86400'})


@app.get('/api/urgent')
def urgent(limit: int = 30):
    if not 1 <= limit <= 100:
        raise InvalidInput('El parámetro «limit» debe estar entre 1 y 100.')
    return {'scenes': catalog.urgent_scenes(limit)}


@app.get('/api/interferograms')
def interferograms(lon: float, lat: float, limit: int = 8):
    lon, lat = _lonlat(lon, lat)
    if not 1 <= limit <= 20:
        raise InvalidInput('El parámetro «limit» debe estar entre 1 y 20.')
    return {'items': catalog.interferograms_at_point(lon, lat, limit)}


@app.get('/api/stories')
def stories():
    if not config.STORIES_FILE.exists():
        return {'stories': []}
    try:
        contenido = json.loads(config.STORIES_FILE.read_text(encoding='utf-8'))
    except (OSError, ValueError) as error:
        raise ApiError('data/stories.json no se pudo leer como JSON válido.') from error
    return contenido if isinstance(contenido, dict) else {'stories': contenido}


# Eventos naturales (EONET) e imagen diaria de la Tierra (EPIC).
app.include_router(extras_router)
# Buscador de lugares por nombre o dirección (OpenStreetMap Nominatim).
app.include_router(places_router)
app.include_router(demo_router)

# Estáticos: /derived siempre; el frontend compilado, si existe, va al final (captura todo lo demás).
CACHE_INMUTABLE = 'public, max-age=31536000, immutable'


class InmutableFiles(StaticFiles):
    """Archivos cuyo nombre o carpeta es un hash del contenido: el navegador puede guardarlos un año."""

    def file_response(self, *args, **kwargs):
        respuesta = super().file_response(*args, **kwargs)
        respuesta.headers['Cache-Control'] = CACHE_INMUTABLE
        return respuesta


class FrontendFiles(StaticFiles):
    """Frontend compilado: /assets/* lleva hash en el nombre (inmutable); el resto, p. ej. index.html, se revalida."""

    async def get_response(self, path, scope):
        respuesta = await super().get_response(path, scope)
        if respuesta.status_code == 200:
            inmutable = path.replace('\\', '/').startswith('assets/')
            respuesta.headers['Cache-Control'] = CACHE_INMUTABLE if inmutable else 'no-cache'
        return respuesta


app.mount('/derived', InmutableFiles(directory=config.DERIVED_DIR), name='derived')
_dist = config.ROOT / 'dist'
if _dist.exists():
    app.mount('/', FrontendFiles(directory=_dist, html=True), name='frontend')
