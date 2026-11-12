"""Validación científica del método del browse frente al γ⁰ calibrado del producto GCOV.

Para una misma ventana compara el Δ HH del método browse (/api/change con aoi) con el Δ HH calibrado
(/api/zoom), promediado en potencia a la resolución del browse y remuestreado a su cuadrícula.
Requiere red y EARTHDATA_TOKEN. Uso: python -X utf8 scripts/validar_browse_vs_gcov.py
Guarda docs/validacion-browse.json. Los números se reportan tal como salen.
"""
import json
import sys
from datetime import date
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

from fastapi.testclient import TestClient  # noqa: E402

from backend import change, config, geo  # noqa: E402
from backend.main import app  # noqa: E402

PILA, ANTES, DESPUES = '011_D_084', '2026-06-26', '2026-10-24'
LON, LAT, TAMANO = -74.85, 8.72, 15
UMBRAL = change.THRESHOLD_DB
MIN_COBERTURA = 0.5          # fracción mínima de celdas calibradas por píxel del browse (frente a la mediana)
SALIDA = RAIZ / 'docs' / 'validacion-browse.json'


def pedir(cliente, ruta, **params):
    respuesta = cliente.get(ruta, params=params)
    if respuesta.status_code != 200:
        sys.exit(f'ERROR {respuesta.status_code} en {ruta}: {respuesta.text[:300]}')
    return respuesta.json()


def cargar(resultado):
    with np.load(config.DERIVED_DIR / resultado['id'] / 'arrays.npz') as paquete:
        return {k: paquete[k] for k in paquete.files}


def agrupar_en_cuadricula_browse(zoom, arreglos, browse_bounds, browse_shape):
    """Suma de potencia γ⁰ (antes y después) y número de celdas calibradas dentro de cada píxel del browse."""
    grid = zoom['grid']
    alto, ancho = arreglos['valid'].shape
    cols, filas = np.meshgrid(np.arange(ancho) + 0.5, np.arange(alto) + 0.5)
    x, y = grid['x0'] + cols * grid['dx'], grid['y0'] + filas * grid['dy']
    lon, lat = geo.transformer(grid['epsg'], True).transform(x, y)
    w, s, e, n = browse_bounds
    h_b, w_b = browse_shape
    col_b = np.floor((lon - w) / (e - w) * w_b).astype(int)
    fila_b = np.floor((n - lat) / (n - s) * h_b).astype(int)
    dentro = arreglos['valid'] & (col_b >= 0) & (col_b < w_b) & (fila_b >= 0) & (fila_b < h_b)
    destino = (fila_b * w_b + col_b)[dentro]
    p1 = 10 ** (arreglos['hh_before'][dentro].astype(np.float64) / 10)
    p2 = 10 ** (arreglos['hh_after'][dentro].astype(np.float64) / 10)
    tam = h_b * w_b
    s1, s2 = np.bincount(destino, p1, tam), np.bincount(destino, p2, tam)
    cuenta = np.bincount(destino, minlength=tam)
    return s1.reshape(h_b, w_b), s2.reshape(h_b, w_b), cuenta.reshape(h_b, w_b)


def delta_calibrado(s1, s2, cuenta, suavizar):
    """Δ dB sobre la cuadrícula del browse; `suavizar` aplica además la media 5×5 que usa el método browse."""
    mediana = np.median(cuenta[cuenta > 0])
    valido = cuenta >= MIN_COBERTURA * mediana
    if suavizar:
        m1 = change.smooth_values(np.where(valido, s1 / np.maximum(cuenta, 1), 0), valido)
        m2 = change.smooth_values(np.where(valido, s2 / np.maximum(cuenta, 1), 0), valido)
    else:
        m1, m2 = s1 / np.maximum(cuenta, 1), s2 / np.maximum(cuenta, 1)
    with np.errstate(divide='ignore', invalid='ignore'):
        delta = 10 * np.log10(m2 / m1)
    valido &= np.isfinite(delta)
    return np.where(valido, delta, np.nan), valido


def metricas(browse, referencia):
    """Comparación sobre píxeles válidos en ambos: correlación, pendiente, error y detección de |Δ| ≥ 3 dB."""
    r = float(np.corrcoef(browse, referencia)[0, 1])
    pendiente, ordenada = np.polyfit(referencia, browse, 1)
    pb, pr = np.abs(browse) >= UMBRAL, np.abs(referencia) >= UMBRAL
    tp = int((pb & pr).sum())
    mismo_signo = int(((np.sign(browse) == np.sign(referencia)) & pb & pr).sum())
    return {
        'n_pixeles': int(browse.size),
        'pearson_r': round(r, 3),
        'pendiente_ols': round(float(pendiente), 3),
        'ordenada_db': round(float(ordenada), 2),
        'razon_desviaciones': round(float(browse.std() / referencia.std()), 3),
        'mediana_error_abs_db': round(float(np.median(np.abs(browse - referencia))), 2),
        'sesgo_mediano_db': round(float(np.median(browse - referencia)), 2),
        'desv_browse_db': round(float(browse.std()), 2),
        'desv_calibrado_db': round(float(referencia.std()), 2),
        'detecta_browse': int(pb.sum()),
        'detecta_calibrado': int(pr.sum()),
        'precision': round(tp / pb.sum(), 3) if pb.sum() else None,
        'exhaustividad': round(tp / pr.sum(), 3) if pr.sum() else None,
        'signo_correcto_en_aciertos': round(mismo_signo / tp, 3) if tp else None,
    }


def imprimir(titulo, m):
    print(f'\n{titulo}')
    filas = [('Píxeles comparados', m['n_pixeles']), ('Correlación de Pearson', m['pearson_r']),
             ('Pendiente OLS (browse sobre calibrado)', m['pendiente_ols']),
             ('Razón de desviaciones (browse/calibrado)', m['razon_desviaciones']),
             ('Mediana |error| (dB)', m['mediana_error_abs_db']), ('Sesgo mediano (dB)', m['sesgo_mediano_db']),
             ('Desv. típica Δ browse / calibrado (dB)', f'{m["desv_browse_db"]} / {m["desv_calibrado_db"]}'),
             ('|Δ| ≥ 3 dB: píxeles browse / calibrado', f'{m["detecta_browse"]} / {m["detecta_calibrado"]}'),
             ('Precisión del browse', m['precision']), ('Exhaustividad del browse', m['exhaustividad']),
             ('Signo correcto entre aciertos', m['signo_correcto_en_aciertos'])]
    for nombre, valor in filas:
        print(f'  {nombre:<44} {valor}')


def main():
    cliente = TestClient(app)
    base = dict(stack=PILA, before=ANTES, after=DESPUES)
    zoom = pedir(cliente, '/api/zoom', **base, lon=LON, lat=LAT, size_km=TAMANO)
    w, s, e, n = zoom['bounds']
    cambio = pedir(cliente, '/api/change', **base, aoi=f'{w},{s},{e},{n}')
    print(f'Ventana: {TAMANO} km en ({LON}, {LAT}); calibrado {zoom["size"]} px a {zoom["resolution_m"]} m; '
          f'browse {cambio["size"]} px (georef {cambio["georef"]}, confianza {cambio["stats"]["confidence"]["level"]})')

    z, b = cargar(zoom), cargar(cambio)
    browse_delta = b['hh_after'].astype(np.float64) - b['hh_before'].astype(np.float64)
    forma = b['valid'].shape
    s1, s2, cuenta = agrupar_en_cuadricula_browse(zoom, z, cambio['bounds'], forma)
    reporte = {'fecha_validacion': date.today().isoformat(), 'pila': PILA, 'antes': ANTES, 'despues': DESPUES,
               'centro': [LON, LAT], 'size_km': TAMANO, 'umbral_db': UMBRAL,
               'browse': {'size': cambio['size'], 'georef': cambio['georef'], 'bounds': cambio['bounds'],
                          'correlacion_escena': cambio['stats']['correlation'],
                          'confianza': cambio['stats']['confidence']['level']},
               'calibrado': {'size': zoom['size'], 'resolucion_m': zoom['resolution_m'],
                             'celdas_por_pixel_browse_mediana': int(np.median(cuenta[cuenta > 0]))},
               'resultados': {}}
    for clave, titulo, suavizar in (
            ('promedio_a_resolucion_browse', 'A. Calibrado promediado a la resolución del browse', False),
            ('promedio_y_media_5x5', 'B. Igual que A y además media 5×5 (la que aplica el método browse)', True)):
        ref, valido_ref = delta_calibrado(s1, s2, cuenta, suavizar)
        comun = b['valid'] & valido_ref & np.isfinite(browse_delta)
        if comun.sum() < 100:
            sys.exit('Muy pocos píxeles comunes para validar.')
        m = metricas(browse_delta[comun], ref[comun])
        reporte['resultados'][clave] = m
        imprimir(titulo, m)
    SALIDA.write_text(json.dumps(reporte, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\nGuardado en {SALIDA}')


if __name__ == '__main__':
    main()
