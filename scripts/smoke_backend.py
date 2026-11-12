"""Prueba de humo del backend contra los servicios reales (CMR y ASF). Requiere red.

Uso: python -X utf8 scripts/smoke_backend.py
"""
import json
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

from fastapi.testclient import TestClient  # noqa: E402

from backend import config  # noqa: E402
from backend.main import app  # noqa: E402

cliente = TestClient(app)
PILA, ANTES, DESPUES = '011_D_084', '2026-06-26', '2026-10-24'
AOI = '-75.2,8.3,-74.2,9.4'
PUNTO = (-74.6, 8.9)


def pedir(ruta, **params):
    inicio = time.perf_counter()
    respuesta = cliente.get(ruta, params=params)
    segundos = time.perf_counter() - inicio
    if respuesta.status_code != 200:
        print(f'  ERROR {respuesta.status_code} en {ruta}: {respuesta.text[:300]}')
        sys.exit(1)
    return respuesta.json(), segundos


def resumen_cambio(titulo, cambio, segundos):
    s = cambio['stats']
    print(f'\n{titulo}: {segundos:.1f} s  id={cambio["id"]}  georef={cambio["georef"]}  '
          f'tamaño={cambio["size"]}  dual={cambio["dual_pol"]}')
    print(f'  correlación={s["correlation"]}  válido={s["valid_km2"]} km²  '
          f'cambiado={s["changed_km2"]} km² ({s["changed_pct"]} %)')
    h = s['hh']
    print(f'  confianza={s["confidence"]["level"]} {s["confidence"]["reasons"]}')
    print(f'  HH α={h["gain"]} β={h["bias"]} inliers={h["inliers"]} rango={h["range"]} p5/p95={h["p5"]}/{h["p95"]}')
    if s['hv']:
        v = s['hv']
        print(f'  HV α={v["gain"]} β={v["bias"]} inliers={v["inliers"]} rango={v["range"]} p5/p95={v["p5"]}/{v["p95"]}')
    for clase in s['classes']:
        print(f'    {clase["key"]:<14} {clase["km2"]:>9.1f} km²  {clase["pct"]:>6.2f} %')
    carpeta = config.DERIVED_DIR / cambio['id']
    for nombre, url in cambio['layers'].items():
        if url:
            tam = (carpeta / Path(url).name).stat().st_size / 1e6
            print(f'    capa {nombre:<10} {url}  {tam:.2f} MB')
    print('  capas en', carpeta)


print('== /api/health')
salud, _ = pedir('/api/health'); print(' ', salud)

print('\n== /api/stacks (La Mojana)')
datos, seg = pedir('/api/stacks', lon=-74.75, lat=8.55)
print(f'  {seg:.1f} s, {len(datos["stacks"])} pilas')
for p in datos['stacks']:
    print(f'  {p["id"]}: {p["analyzable_count"]} analizables, {len(p["scenes"])} escenas, '
          f'{p["first"]} → {p["last"]}, pol={p["polarizations"]}')
pila = next(p for p in datos['stacks'] if p['id'] == PILA)
print('  calidades:', [(e['date'], e['quality'][:4], e['analyzable']) for e in pila['scenes']])

print('\n== /api/stack/' + PILA)
una, _ = pedir(f'/api/stack/{PILA}'); print('  escenas:', len(una['scenes']))

print('\n== /api/image (miniatura)')
miniatura = next(e['thumbnail'] for e in pila['scenes'] if e['thumbnail'])
r = cliente.get(miniatura)
print(' ', r.status_code, r.headers.get('content-type'), len(r.content), 'bytes')

cambio, seg = pedir('/api/change', stack=PILA, before=ANTES, after=DESPUES)
resumen_cambio('== /api/change cuadro completo (con descarga la primera vez)', cambio, seg)
_, seg2 = pedir('/api/change', stack=PILA, before=ANTES, after=DESPUES)
print(f'  segunda llamada (caché): {seg2:.2f} s')

cambio_aoi, seg = pedir('/api/change', stack=PILA, before=ANTES, after=DESPUES, aoi=AOI)
resumen_cambio('== /api/change con aoi ' + AOI, cambio_aoi, seg)
print('  bounds', cambio_aoi['bounds'], 'coordinates', cambio_aoi['coordinates'])

print('\n== /api/probe')
for etiqueta, id_ in (('completo', cambio['id']), ('aoi', cambio_aoi['id'])):
    sonda, seg = pedir('/api/probe', change=id_, lon=PUNTO[0], lat=PUNTO[1])
    print(f'  {etiqueta}: {seg:.2f} s', json.dumps(sonda, ensure_ascii=False))
fuera, _ = pedir('/api/probe', change=cambio['id'], lon=10, lat=10); print('  fuera:', fuera)

print('\n== /api/series max=4')
serie, seg = pedir('/api/series', stack=PILA, lon=PUNTO[0], lat=PUNTO[1], max=4)
print(f'  {seg:.1f} s  bounds={serie["bounds"]}  dual={serie["dual_pol"]}')
for fila in serie['series']:
    print('   ', fila['date'], fila['quality'], 'HH', fila['hh_db'], 'HV', fila['hv_db'])
for cuadro in serie['frames']:
    ruta = config.DERIVED_DIR / Path(cuadro['url']).relative_to('/derived')
    print('   cuadro', cuadro['date'], f'{ruta.stat().st_size / 1e3:.0f} kB')

print('\n== /api/urgent')
urgentes, seg = pedir('/api/urgent', limit=5)
print(f'  {seg:.1f} s, {len(urgentes["scenes"])} escenas')
for e in urgentes['scenes'][:3]:
    print('   ', e['datetime'], e['product'], e['stack'], e['center'])

print('\n== /api/interferograms (Kilauea)')
intf, seg = pedir('/api/interferograms', lon=-155.28, lat=19.41, limit=3)
print(f'  {seg:.1f} s, {len(intf["items"])} interferogramas')
for i in intf['items']:
    print('   ', i['reference_date'], '→', i['secondary_date'], 'georef', i['georef'], i['coordinates'][0])

print('\nOK')
