"""Paquete explícito La Mojana: archivos persistentes verificados, sin acceso a upstream."""
import copy
import hashlib
import json
import math
import os
import shutil
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit

import numpy as np
from fastapi import APIRouter, Query
from fastapi.responses import FileResponse

from . import change, config, geo, series, zoom
from .errors import InvalidInput, NotFound, ServiceUnavailable

router = APIRouter()
PACKAGE_DIR = config.DATA_DIR / 'demo' / 'mojana'
SCHEMA_VERSION = 1
PREFIX = '/demo-data/mojana/'
_lock = threading.RLock()


def method_versions():
    return {'change': change.METHOD_VERSION, 'zoom': f'gcov-{zoom.METHOD_VERSION}',
            'render': change.RENDER_VERSION, 'series': series.SERIES_VERSION}


def _path(root, relative):
    """Nombres POSIX estrictos; ni traversal, rutas Windows ni enlaces fuera del paquete."""
    if not isinstance(relative, str) or not relative or '\\' in relative or ':' in relative or '%' in relative:
        raise ValueError('Ruta de archivo inválida.')
    parts = PurePosixPath(relative).parts
    if relative.startswith('/') or any(part in ('..', '.') for part in parts):
        raise ValueError('Ruta fuera del paquete.')
    result = (Path(root) / relative).resolve()
    if not result.is_relative_to(Path(root).resolve()):
        raise ValueError('Ruta fuera del paquete.')
    return result


def _digest(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return {'sha256': digest.hexdigest(), 'bytes': path.stat().st_size}


def _clean(value):
    """El paquete no conserva credenciales, URLs firmadas ni imágenes que llamen a la API live."""
    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            lowered = key.lower()
            if any(word in lowered for word in ('token', 'password', 'authorization', 'secret')):
                continue
            if lowered in ('download_url', 'browse_url', 'thumbnail_url'):
                continue
            result[key] = None if key == 'thumbnail' else _clean(item)
        return result
    if isinstance(value, list):
        return [_clean(item) for item in value]
    if isinstance(value, str):
        parsed = urlsplit(value)
        if value.startswith('/api/') or (parsed.scheme in ('http', 'https') and
                                         (parsed.query or parsed.username or parsed.fragment)):
            return None
    return value


def _validate_payload(payload, manifest):
    for section in ('story', 'stack', 'change', 'zoom', 'series'):
        if not isinstance(payload.get(section), dict):
            raise ValueError(f'Falta la sección {section}.')
    if payload['story']['id'] != 'mojana' or payload['zoom']['source'] != 'gcov':
        raise ValueError('La demo requiere La Mojana y un producto GCOV calibrado.')
    if payload['prepared_at'] != manifest['prepared_at']:
        raise ValueError('Fecha de preparación inconsistente.')
    for section in ('change', 'zoom'):
        result = payload[section]
        if result['method']['version'] != manifest['methods'][section]:
            raise ValueError('Método incompatible.')
        for side in ('before', 'after'):
            if result[side]['date'] != payload['story'][side]:
                raise ValueError('Fechas de escena inconsistentes.')
        if result['stack'] != payload['stack']['id']:
            raise ValueError('Pila inconsistente.')
        if not result['layers'] or not any(result['layers'].values()):
            raise ValueError('Faltan capas.')
        array_path = manifest['probes'][result['id']]
        if array_path not in manifest['files']:
            raise ValueError('Faltan datos de sonda.')
    if not payload['series'].get('frames') or not payload['series'].get('series'):
        raise ValueError('Falta la serie temporal.')
    if payload['series'].get('method', {}).get('version') != manifest['methods']['series']:
        raise ValueError('Método de serie incompatible.')
    urls = [u for name in ('change', 'zoom') for u in payload[name]['layers'].values() if u]
    urls += [frame['url'] for frame in payload['series']['frames']]
    for url in urls:
        if not url.startswith(PREFIX) or url[len(PREFIX):] not in manifest['files']:
            raise ValueError('Capa ausente o externa.')


def read_package(root=None):
    """Verifica esquema, versiones, inventario y hashes antes de entregar datos."""
    root = Path(root) if root is not None else PACKAGE_DIR
    if not root.exists():
        raise NotFound('La demo La Mojana aún no está preparada. Ejecuta scripts/prepare_demo.py.')
    try:
        manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
        if manifest['schema_version'] != SCHEMA_VERSION or manifest['methods'] != method_versions():
            raise ValueError('Versiones incompatibles; vuelve a preparar la demo.')
        files = manifest['files']
        if 'payload.json' not in files:
            raise ValueError('Falta payload.json.')
        for name, record in files.items():
            if _digest(_path(root, name)) != record:
                raise ValueError('Un archivo no coincide con su SHA-256.')
        payload = json.loads((root / 'payload.json').read_text(encoding='utf-8'))
        _validate_payload(payload, manifest)
        if _clean(payload) != payload or _clean(manifest) != manifest:
            raise ValueError('El paquete contiene datos no públicos.')
        return {**payload, 'manifest': manifest}
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        raise ServiceUnavailable('La demo La Mojana está incompleta, corrupta o usa una versión incompatible. '
                                 'Ejecuta scripts/prepare_demo.py para regenerarla.') from error


def write_package(payload, destination=None, derived=None):
    """Copia únicamente capas, cuadros y arrays referenciados, y publica tras verificar todo."""
    destination = Path(destination) if destination is not None else PACKAGE_DIR
    derived = Path(derived) if derived is not None else config.DERIVED_DIR
    destination = destination.resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='.mojana-', dir=destination.parent)).resolve()
    backup = destination.with_name(f'.mojana-backup-{uuid.uuid4().hex}')
    try:
        data = _clean(copy.deepcopy(payload))
        data['prepared_at'] = datetime.now(timezone.utc).isoformat()
        files, probes = {}, {}

        def copy_asset(relative):
            source = _path(derived, relative)
            local = 'assets/' + relative
            target = _path(staging, local)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            files[local] = _digest(target)
            return local

        def local_url(url):
            if not isinstance(url, str) or not url.startswith('/derived/'):
                raise ValueError('La demo requiere un archivo derivado local.')
            return PREFIX + copy_asset(url[len('/derived/'):])

        for name in ('change', 'zoom'):
            result = data[name]
            for layer, url in result['layers'].items():
                if url:
                    result['layers'][layer] = local_url(url)
            change._valid_id(result['id'])
            probes[result['id']] = copy_asset(result['id'] + '/arrays.npz')
        for frame in data['series']['frames']:
            frame['url'] = local_url(frame['url'])
        (staging / 'payload.json').write_text(json.dumps(data, ensure_ascii=False, allow_nan=False), encoding='utf-8')
        files['payload.json'] = _digest(staging / 'payload.json')
        manifest = {
            'schema_version': SCHEMA_VERSION, 'prepared_at': data['prepared_at'],
            'methods': method_versions(), 'files': files, 'probes': probes,
            'products': [{key: scene.get(key) for key in ('id', 'granule', 'date', 'collection', 'quality')}
                         for scene in (data['zoom']['before'], data['zoom']['after'])],
        }
        (staging / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
        read_package(staging)
        with _lock:
            if destination.exists():
                os.replace(destination, backup)
            try:
                os.replace(staging, destination)
            except OSError:
                if backup.exists():
                    os.replace(backup, destination)
                raise
        return read_package(destination)
    finally:
        # Solo directorios temporales propios, hermanos del destino verificado.
        for temporary in (staging, backup):
            if temporary.parent == destination.parent and temporary.name.startswith('.mojana-') and temporary.exists():
                shutil.rmtree(temporary)


@router.get('/api/demo/mojana')
def mojana():
    with _lock:
        return read_package()


@router.get('/demo-data/mojana/{asset:path}')
def asset_file(asset: str):
    if not asset.startswith('assets/') or not asset.endswith('.webp'):
        raise NotFound('Archivo no incluido en la demo.')
    try:
        path = _path(PACKAGE_DIR, asset)
    except ValueError:
        raise NotFound('Archivo no incluido en la demo.') from None
    with _lock:
        package = read_package()
        if asset not in package['manifest']['files']:
            raise NotFound('Archivo no incluido en la demo.')
        return FileResponse(path, media_type='image/webp', headers={'Cache-Control': 'no-cache'})


@router.get('/api/demo/mojana/probe')
def probe(change_id: str = Query(alias='change'), lon: float = 0, lat: float = 0):
    if not (math.isfinite(lon) and math.isfinite(lat) and -180 <= lon <= 180 and -90 <= lat <= 90):
        raise InvalidInput('Coordenadas fuera de rango.')
    with _lock:
        package = read_package()
        result = next((package[key] for key in ('change', 'zoom') if package[key]['id'] == change_id), None)
        if result is None:
            raise NotFound('Ese cambio no está incluido en la demo.')
        path = _path(PACKAGE_DIR, package['manifest']['probes'][change_id])
        try:
            with np.load(path, allow_pickle=False) as stored:
                arrays = {key: stored[key] for key in stored.files}
            locate = geo.grid_locator(result['grid']) if 'grid' in result else None
            return change.probe_arrays(arrays, result['bounds'], lon, lat, locate)
        except (OSError, ValueError, KeyError, IndexError) as error:
            raise ServiceUnavailable('Los datos de sonda de la demo no son válidos.') from error
