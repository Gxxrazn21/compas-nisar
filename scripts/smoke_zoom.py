"""Prueba de humo de la lupa calibrada contra los servicios reales (CMR y ASF). Requiere red y token.

Uso: python -X utf8 scripts/smoke_zoom.py
Imprime tiempos (primera llamada y desde caché), megabytes descargados, estadísticas y una sonda.
No imprime el token. Las capas quedan en data/cache/derived/<id>/.
"""
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
LON, LAT, TAMANO = -74.85, 8.72, 15       # ciénagas de La Mojana


def pedir(ruta, **params):
    inicio = time.perf_counter()
    respuesta = cliente.get(ruta, params=params)
    return respuesta, time.perf_counter() - inicio


def main():
    salud = cliente.get('/api/health').json()
    print('health:', salud)
    if not salud.get('earthdata'):
        sys.exit('Falta EARTHDATA_TOKEN en .env')
    params = dict(stack=PILA, before=ANTES, after=DESPUES, lon=LON, lat=LAT, size_km=TAMANO)
    respuesta, segundos = pedir('/api/zoom', **params)
    if respuesta.status_code != 200:
        sys.exit(f'ERROR {respuesta.status_code}: {respuesta.text[:400]}')
    zoom = respuesta.json()
    descarga = zoom['download']
    print(f'\nPrimera llamada: {segundos:.1f} s (cálculo {descarga["seconds"]} s)  id={zoom["id"]}')
    print(f'  descargado: {descarga["mb"]} MB en {descarga["requests"]} peticiones')
    print(f'  tamaño={zoom["size"]}  resolución={zoom["resolution_m"]} m  georef={zoom["georef"]}  '
          f'source={zoom["source"]}  dual={zoom["dual_pol"]}')
    print('  bounds:', zoom['bounds'])
    print('  esquinas:', zoom['coordinates'])
    s = zoom['stats']
    print(f'  válido={s["valid_km2"]} km²  cambiado={s["changed_km2"]} km² ({s["changed_pct"]} %)  '
          f'correlación={s["correlation"]}  confianza={s["confidence"]["level"]}')
    for canal in ('hh', 'hv'):
        c = s[canal]
        if c:
            print(f'  {canal.upper()}: mediana antes={c["median_before_db"]} dB después={c["median_after_db"]} dB  '
                  f'Δ p5={c["p5"]} p95={c["p95"]}')
    for clase in s['classes']:
        print(f'    {clase["key"]:<14} {clase["km2"]:>8} km²  {clase["pct"]:>6} %')

    respuesta, segundos = pedir('/api/zoom', **params)
    print(f'\nDesde caché: {segundos * 1000:.0f} ms (mismo id: {respuesta.json()["id"] == zoom["id"]})')

    sonda, segundos = pedir('/api/probe', change=zoom['id'], lon=LON, lat=LAT)
    print(f'\nSonda en el centro ({segundos * 1000:.0f} ms):', sonda.json())
    for nombre, ruta in zoom['layers'].items():
        if ruta:
            archivo = config.DERIVED_DIR / zoom['id'] / Path(ruta).name
            print(f'  {nombre:<10} {archivo}  ({archivo.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
