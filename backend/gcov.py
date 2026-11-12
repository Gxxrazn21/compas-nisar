"""Cálculo de la lupa calibrada sobre dos productos GCOV (γ⁰ en potencia lineal a 10 m).

Aquí vive la matemática y la geometría de la ventana; la red está en `rangefile.py` y la
orquestación y la caché en `zoom.py`. Las funciones de lectura reciben grupos/datasets de h5py, de modo
que se prueban con un HDF5 local pequeño. Método: docs/contrato-api.md («Lupa calibrada»).
"""
import math
from dataclasses import dataclass

import numpy as np
from scipy import ndimage

from . import change, geo
from .errors import InvalidInput

GRUPO = 'science/LSAR/GCOV/grids/frequencyA'
MAX_LADO_PX = 1500            # lado máximo de la ventana promediada
MIN_PROMEDIO = 3              # N mínimo del promedio N×N
DARK_DB = -18.0               # «oscuro» = γ⁰ HH menor o igual que este valor
SMOOTH_SIZE = 3               # media 3×3 en potencia antes del cociente: el moteado a 30 m simula cambio
THRESHOLD_DB = change.THRESHOLD_DB
# Estiramiento físico fijo de las capas before/after (dB): R = B = HH, G = HV.
STRETCH_HH = (-25.0, 0.0)
STRETCH_HV = (-32.0, -7.0)
GRID_TOL = 0.01               # tolerancia (en píxeles) para considerar alineadas dos cuadrículas


# ---------------------------------------------------------------- cuadrícula del producto

@dataclass
class Grid:
    """Cuadrícula de un producto: EPSG y coordenadas (centros de píxel) de columnas y filas."""
    epsg: int
    x: np.ndarray
    y: np.ndarray

    @property
    def step_x(self):
        return float(self.x[1] - self.x[0])

    @property
    def step_y(self):
        return float(self.y[1] - self.y[0])


def read_grid(group):
    """Lee EPSG y coordenadas de un grupo `frequencyA`. Sin datos de proyección → InvalidInput."""
    try:
        proyeccion = group['projection']
        epsg = proyeccion.attrs.get('epsg_code')
        epsg = int(epsg if epsg is not None else proyeccion[()])
        x, y = np.asarray(group['xCoordinates'][:], np.float64), np.asarray(group['yCoordinates'][:], np.float64)
    except (KeyError, TypeError, ValueError):
        raise InvalidInput('El producto GCOV no trae la proyección o las coordenadas esperadas.') from None
    if x.size < 2 or y.size < 2:
        raise InvalidInput('El producto GCOV tiene una cuadrícula demasiado pequeña.')
    return Grid(epsg, x, y)


@dataclass
class Window:
    """Ventana común a dos productos. Los índices de B son los de A más el desplazamiento."""
    rows: tuple          # (fila0, fila1) en la cuadrícula de A
    cols: tuple          # (col0, col1) en la cuadrícula de A
    off_row: int         # fila de B = fila de A + off_row
    off_col: int
    n: int               # lado del promedio N×N
    x0: float            # borde izquierdo de la ventana (m, proyección del producto)
    y0: float            # borde superior
    step_x: float        # paso de la cuadrícula original (con signo)
    step_y: float

    @property
    def shape(self):
        """(alto, ancho) de la ventana promediada."""
        return ((self.rows[1] - self.rows[0]) // self.n, (self.cols[1] - self.cols[0]) // self.n)

    def rows_b(self):
        return self.rows[0] + self.off_row, self.rows[1] + self.off_row

    def cols_b(self):
        return self.cols[0] + self.off_col, self.cols[1] + self.off_col

    def grid_dict(self):
        """Datos de la ventana promediada que se guardan en result.json para pasar de lon/lat a píxel."""
        return {'epsg': None, 'x0': self.x0, 'y0': self.y0,
                'dx': self.step_x * self.n, 'dy': self.step_y * self.n}

    def corners_projected(self):
        """Esquinas de la imagen en la proyección, en el orden NO, NE, SE, SO (de la imagen)."""
        alto, ancho = self.shape
        x1, y1 = self.x0 + ancho * self.step_x * self.n, self.y0 + alto * self.step_y * self.n
        return [(self.x0, self.y0), (x1, self.y0), (x1, y1), (self.x0, y1)]


def averaging_factor(side_px):
    """N del promedio N×N: al menos 3 y el necesario para que el lado promediado no pase de 1500 px."""
    return max(MIN_PROMEDIO, math.ceil(side_px / MAX_LADO_PX))


def plan_window(grid_a, grid_b, cx, cy, size_km):
    """Ventana cuadrada de ~`size_km` alineada a la cuadrícula y común a las dos fechas.

    (cx, cy) es el centro en la proyección. Exige igual EPSG y paso; los orígenes pueden diferir
    (se calcula el desplazamiento entero). Se recorta a la intersección de ambas cuadrículas y el
    lado se ajusta a un múltiplo de N. Intersección vacía o cuadrículas no alineadas → InvalidInput.
    """
    if grid_a.epsg != grid_b.epsg:
        raise InvalidInput('Las dos fechas usan proyecciones distintas (EPSG '
                           f'{grid_a.epsg} y {grid_b.epsg}): no son comparables píxel a píxel.')
    dx, dy = grid_a.step_x, grid_a.step_y
    if not (math.isclose(dx, grid_b.step_x, abs_tol=1e-6) and math.isclose(dy, grid_b.step_y, abs_tol=1e-6)):
        raise InvalidInput('Las dos fechas tienen distinto tamaño de píxel: no son comparables.')
    off_col_f = (grid_a.x[0] - grid_b.x[0]) / dx
    off_row_f = (grid_a.y[0] - grid_b.y[0]) / dy
    off_col, off_row = round(off_col_f), round(off_row_f)
    if abs(off_col_f - off_col) > GRID_TOL or abs(off_row_f - off_row) > GRID_TOL:
        raise InvalidInput('Las cuadrículas de las dos fechas no coinciden (desfase de fracción de píxel): '
                           'no se pueden comparar sin remuestrear.')
    lado = max(1, round(size_km * 1000 / abs(dx)))
    n = averaging_factor(lado)
    col_c, fila_c = (cx - grid_a.x[0]) / dx, (cy - grid_a.y[0]) / dy       # índice (centro de píxel)
    col0, fila0 = round(col_c - (lado - 1) / 2), round(fila_c - (lado - 1) / 2)
    # intersección con A y con B (índice B = índice A + off)
    cols = (max(col0, 0, -off_col), min(col0 + lado, grid_a.x.size, grid_b.x.size - off_col))
    rows = (max(fila0, 0, -off_row), min(fila0 + lado, grid_a.y.size, grid_b.y.size - off_row))
    ancho, alto = (cols[1] - cols[0]) // n * n, (rows[1] - rows[0]) // n * n
    if ancho <= 0 or alto <= 0:
        raise InvalidInput('El punto queda fuera de la cobertura común de las dos escenas '
                           '(o demasiado cerca del borde).')
    cols, rows = (cols[0], cols[0] + ancho), (rows[0], rows[0] + alto)
    return Window(rows, cols, off_row, off_col, n,
                  x0=float(grid_a.x[0] + (cols[0] - 0.5) * dx), y0=float(grid_a.y[0] + (rows[0] - 0.5) * dy),
                  step_x=dx, step_y=dy)


def window_geometry(window, epsg):
    """(grid, esquinas lon/lat NO-NE-SE-SO, bounds w,s,e,n) de la ventana promediada."""
    hacia_lonlat = geo.transformer(epsg, True)
    esquinas = [list(map(lambda v: round(float(v), 6), hacia_lonlat.transform(x, y)))
                for x, y in window.corners_projected()]
    lons, lats = [c[0] for c in esquinas], [c[1] for c in esquinas]
    grid = window.grid_dict()
    grid['epsg'] = int(epsg)
    return grid, esquinas, [min(lons), min(lats), max(lons), max(lats)]


# ---------------------------------------------------------------- lectura y promedio

def chunk_ranges(dataset, rows, cols):
    """(desplazamiento, tamaño) en bytes de cada bloque comprimido que toca la ventana (para precalentar)."""
    alto_b, ancho_b = dataset.chunks
    rangos = []
    for fila in range(rows[0] // alto_b * alto_b, rows[1], alto_b):
        for col in range(cols[0] // ancho_b * ancho_b, cols[1], ancho_b):
            info = dataset.id.get_chunk_info_by_coord((fila, col))
            if info.byte_offset is not None:
                rangos.append((int(info.byte_offset), int(info.size)))
    return rangos


def block_mean_power(values, n):
    """Promedio N×N en potencia lineal ignorando inválidos (no finitos o ≤ 0); NaN si el bloque no tiene datos.

    El alto y el ancho de `values` deben ser múltiplos de N.
    """
    alto, ancho = values.shape
    valido = np.isfinite(values) & (values > 0)
    sumas = np.where(valido, values, 0).reshape(alto // n, n, ancho // n, n).sum(axis=(1, 3), dtype=np.float64)
    cuenta = valido.reshape(alto // n, n, ancho // n, n).sum(axis=(1, 3))
    return np.where(cuenta > 0, sumas / np.maximum(cuenta, 1), np.nan).astype(np.float32)


def read_power(dataset, rows, cols, n):
    """Lee una ventana del dataset (float32) y devuelve su promedio N×N en potencia."""
    return block_mean_power(dataset[rows[0]:rows[1], cols[0]:cols[1]].astype(np.float32, copy=False), n)


# ---------------------------------------------------------------- método: Δ, clases y estadísticas

def to_db(power):
    """10·log10 de la potencia; NaN donde no hay dato."""
    with np.errstate(invalid='ignore', divide='ignore'):
        return (10 * np.log10(power)).astype(np.float32)


@dataclass
class Analysis:
    """Resultado de la lupa: dB γ⁰ de cada fecha y polarización, Δ, validez y clases."""
    valid: np.ndarray
    classes: np.ndarray
    hh_before: np.ndarray
    hh_after: np.ndarray
    hv_before: np.ndarray = None
    hv_after: np.ndarray = None
    view: dict = None             # dB sin suavizar de cada fecha, solo para pintar imágenes nítidas

    @property
    def dual(self):
        return self.hv_before is not None

    @property
    def delta_hh(self):
        return self.hh_after - self.hh_before

    @property
    def delta_hv(self):
        return self.hv_after - self.hv_before


def smooth_power(power, valid, size=SMOOTH_SIZE):
    """Media móvil size×size de la potencia, normalizada por las celdas válidas de la ventana."""
    if size <= 1:
        return power
    suma = ndimage.uniform_filter(np.where(valid, power, 0).astype(np.float64), size, mode='constant')
    peso = ndimage.uniform_filter(valid.astype(np.float64), size, mode='constant')
    return np.where(valid, suma / np.maximum(peso, 1e-9), np.nan).astype(np.float32)


def analyze(hh_before, hh_after, hv_before=None, hv_after=None, smooth=SMOOTH_SIZE):
    """Aplica el método a potencias promediadas (lineales). Δ = 10·log10(P₂/P₁); sin píxeles → InvalidInput.

    Δ, clases y sonda usan la potencia suavizada `smooth`×`smooth` (con pocas miradas por celda el
    moteado del radar simula cambios de varios dB); `view` conserva los dB sin suavizar para las imágenes.
    """
    dual = hv_before is not None and hv_after is not None
    canales = [hh_before, hh_after] + ([hv_before, hv_after] if dual else [])
    valido = np.logical_and.reduce([np.isfinite(c) for c in canales])
    if not valido.any():
        raise InvalidInput('Las dos escenas no comparten píxeles con dato en esta ventana.')
    nitidos = [np.where(valido, to_db(c), np.nan) for c in canales]
    dbs = [np.where(valido, to_db(smooth_power(c, valido, smooth)), np.nan) for c in canales]
    hh_b, hh_a = dbs[0], dbs[1]
    hv_b, hv_a = (dbs[2], dbs[3]) if dual else (None, None)
    delta_hv = (hv_a - hv_b) if dual else None
    classes = change.classify(hh_a - hh_b, delta_hv, hh_b <= DARK_DB, hh_a <= DARK_DB, valido, dual)
    vista = dict(zip(('hh_before', 'hh_after', 'hv_before', 'hv_after'), nitidos))
    return Analysis(valido, classes, hh_b, hh_a, hv_b, hv_a, vista)


def channel_stats(before_db, after_db, valid):
    """Medianas, percentiles de Δ e histograma (mismos bordes y colas que /api/change)."""
    delta = (after_db - before_db)[valid]
    p5, p95 = np.percentile(delta, [5, 95])
    bordes = change.HIST_EDGES
    cuentas, _ = np.histogram(np.clip(delta, bordes[0], bordes[-1]), bins=bordes)
    return {'median_before_db': round(float(np.median(before_db[valid])), 2),
            'median_after_db': round(float(np.median(after_db[valid])), 2),
            'p5': round(float(p5), 2), 'p95': round(float(p95), 2),
            'hist': {'edges': [float(x) for x in change.HIST_EDGES], 'counts': [int(x) for x in cuentas]}}


def compute_stats(analysis, pixel_m):
    """Estadísticas del contrato. `pixel_m` = lado del píxel promediado en metros (área = pixel_m²)."""
    pixel_km2 = (pixel_m / 1000) ** 2
    cuentas = np.bincount(analysis.classes[analysis.valid], minlength=8)
    valid_km2 = float(analysis.valid.sum()) * pixel_km2
    changed_km2 = float(cuentas[1:].sum()) * pixel_km2
    fraccion = float(analysis.valid.mean())
    v = analysis.valid
    correlacion = None
    if v.sum() > 2 and analysis.hh_before[v].std() > 0 and analysis.hh_after[v].std() > 0:
        correlacion = round(float(np.corrcoef(analysis.hh_before[v], analysis.hh_after[v])[0, 1]), 3)
    if fraccion >= 0.5:
        confianza = {'level': 'alta', 'reasons': []}
    else:
        confianza = {'level': 'media', 'reasons': [
            f'Solo el {fraccion * 100:.0f} % de la ventana tiene dato en las dos fechas.']}
    clases = [{'key': key, 'label': label, 'km2': round(float(cuentas[i + 1]) * pixel_km2, 1),
               'pct': round(float(cuentas[i + 1]) * pixel_km2 / valid_km2 * 100, 2) if valid_km2 else 0.0,
               'color': color} for i, (key, label, color) in enumerate(change.CLASSES)]
    return {
        'valid_km2': round(valid_km2, 1),
        'changed_km2': round(changed_km2, 1),
        'changed_pct': round(changed_km2 / valid_km2 * 100, 2) if valid_km2 else 0.0,
        'correlation': correlacion,
        'confidence': confianza,
        'classes': clases,
        'hh': channel_stats(analysis.hh_before, analysis.hh_after, v),
        'hv': channel_stats(analysis.hv_before, analysis.hv_after, v) if analysis.dual else None,
    }


# ---------------------------------------------------------------- capas

def stretch(db, limits):
    """dB → uint8 con estiramiento lineal fijo (limits = (mínimo, máximo) en dB)."""
    t = np.clip((np.nan_to_num(db, nan=limits[0]) - limits[0]) / (limits[1] - limits[0]), 0, 1)
    return (t * 255).round().astype(np.uint8)


def render_date(hh_db, hv_db):
    """RGBA de una fecha: R = B = HH (−25 a 0 dB), G = HV (−32 a −7 dB; HH si no hay HV); alfa 0 sin dato."""
    hh = stretch(hh_db, STRETCH_HH)
    hv = stretch(hv_db, STRETCH_HV) if hv_db is not None else hh
    return change.render_rgb(np.dstack([hh, hv, hh]), np.isfinite(hh_db))


def render_layers(analysis):
    """Seis capas RGBA (HV es None en polarización simple), con las reglas de /api/change."""
    valido = analysis.valid
    delta_hh = np.where(valido, analysis.delta_hh, 0)
    vista = analysis.view or {}
    hh_antes = vista.get('hh_before', analysis.hh_before)
    hh_despues = vista.get('hh_after', analysis.hh_after)
    antes = stretch(hh_antes, STRETCH_HH)
    despues = stretch(hh_despues, STRETCH_HH)
    return {
        'before': render_date(hh_antes, vista.get('hv_before', analysis.hv_before)),
        'after': render_date(hh_despues, vista.get('hv_after', analysis.hv_after)),
        'change_hh': change.render_change(delta_hh, valido),
        'change_hv': (change.render_change(np.where(valido, analysis.delta_hv, 0), valido)
                      if analysis.dual else None),
        'classes': change.render_classes(analysis.classes),
        'composite': change.render_rgb(np.dstack([despues, antes, antes]), valido),
    }


def arrays_for_probe(analysis):
    """Arreglos que /api/probe necesita (dB reales en float16: precisión de 0,01 dB a −25 dB)."""
    arreglos = {'valid': analysis.valid, 'classes': analysis.classes,
                'hh_before': analysis.hh_before.astype(np.float16),
                'hh_after': analysis.hh_after.astype(np.float16)}
    if analysis.dual:
        arreglos.update(hv_before=analysis.hv_before.astype(np.float16),
                        hv_after=analysis.hv_after.astype(np.float16))
    return arreglos
