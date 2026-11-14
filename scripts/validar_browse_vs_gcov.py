"""Validación científica del método del browse frente al γ⁰ calibrado del producto GCOV.

Para una misma ventana compara el Δ HH del método browse (/api/change con aoi) con el Δ HH calibrado
(/api/zoom), promediado en potencia a la resolución del browse y remuestreado a su cuadrícula.
Requiere red y EARTHDATA_TOKEN. Uso: python -X utf8 scripts/validar_browse_vs_gcov.py
Guarda un archivo nuevo fechado en docs/ o el indicado por --output; nunca sobrescribe el historial.
"""
import argparse
import hashlib
import json
import platform
import uuid
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

from fastapi.testclient import TestClient  # noqa: E402

from backend import change, config, gcov, geo, zoom as zoom_module  # noqa: E402
from backend.main import app  # noqa: E402

PILA, ANTES, DESPUES = '011_D_084', '2026-06-26', '2026-10-24'
LON, LAT, TAMANO = -74.85, 8.72, 15
UMBRAL = change.THRESHOLD_DB
MIN_COBERTURA = 0.5          # fracción mínima de celdas calibradas por píxel del browse (frente a la mediana)
VALIDATION_VERSION = 2


def pedir(cliente, ruta, **params):
    respuesta = cliente.get(ruta, params=params)
    if respuesta.status_code != 200:
        sys.exit(f'ERROR {respuesta.status_code} en {ruta}: {respuesta.text[:300]}')
    return respuesta.json()


def cargar(resultado):
    with np.load(config.DERIVED_DIR / resultado['id'] / 'arrays.npz') as paquete:
        return {k: paquete[k] for k in paquete.files}


def agrupar_en_cuadricula_browse(zoom, arreglos, browse_bounds, browse_shape, canal='hh'):
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
    p1 = 10 ** (arreglos[f'{canal}_before'][dentro].astype(np.float64) / 10)
    p2 = 10 ** (arreglos[f'{canal}_after'][dentro].astype(np.float64) / 10)
    tam = h_b * w_b
    s1, s2 = np.bincount(destino, p1, tam), np.bincount(destino, p2, tam)
    cuenta = np.bincount(destino, minlength=tam)
    return s1.reshape(h_b, w_b), s2.reshape(h_b, w_b), cuenta.reshape(h_b, w_b)


def delta_calibrado(s1, s2, cuenta, suavizar):
    """Δ dB sobre la cuadrícula del browse; `suavizar` aplica además la media 5×5 que usa el método browse."""
    if not np.any(cuenta > 0):
        return np.full(cuenta.shape, np.nan), np.zeros(cuenta.shape, bool)
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


def metricas(browse, referencia, umbral=UMBRAL):
    """Comparación sobre píxeles válidos en ambos: correlación, pendiente, error y detección de |Δ| ≥ 3 dB."""
    if browse.size == 0 or browse.shape != referencia.shape or not (np.isfinite(browse).all() and np.isfinite(referencia).all()):
        raise ValueError('Las métricas requieren pares finitos no vacíos de igual tamaño.')
    sb, sr = float(browse.std()), float(referencia.std())
    r = float(np.corrcoef(browse, referencia)[0, 1]) if browse.size > 1 and sb > 0 and sr > 0 else None
    pendiente, ordenada = np.polyfit(referencia, browse, 1) if sr > 0 else (None, None)
    pb, pr = np.abs(browse) >= umbral, np.abs(referencia) >= umbral
    tp = int((pb & pr).sum())
    mismo_signo = int(((np.sign(browse) == np.sign(referencia)) & pb & pr).sum())
    return {
        'umbral_db': umbral,
        'n_pixeles': int(browse.size),
        'aciertos_conjuntos': tp,
        'signo_correcto_n': mismo_signo,
        'signo_denominador': tp,
        'falsos_positivos': int((pb & ~pr).sum()),
        'falsos_negativos': int((~pb & pr).sum()),
        'verdaderos_negativos': int((~pb & ~pr).sum()),
        'error_comision': round(1 - tp / pb.sum(), 3) if pb.sum() else None,
        'error_omision': round(1 - tp / pr.sum(), 3) if pr.sum() else None,
        'pearson_r': round(r, 3) if r is not None else None,
        'pendiente_ols': round(float(pendiente), 3) if pendiente is not None else None,
        'ordenada_db': round(float(ordenada), 2) if ordenada is not None else None,
        'razon_desviaciones': round(sb / sr, 3) if sr > 0 else None,
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
             (f'|Δ| ≥ {m["umbral_db"]:g} dB: píxeles browse / calibrado', f'{m["detecta_browse"]} / {m["detecta_calibrado"]}'),
             ('Precisión del browse', m['precision']), ('Exhaustividad del browse', m['exhaustividad']),
             ('Signo correcto entre aciertos', m['signo_correcto_en_aciertos'])]
    for nombre, valor in filas:
        print(f'  {nombre:<44} {valor}')


def huella(path):
    digest = hashlib.sha256()
    with path.open('rb') as archivo:
        for bloque in iter(lambda: archivo.read(1024 * 1024), b''):
            digest.update(bloque)
    return digest.hexdigest()


def procedencia(resultado):
    carpeta = config.DERIVED_DIR / resultado['id']
    return {'id': resultado['id'], 'method': resultado['method'],
            'productos': {k: resultado[k] for k in ('before', 'after')},
            'size': resultado['size'], 'bounds': resultado['bounds'],
            'resolution_m': resultado.get('resolution_m'), 'grid': resultado.get('grid'),
            'georef': resultado['georef'],
            'sha256': {nombre: huella(carpeta / nombre) for nombre in ('arrays.npz', 'result.json')}}


def validar_caso(cliente, caso, canales, umbrales):
    pila, antes, despues, lon, lat, tamano = caso
    lon, lat, tamano = float(lon), float(lat), float(tamano)
    base = dict(stack=pila, before=antes, after=despues)
    zoom = pedir(cliente, '/api/zoom', **base, lon=lon, lat=lat, size_km=tamano)
    w, s, e, n = zoom['bounds']
    cambio = pedir(cliente, '/api/change', **base, aoi=f'{w},{s},{e},{n}')
    z, b = cargar(zoom), cargar(cambio)
    reporte = {'pila': pila, 'antes': antes, 'despues': despues, 'centro': [lon, lat], 'size_km': tamano,
               'browse': procedencia(cambio), 'calibrado': procedencia(zoom), 'canales': {}}
    for canal in canales:
        canal = canal.lower()
        if any(f'{canal}_{fecha}' not in a for a in (z, b) for fecha in ('before', 'after')):
            reporte['canales'][canal] = {'estado': 'sin_canal_comun'}
            continue
        browse_delta = b[f'{canal}_after'].astype(np.float64) - b[f'{canal}_before'].astype(np.float64)
        s1, s2, cuenta = agrupar_en_cuadricula_browse(zoom, z, cambio['bounds'], b['valid'].shape, canal)
        resultados = {}
        for clave, suavizar in (('promedio_a_resolucion_browse', False), ('promedio_y_media_5x5', True)):
            ref, valido_ref = delta_calibrado(s1, s2, cuenta, suavizar)
            comun = b['valid'] & valido_ref & np.isfinite(browse_delta)
            if comun.sum() < 100:
                resultados[clave] = {'estado': 'muestra_insuficiente', 'n_pixeles': int(comun.sum())}
                continue
            resultados[clave] = []
            for umbral in umbrales:
                m = metricas(browse_delta[comun], ref[comun], umbral)
                resultados[clave].append(m)
                imprimir(f'{pila} {antes}/{despues} {canal.upper()} {clave}', m)
        reporte['canales'][canal] = resultados
    return reporte


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--case', action='append', nargs=6,
                        metavar=('STACK', 'BEFORE', 'AFTER', 'LON', 'LAT', 'KM'),
                        help='Repita para ventanas/fechas predefinidas, incluyendo controles estables.')
    parser.add_argument('--channel', action='append', choices=('HH', 'HV'), help='Repita para ambos canales; predeterminado HH.')
    parser.add_argument('--thresholds', nargs='+', type=float, default=[UMBRAL], help='Sensibilidad; no selecciona un umbral óptimo.')
    parser.add_argument('--output', type=Path, help='Archivo NUEVO. Se rechaza si ya existe.')
    args = parser.parse_args(argv)
    if any(not np.isfinite(t) or t <= 0 for t in args.thresholds):
        parser.error('Los umbrales deben ser finitos y positivos.')
    ahora = datetime.now(timezone.utc)
    salida = args.output or RAIZ / 'docs' / f'validacion-{ahora:%Y%m%dT%H%M%SZ}-{uuid.uuid4().hex[:8]}.json'
    if salida.exists():
        parser.error(f'No se sobrescribe el historial: {salida}')
    casos = args.case or [(PILA, ANTES, DESPUES, LON, LAT, TAMANO)]
    archivos = ['scripts/validar_browse_vs_gcov.py', 'backend/change.py', 'backend/gcov.py', 'backend/zoom.py']
    reporte = {
        'fecha_validacion_utc': ahora.isoformat(), 'validation_version': VALIDATION_VERSION,
        'entorno': {'python': platform.python_version(), 'numpy': np.__version__},
        'metodos': {'browse': change.METHOD_VERSION, 'gcov': zoom_module.METHOD_VERSION,
                    'browse_smooth': change.SMOOTH_SIZE, 'gcov_smooth': gcov.SMOOTH_SIZE,
                    'min_cobertura_relativa': MIN_COBERTURA},
        'codigo_sha256': {f: huella(RAIZ / f) for f in archivos},
        'parametros': {'casos': casos, 'canales': args.channel or ['HH'], 'umbrales_db': args.thresholds},
        'limites': [
            'Referencia GCOV ya suavizada en potencia antes de agregarse a browse; no es verdad de terreno.',
            'Arrays guardados en float16; las métricas incluyen esa cuantización.',
            'Píxeles suavizados correlacionados espacialmente; no son muestras independientes.',
            'Precisión/exhaustividad de magnitud de cambio radar, no de clases físicas ni eventos.',
            'Signo correcto usa solo los aciertos conjuntos como denominador.',
            'La sensibilidad al umbral es descriptiva; elegir y evaluar exige muestras independientes.',
        ], 'casos': []}
    with TestClient(app) as cliente:
        for caso in casos:
            reporte['casos'].append(validar_caso(cliente, caso, args.channel or ['HH'], args.thresholds))
    with salida.open('x', encoding='utf-8') as archivo:
        json.dump(reporte, archivo, ensure_ascii=False, indent=2, allow_nan=False)
    print(f'\nGuardado en {salida}')


if __name__ == '__main__':
    main()
