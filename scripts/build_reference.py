"""Genera public/ref/*.json: fronteras, divisiones internas y nombres para el mapa.

Fuente: Natural Earth (dominio público), https://www.naturalearthdata.com/, tomada del
repositorio nvkelso/natural-earth-vector. Los archivos resultantes van dentro del proyecto para
que el mapa los cargue al instante y sin depender de un servicio de teselas.

Uso:  python -X utf8 scripts/build_reference.py [carpeta_de_descarga]
La carpeta de descarga (por omisión, una temporal) guarda los GeoJSON originales, unos 40 MB.
"""
import json
import sys
import tempfile
import urllib.request
from pathlib import Path

from shapely.geometry import shape

BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson'
FILES = [
    'ne_10m_admin_0_boundary_lines_land',
    'ne_10m_admin_0_boundary_lines_disputed_areas',
    'ne_10m_admin_1_states_provinces_lines',
    'ne_50m_admin_0_countries',
    'ne_10m_admin_1_label_points_details',
    'ne_50m_populated_places_simple',
]
OUT = Path(__file__).resolve().parent.parent / 'public' / 'ref'
DECIMALS = 3                  # unos 110 m: de sobra hasta el zoom de la lupa
BORDER_TOLERANCE = 0.002      # grados
DIVISION_TOLERANCE = 0.006
# MapLibre usa teselas de 512 px: su zoom es uno menos que el de los mapas web de 256 px,
# que es la escala en la que Natural Earth expresa min_label y min_zoom.
ZOOM_OFFSET = 1


def number(value, default):
    """Número del campo, o `default` si falta (0 es un valor válido, no una ausencia)."""
    return default if value is None else float(value)


def load(folder, name):
    path = folder / f'{name}.geojson'
    if not path.exists():
        print(f'descargando {name}…')
        urllib.request.urlretrieve(f'{BASE}/{name}.geojson', path)
    return json.loads(path.read_text(encoding='utf-8'))['features']


def lines(geometry, tolerance):
    """Listas de coordenadas [lon, lat] simplificadas y redondeadas de una geometría lineal."""
    simple = shape(geometry).simplify(tolerance, preserve_topology=False)
    parts = getattr(simple, 'geoms', [simple])
    result = []
    for part in parts:
        coords = [[round(x, DECIMALS), round(y, DECIMALS)] for x, y, *_ in part.coords]
        limpio = [p for i, p in enumerate(coords) if i == 0 or p != coords[i - 1]]
        if len(limpio) >= 2:
            result.append(limpio)
    return result


def line_feature(parts, properties):
    return {'type': 'Feature', 'properties': properties,
            'geometry': {'type': 'MultiLineString', 'coordinates': parts}}


def point_feature(lon, lat, properties):
    return {'type': 'Feature', 'properties': properties,
            'geometry': {'type': 'Point', 'coordinates': [round(lon, DECIMALS), round(lat, DECIMALS)]}}


def write(name, features):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    path.write_text(json.dumps({'type': 'FeatureCollection', 'features': features},
                               ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{name}: {len(features)} entidades, {path.stat().st_size / 1024:.0f} KB')


def borders(folder):
    """Fronteras internacionales: `k` = 'p' (reconocida) o 'x' (en disputa o indefinida)."""
    features = []
    for item in load(folder, 'ne_10m_admin_0_boundary_lines_land'):
        if not item['geometry']:
            continue
        firme = item['properties']['FEATURECLA'].startswith('International boundary')
        parts = lines(item['geometry'], BORDER_TOLERANCE)
        if parts:
            features.append(line_feature(parts, {'k': 'p' if firme else 'x'}))
    for item in load(folder, 'ne_10m_admin_0_boundary_lines_disputed_areas'):
        if not item['geometry']:
            continue
        parts = lines(item['geometry'], BORDER_TOLERANCE)
        if parts:
            features.append(line_feature(parts, {'k': 'x'}))
    return features


def divisions(folder):
    """Límites de departamentos, estados y provincias; `z` = zoom desde el que se dibujan."""
    features = []
    for item in load(folder, 'ne_10m_admin_1_states_provinces_lines'):
        props = item['properties']
        if not item['geometry'] or props['FEATURECLA'] != 'Admin-1 boundary':
            continue
        parts = lines(item['geometry'], DIVISION_TOLERANCE)
        if parts:
            zoom = max(2, round(number(props.get('MIN_ZOOM'), 6) - ZOOM_OFFSET - 1))
            features.append(line_feature(parts, {'z': min(zoom, 5)}))
    return features


def names(folder):
    """Puntos con nombre: `k` = 'p' país, 'd' división, 'c' ciudad; `z` = zoom mínimo; `r` = prioridad."""
    features = []
    for item in load(folder, 'ne_50m_admin_0_countries'):
        p = item['properties']
        if p.get('LABEL_X') is None or p.get('LABEL_Y') is None:
            continue
        rank = int(p['LABELRANK'])
        # Los países grandes se rotulan desde el globo; los pequeños, al acercarse.
        zoom = {1: 0, 2: 0, 3: 2, 4: 3, 5: 4}.get(rank, 5)
        features.append(point_feature(p['LABEL_X'], p['LABEL_Y'], {
            'k': 'p', 'es': p.get('NAME_ES') or p['NAME'], 'en': p.get('NAME_EN') or p['NAME'],
            'z': zoom, 'r': rank}))
    for item in load(folder, 'ne_10m_admin_1_label_points_details'):
        p = item['properties']
        nombre = p.get('name')
        if not nombre or p.get('latitude') is None or p.get('longitude') is None:
            continue
        zoom = max(3, round(number(p.get('min_label'), 8) - ZOOM_OFFSET, 1))
        if zoom > 8:
            continue
        features.append(point_feature(p['longitude'], p['latitude'], {
            'k': 'd', 'es': p.get('name_es') or nombre, 'en': p.get('name_en') or nombre,
            'z': zoom, 'r': int(number(p.get('labelrank'), 9))}))
    for item in load(folder, 'ne_50m_populated_places_simple'):
        p = item['properties']
        if not p.get('name'):
            continue
        capital = int(p.get('adm0cap') or 0) == 1
        zoom = max(3 if capital else 4, round(number(p.get('min_zoom'), 6) - ZOOM_OFFSET, 1))
        features.append(point_feature(p['longitude'], p['latitude'], {
            'k': 'c', 'es': p['name'], 'en': p['name'], 'z': zoom,
            'r': int(number(p.get('scalerank'), 9)) - (2 if capital else 0)}))
    return features


def main():
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.mkdtemp(prefix='natural-earth-'))
    folder.mkdir(parents=True, exist_ok=True)
    write('fronteras.json', borders(folder))
    write('divisiones.json', divisions(folder))
    write('nombres.json', names(folder))


if __name__ == '__main__':
    main()
