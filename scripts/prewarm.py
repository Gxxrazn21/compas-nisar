"""Deja listas las historias para la demo: descarga las imágenes y calcula cambio y serie de cada una.

Uso: python -X utf8 scripts/prewarm.py
Conviene correrlo una vez antes de presentar; después las historias abren al instante.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from backend import config  # noqa: E402
from backend.main import app  # noqa: E402


def main():
    client = TestClient(app)
    stories = json.loads(config.STORIES_FILE.read_text(encoding='utf-8'))['stories']
    failures = 0
    for story in stories:
        title = story['title']['es']
        if story.get('kind', 'change') == 'interferogram':
            lon, lat = story['point']
            started = time.time()
            response = client.get('/api/interferograms', params={'lon': lon, 'lat': lat, 'limit': story.get('limit', 4)})
            count = len(response.json().get('items', [])) if response.status_code == 200 else 0
            print(f'{title}: {count} interferogramas en {time.time() - started:.1f} s (HTTP {response.status_code})')
            failures += response.status_code != 200
            continue

        aoi = ','.join(str(value) for value in story['aoi'])
        started = time.time()
        response = client.get('/api/change', params={
            'stack': story['stack'], 'before': story['before'], 'after': story['after'], 'aoi': aoi})
        if response.status_code != 200:
            print(f'{title}: el cambio falló (HTTP {response.status_code}): {response.json().get("detail")}')
            failures += 1
            continue
        stats = response.json()['stats']
        print(f'{title}: cambio en {time.time() - started:.1f} s; confianza {stats["confidence"]["level"]}, '
              f'{stats["changed_km2"]} km² de {stats["valid_km2"]} km²')

        west, south, east, north = story['aoi']
        started = time.time()
        response = client.get('/api/series', params={
            'stack': story['stack'], 'lon': (west + east) / 2, 'lat': (south + north) / 2, 'max': 12, 'aoi': aoi})
        if response.status_code != 200:
            print(f'{title}: la serie falló (HTTP {response.status_code}): {response.json().get("detail")}')
            failures += 1
            continue
        print(f'{title}: serie de {len(response.json()["frames"])} cuadros en {time.time() - started:.1f} s')

        lens = story.get('lupa')
        if lens and config.EARTHDATA_TOKEN:
            started = time.time()
            response = client.get('/api/zoom', params={
                'stack': story['stack'], 'before': story['before'], 'after': story['after'],
                'lon': lens['lon'], 'lat': lens['lat'], 'size_km': lens['size_km']})
            if response.status_code != 200:
                print(f'{title}: la lupa calibrada falló (HTTP {response.status_code}): '
                      f'{response.json().get("detail")}')
                failures += 1
            else:
                print(f'{title}: lupa calibrada en {time.time() - started:.1f} s')
    print('Listo.' if not failures else f'Terminó con {failures} fallo(s).')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
