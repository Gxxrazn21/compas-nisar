"""Detección de cambio entre dos browse GCOV de la misma pila.

La matemática (analyze, classify, stats, render_*, probe_arrays) son funciones puras sobre arreglos
numpy, sin red ni disco. `compute_change` las orquesta con descarga, caché y capas PNG.
Método normativo: docs/contrato-api.md. Es brillo relativo del browse, no γ⁰ calibrado.
"""
import json
import os
import shutil
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from hashlib import sha1

import numpy as np
from PIL import Image
from scipy import ndimage

from . import browse, cache, config, geo
from .catalog import scene_public
from .errors import InvalidInput, NotFound

METHOD_VERSION = 3            # súbelo si cambia el método: invalida los resultados en caché
THRESHOLD_DB = 3.0
DARK_MARGIN = 0.04            # «oscuro» = valor recortado <= límite inferior + 0,04
VEG_FLOOD_HV_MAX = 1.5
SMOOTH_SIZE = 5
ERODE_PX = 2
C_OFFSET = 0.03               # c ≈ p5/(p95 − p5), valor supuesto
FIT_SAMPLE = 300_000
FIT_SEED = 0
DELTA_SATURATION_DB = 8.0
HIST_EDGES = np.arange(-10.0, 10.5, 0.5)

# (clave, etiqueta, color) en orden de prioridad; el índice en el mapa de clases es posición + 1.
CLASSES = [
    ('agua_nueva', 'Posible agua abierta nueva', '#38bdf8'),
    ('agua_retirada', 'Posible retiro de agua', '#fbbf24'),
    ('veg_inundada', 'Posible vegetación inundada', '#e879f9'),
    ('veg_perdida', 'Posible pérdida de vegetación', '#f87171'),
    ('veg_aumento', 'Posible aumento de vegetación', '#4ade80'),
    ('aumento', 'Aumento de retorno', '#fb923c'),
    ('disminucion', 'Disminución de retorno', '#60a5fa'),
]
NEGATIVE_RAMP = ((0x7d, 0xd3, 0xfc), (0x02, 0x84, 0xc7))   # disminución: azules
POSITIVE_RAMP = ((0xfd, 0xba, 0x74), (0xea, 0x58, 0x0c))   # aumento: naranjas
LAYER_NAMES = ('before', 'after', 'change_hh', 'change_hv', 'classes', 'composite')

_compute_slots = threading.Semaphore(2)
_id_locks = {}
_id_locks_guard = threading.Lock()


# ---------------------------------------------------------------- matemática pura (método v3)

def valid_mask(a, b, erosion=ERODE_PX):
    """Píxeles con dato en ambas fechas (algún canal > 0), erosionados `erosion` px (bordes de franja)."""
    mask = (a.max(axis=2) > 0) & (b.max(axis=2) > 0)
    if erosion:
        mask = ndimage.binary_erosion(mask, structure=np.ones((3, 3), bool), iterations=erosion)
    return mask


def smooth_values(values, valid, size=SMOOTH_SIZE):
    """Media móvil size×size normalizada por los píxeles válidos de la ventana."""
    numerator = ndimage.uniform_filter(np.where(valid, values, 0).astype(np.float32), size, mode='constant')
    denominator = ndimage.uniform_filter(valid.astype(np.float32), size, mode='constant')
    return np.where(denominator > 0, numerator / np.maximum(denominator, 1e-6), 0).astype(np.float32)


def q_channel(nd, valid):
    """q = ((ND − 1)/254)², función afín de la potencia (el browse es √ del recorte p5–p95), suavizada."""
    q = np.clip((nd.astype(np.float32) - 1) / 254, 0, 1) ** 2
    return smooth_values(q, valid)


def rma_robust(x, y, iterations=5):
    """Eje mayor reducido y ≈ α·x + β, descartando residuos ortogonales > 2,5 σ robustas.

    Devuelve (α, β, fracción de concordantes). Es simétrico: no sufre el sesgo de atenuación de MCO.
    """
    keep = np.ones(x.size, bool)
    alpha, beta = 1.0, 0.0
    for _ in range(iterations):
        if keep.sum() < 2:
            break
        sx, sy = x[keep].std(), y[keep].std()
        if sx == 0 or sy == 0:
            break
        alpha = float(sy / sx)
        beta = float(y[keep].mean() - alpha * x[keep].mean())
        residual = (y - (alpha * x + beta)) / np.sqrt(1 + alpha ** 2)
        center = np.median(residual[keep])
        sigma = 1.4826 * np.median(np.abs(residual[keep] - center))
        keep = np.abs(residual) < 2.5 * max(sigma, 1e-6)
    return alpha, beta, float(keep.mean())


def fit_normalization(qa, qb, nd_a, nd_b, valid):
    """Ajusta q_B ≈ α·q_A + β sobre píxeles válidos no saturados (ND ≠ 1 y ≠ 255 en ambas fechas).

    Muestra de hasta 300.000 con semilla fija (reproducible). Devuelve (α, β, inliers, correlación).
    Si casi no hay píxeles utilizables devuelve la identidad con inliers 0.
    """
    usable = valid & (nd_a > 1) & (nd_a < 255) & (nd_b > 1) & (nd_b < 255)
    indices = np.flatnonzero(usable)
    if indices.size < 50:
        return 1.0, 0.0, 0.0, None
    muestra = np.random.default_rng(FIT_SEED).choice(indices, size=min(FIT_SAMPLE, indices.size),
                                                     replace=False)
    x, y = qa.ravel()[muestra].astype(np.float64), qb.ravel()[muestra].astype(np.float64)
    alpha, beta, inliers = rma_robust(x, y)
    corr = None if x.std() == 0 or y.std() == 0 else float(np.corrcoef(x, y)[0, 1])
    return alpha, beta, inliers, corr


def comparable_range(alpha, beta):
    """Intervalo [max(0, β), min(1, α + β)] en unidades de B; nunca degenerado."""
    lo = max(0.0, beta)
    hi = min(1.0, alpha + beta)
    return lo, max(hi, lo + 1e-3)


def to_db(q):
    """10·log10(q + c): dB relativos a la escena (aproximados, no γ⁰)."""
    return (10 * np.log10(q + C_OFFSET)).astype(np.float32)


@dataclass
class ChannelResult:
    """Resultado de una polarización: dB antes/después en la escala común de B, Δ y el ajuste."""
    before_db: np.ndarray
    after_db: np.ndarray
    delta: np.ndarray
    dark_before: np.ndarray
    dark_after: np.ndarray
    gain: float
    bias: float
    inliers: float
    corr: float
    lo: float
    hi: float

    def crop(self, window):
        c0, r0, c1, r1 = window
        corte = (slice(r0, r1), slice(c0, c1))
        return ChannelResult(**{k: (v[corte] if isinstance(v, np.ndarray) else v)
                                for k, v in self.__dict__.items()})


def channel_delta(nd_before, nd_after, valid):
    """Normaliza A (antes) a la escala de B (después), recorta al intervalo comparable y calcula Δ."""
    qa, qb = q_channel(nd_before, valid), q_channel(nd_after, valid)
    alpha, beta, inliers, corr = fit_normalization(qa, qb, nd_before, nd_after, valid)
    lo, hi = comparable_range(alpha, beta)
    qa_norm = np.clip(alpha * qa + beta, lo, hi)
    qb_clip = np.clip(qb, lo, hi)
    before_db, after_db = to_db(qa_norm), to_db(qb_clip)
    return ChannelResult(before_db, after_db, after_db - before_db,
                         qa_norm <= lo + DARK_MARGIN, qb_clip <= lo + DARK_MARGIN,
                         alpha, beta, inliers, corr, lo, hi)


def classify(delta_hh, delta_hv, dark_before, dark_after, valid, dual):
    """Mapa uint8 de clases (0 = estable/sin dato; 1..7 según CLASSES), con mediana 3×3 al final."""
    up, down = delta_hh >= THRESHOLD_DB, delta_hh <= -THRESHOLD_DB
    rules = [(1, down & dark_after), (2, up & dark_before)]
    if dual:
        hv_up = delta_hv >= THRESHOLD_DB
        hv_down = delta_hv <= -THRESHOLD_DB
        rules += [(3, up & (delta_hv < VEG_FLOOD_HV_MAX) & ~dark_before), (4, hv_down), (5, hv_up)]
    rules += [(6, up), (7, down)]
    classes = np.zeros(valid.shape, np.uint8)
    free = valid.copy()
    for index, condition in rules:
        hit = condition & free
        classes[hit] = index
        free &= ~hit
    classes = ndimage.median_filter(classes, size=3)
    classes[~valid] = 0
    return classes


@dataclass
class Analysis:
    """Resultado del método sobre un cuadro (o una ventana recortada del mismo)."""
    valid: np.ndarray
    classes: np.ndarray
    hh: ChannelResult
    hv: ChannelResult = None

    @property
    def dual(self):
        return self.hv is not None

    def crop(self, window):
        """Recorte (col0, fila0, col1, fila1); los ajustes (del cuadro completo) no cambian."""
        c0, r0, c1, r1 = window
        corte = (slice(r0, r1), slice(c0, c1))
        return Analysis(self.valid[corte], self.classes[corte], self.hh.crop(window),
                        self.hv.crop(window) if self.hv else None)


def analyze(a, b, dual, erosion=ERODE_PX):
    """Aplica el método a dos cuadros RGB uint8 de igual tamaño. Sin píxeles en común → InvalidInput."""
    if a.shape != b.shape:
        raise InvalidInput('Las dos imágenes no tienen el mismo tamaño: no son comparables píxel a píxel.')
    valid = valid_mask(a, b, erosion)
    if not valid.any():
        raise InvalidInput('Las dos escenas no comparten píxeles con dato.')
    hh = channel_delta(a[..., 0], b[..., 0], valid)
    hv = channel_delta(a[..., 1], b[..., 1], valid) if dual else None
    classes = classify(hh.delta, hv.delta if hv else None, hh.dark_before, hh.dark_after, valid, dual)
    return Analysis(valid, classes, hh, hv)


def confidence(channel):
    """Confianza de la comparación (paso 8) con razones legibles en español."""
    corr, inliers = channel.corr, channel.inliers
    razones = []
    if corr is None or corr < 0.85:
        texto = 'no se pudo medir' if corr is None else f'{corr:.2f}'
        razones.append(f'La correlación entre las dos fechas es baja ({texto}): cambió gran parte de la '
                       'escena o los estiramientos de brillo difieren demasiado.')
    if inliers < 0.80:
        razones.append(f'Solo el {inliers * 100:.0f} % de los píxeles concuerda con el ajuste de '
                       'normalización entre fechas, por debajo del 80 % esperado.')
    if corr is not None and corr >= 0.85 and inliers >= 0.80:
        nivel = 'alta'
    elif corr is not None and corr >= 0.70:
        nivel = 'media'
    else:
        nivel = 'baja'
    return {'level': nivel, 'reasons': razones}


def class_areas(classes, valid, bounds):
    """(área válida km², arreglo de 8 áreas km² por clase [0 sin uso], con peso por latitud de cada fila)."""
    rows = classes.shape[0]
    pixel_km2 = geo.row_area_km2(bounds, classes.shape)
    index = (np.arange(rows)[:, None] * 8 + classes).ravel()
    counts = np.bincount(index, minlength=rows * 8).reshape(rows, 8)
    per_class = (counts * pixel_km2[:, None]).sum(axis=0)
    valid_km2 = float((valid.sum(axis=1) * pixel_km2).sum())
    return valid_km2, per_class


def channel_stats(channel, valid):
    """Ajuste de normalización y distribución de Δ (p5, p95, histograma con colas en los extremos)."""
    values = channel.delta[valid]
    p5, p95 = np.percentile(values, [5, 95])
    counts, _ = np.histogram(np.clip(values, HIST_EDGES[0], HIST_EDGES[-1]), bins=HIST_EDGES)
    return {'gain': round(channel.gain, 3), 'bias': round(channel.bias, 3),
            'inliers': round(channel.inliers, 3), 'range': [round(channel.lo, 3), round(channel.hi, 3)],
            'p5': round(float(p5), 2), 'p95': round(float(p95), 2),
            'hist': {'edges': [float(x) for x in HIST_EDGES], 'counts': [int(x) for x in counts]}}


def compute_stats(analysis, bounds):
    """Estadísticas del contrato para una ventana ya recortada.

    `correlation` y `confidence` describen la comparabilidad de la escena completa (ajuste global).
    """
    valid_km2, per_class = class_areas(analysis.classes, analysis.valid, bounds)
    changed_km2 = float(per_class[1:].sum())
    corr = analysis.hh.corr
    classes = [{'key': key, 'label': label, 'km2': round(float(per_class[i + 1]), 1),
                'pct': round(float(per_class[i + 1]) / valid_km2 * 100, 2) if valid_km2 else 0.0,
                'color': color} for i, (key, label, color) in enumerate(CLASSES)]
    return {
        'valid_km2': round(valid_km2, 1),
        'changed_km2': round(changed_km2, 1),
        'changed_pct': round(changed_km2 / valid_km2 * 100, 2) if valid_km2 else 0.0,
        'correlation': round(corr, 3) if corr is not None else None,
        'confidence': confidence(analysis.hh),
        'classes': classes,
        'hh': channel_stats(analysis.hh, analysis.valid),
        'hv': channel_stats(analysis.hv, analysis.valid) if analysis.dual else None,
    }


# ---------------------------------------------------------------- renderizado de capas

def _hex_rgb(color):
    return tuple(int(color[i:i + 2], 16) for i in (1, 3, 5))


def render_change(delta, valid):
    """Capa divergente RGBA: azules (disminución) y naranjas (aumento); lo estable queda transparente."""
    magnitude = np.abs(delta)
    t = np.clip(magnitude / DELTA_SATURATION_DB, 0, 1)
    negative = delta < 0
    out = np.empty(delta.shape + (4,), np.uint8)
    for k in range(3):
        neg = NEGATIVE_RAMP[0][k] + (NEGATIVE_RAMP[1][k] - NEGATIVE_RAMP[0][k]) * t
        pos = POSITIVE_RAMP[0][k] + (POSITIVE_RAMP[1][k] - POSITIVE_RAMP[0][k]) * t
        out[..., k] = np.where(negative, neg, pos).round().astype(np.uint8)
    alpha = np.clip((magnitude - 1) / 2, 0, 1) * 0.92
    alpha[~valid] = 0
    out[..., 3] = (alpha * 255).round().astype(np.uint8)
    return out


def render_classes(classes):
    """Capa RGBA con el color de cada clase (alfa 0,9); estable transparente."""
    palette = np.zeros((8, 4), np.uint8)
    for i, (_, _, color) in enumerate(CLASSES):
        palette[i + 1] = (*_hex_rgb(color), round(0.9 * 255))
    return palette[classes]


def render_rgb(rgb, mask):
    """RGB oficial con alfa 255 donde `mask` y 0 donde no hay dato."""
    return np.dstack([rgb, np.where(mask, 255, 0).astype(np.uint8)])


def render_composite(a, b):
    """R = HH después, G = B = HH antes; alfa 0 donde falta dato en cualquiera de las dos fechas."""
    mask = (a.max(axis=2) > 0) & (b.max(axis=2) > 0)
    return render_rgb(np.dstack([b[..., 0], a[..., 0], a[..., 0]]), mask)


def save_png(rgba, path):
    Image.fromarray(np.ascontiguousarray(rgba), 'RGBA').save(path, 'PNG', compress_level=2)


# ---------------------------------------------------------------- sondeo puntual

def probe_arrays(arrays, bounds, lon, lat, locate=None):
    """Valores en un punto a partir de los arreglos guardados. {'valid': False} si no hay dato.

    `locate(lon, lat, shape)` devuelve (columna, fila) o None; por defecto, la caja `bounds` del browse.
    """
    valid = arrays['valid']
    if locate is None:
        pixel = geo.point_to_pixel(lon, lat, bounds, valid.shape)
    else:
        pixel = locate(lon, lat, valid.shape)
    if pixel is None or not valid[pixel[1], pixel[0]]:
        return {'valid': False}
    col, row = pixel[0], pixel[1]
    index = int(arrays['classes'][row, col])
    key, label = (CLASSES[index - 1][:2]) if index else (None, None)

    def channel(prefix):
        if f'{prefix}_before' not in arrays:
            return None
        before = float(arrays[f'{prefix}_before'][row, col])
        after = float(arrays[f'{prefix}_after'][row, col])
        return {'before_db': round(before, 1), 'after_db': round(after, 1),
                'delta_db': round(after - before, 1)}

    return {'lon': lon, 'lat': lat, 'valid': True, 'class': key, 'label': label,
            'hh': channel('hh'), 'hv': channel('hv')}


# ---------------------------------------------------------------- orquestación y caché

def change_id(stack_id, before, after, aoi):
    """Identificador estable de 16 hex: pila, escenas concretas (por si cambia la calidad) y aoi."""
    texto = '|'.join([str(METHOD_VERSION), stack_id, before['id'], after['id'],
                      ','.join(f'{x:.5f}' for x in aoi) if aoi else 'full'])
    return sha1(texto.encode('utf-8')).hexdigest()[:16]


def _valid_id(change):
    if not (isinstance(change, str) and len(change) == 16 and all(c in '0123456789abcdef' for c in change)):
        raise InvalidInput('El identificador de cambio no es válido.')
    return change


def read_result(change):
    """result.json de un cambio ya calculado, o None."""
    ruta = config.DERIVED_DIR / _valid_id(change) / 'result.json'
    if not ruta.exists():
        return None
    resultado = json.loads(ruta.read_text(encoding='utf-8'))
    resultado.setdefault('source', 'browse')       # resultados guardados antes de existir el campo
    return resultado


@lru_cache(maxsize=2)
def _arrays(change, mtime):
    with np.load(config.DERIVED_DIR / change / 'arrays.npz') as paquete:
        return {k: paquete[k] for k in paquete.files}


def probe(change, lon, lat):
    """Valor en un punto de un cambio ya calculado. NotFound si el identificador no existe."""
    resultado = read_result(change)
    if resultado is None:
        raise NotFound('Ese cambio no está calculado; pídelo primero con /api/change.')
    ruta = config.DERIVED_DIR / change / 'arrays.npz'
    arreglos = _arrays(change, ruta.stat().st_mtime_ns)
    # lupa calibrada: la ventana vive en la proyección del producto, no en una caja lon/lat
    locate = geo.grid_locator(resultado['grid']) if 'grid' in resultado else None
    return probe_arrays(arreglos, resultado['bounds'], lon, lat, locate)


def store_result(change, construir):
    """Escribe un resultado de forma atómica en data/cache/derived/<id>/ y devuelve su result.json.

    `construir(temporal)` guarda las capas y el arrays.npz en la carpeta temporal y devuelve el dict
    del resultado. Si otro proceso ya dejó listo el mismo id, se usa ese.
    """
    destino = config.DERIVED_DIR / change
    temporal = config.DERIVED_DIR / f'{change}.tmp-{uuid.uuid4().hex[:8]}'
    temporal.mkdir(parents=True)
    try:
        resultado = construir(temporal)
        (temporal / 'result.json').write_text(json.dumps(resultado, ensure_ascii=False), encoding='utf-8')
        try:
            os.replace(temporal, destino)
        except OSError:                      # otro proceso lo dejó listo antes: se usa ese
            shutil.rmtree(temporal, ignore_errors=True)
    except BaseException:
        shutil.rmtree(temporal, ignore_errors=True)
        raise
    cache.prune_all()
    return read_result(change)


def _limitations(before, after, georef, dual, confidence_info):
    notas = [
        'Derivado de imágenes browse oficiales GCOV (brillo recortado entre los percentiles 5 y 95 de '
        'cada imagen, con gamma 0,5): los dB son aproximados, no γ⁰ calibrado.',
        'Se normaliza una fecha contra la otra con un ajuste sobre todo el cuadro: el método mide el cambio '
        'relativo al conjunto de la escena; una variación que afecte por igual a todo el cuadro '
        '(p. ej. humedad general tras lluvias) queda absorbida.',
        'Fuera del intervalo comparable el dato está censurado; en superficies muy oscuras o muy brillantes '
        'el cambio real puede ser mayor que el mostrado.',
        'Toda clase es una hipótesis («posible»), no un evento confirmado.',
    ]
    if confidence_info['level'] != 'alta':
        notas.append(f'Confianza {confidence_info["level"]}: ' + ' '.join(confidence_info['reasons']))
    if 'provisional' in (before['quality'], after['quality']):
        notas.append('Al menos una de las escenas tiene calidad provisional y puede cambiar al validarse.')
    if georef == 'footprint':
        notas.append('Georreferencia estimada por la huella del catálogo (error típico de 0,3 a 2,9 píxeles, '
                     'unos 0,5 km): no hay KML público para esta pila.')
    elif georef == 'stack-kml':
        notas.append('Georreferencia tomada del KML de otra escena de la misma pila (la cuadrícula es fija '
                     'dentro de una pila).')
    if not dual:
        notas.append('Polarización simple: no hay canal HV, así que no se distinguen cambios de vegetación.')
    return notas


def _id_lock(change):
    with _id_locks_guard:
        return _id_locks.setdefault(change, threading.Lock())


def _sources(before, after):
    """Descarga las dos imágenes en paralelo y devuelve las matrices RGB."""
    with ThreadPoolExecutor(max_workers=2) as pool:
        rutas = list(pool.map(browse.fetch_browse, [before['browse_url'], after['browse_url']]))
    return [browse.load_array(ruta, 'RGB') for ruta in rutas]


def require_analyzable(scene, label):
    if not scene['analyzable']:
        raise InvalidInput(
            f'La escena del {scene["date"]} ({label}) no es analizable: las escenas beta no tienen '
            'una cuadrícula comparable píxel a píxel. Elige una fecha provisional o validada.')


def validate_pair(before, after):
    """Reglas comunes a /api/change y /api/zoom: orden de fechas, escenas analizables y mismo modo."""
    if not before['date'] < after['date']:
        raise InvalidInput('La fecha «antes» debe ser anterior a la fecha «después».')
    require_analyzable(before, 'antes')
    require_analyzable(after, 'después')
    if before['mode'] != after['mode']:
        raise InvalidInput(
            f'Las escenas del {before["date"]} (modo {before["mode"]}) y del {after["date"]} '
            f'(modo {after["mode"]}) se adquirieron en modos distintos: compararlas produce franjas falsas. '
            'Elige dos fechas del mismo modo.')


def compute_change(stack, before, after, aoi=None):
    """Calcula (o lee de la caché) el cambio entre dos escenas de una pila; devuelve el JSON del contrato."""
    validate_pair(before, after)
    change = change_id(stack['id'], before, after, aoi)
    existente = read_result(change)
    if existente:
        return existente
    with _id_lock(change):
        existente = read_result(change)
        if existente:
            return existente
        with _compute_slots:
            return _compute(stack, before, after, aoi, change)


def _compute(stack, before, after, aoi, change):
    a, b = _sources(before, after)
    if a.shape != b.shape:
        raise InvalidInput('Las dos imágenes no tienen el mismo tamaño: no son comparables píxel a píxel.')
    dual = 'HV' in before['polarizations'] and 'HV' in after['polarizations']
    full = analyze(a, b, dual)
    union = (a.max(axis=2) > 0) | (b.max(axis=2) > 0)
    bbox, georef = browse.resolve_gcov_grid(stack, [before, after], union)
    window = geo.pixel_window(aoi, bbox, a.shape[:2]) if aoi else (0, 0, a.shape[1], a.shape[0])
    c0, r0, c1, r1 = window
    corte = (slice(r0, r1), slice(c0, c1))
    analysis = full.crop(window)
    a_w, b_w = a[corte], b[corte]
    bounds = geo.window_bounds(bbox, a.shape[:2], window)
    stats = compute_stats(analysis, bounds)

    def construir(temporal):
        save_png(render_rgb(a_w, a_w.max(axis=2) > 0), temporal / 'before.png')
        save_png(render_rgb(b_w, b_w.max(axis=2) > 0), temporal / 'after.png')
        save_png(render_change(analysis.hh.delta, analysis.valid), temporal / 'change_hh.png')
        if dual:
            save_png(render_change(analysis.hv.delta, analysis.valid), temporal / 'change_hv.png')
        save_png(render_classes(analysis.classes), temporal / 'classes.png')
        save_png(render_composite(a_w, b_w), temporal / 'composite.png')
        arreglos = {'valid': analysis.valid, 'classes': analysis.classes,
                    'hh_before': analysis.hh.before_db.astype(np.float16),
                    'hh_after': analysis.hh.after_db.astype(np.float16)}
        if dual:
            arreglos.update(hv_before=analysis.hv.before_db.astype(np.float16),
                            hv_after=analysis.hv.after_db.astype(np.float16))
        np.savez_compressed(temporal / 'arrays.npz', **arreglos)

        bounds_json = [round(x, 6) for x in bounds]
        base = f'/derived/{change}'
        return {
            'id': change,
            'stack': stack['id'],
            'source': 'browse',
            'before': scene_public(before),
            'after': scene_public(after),
            'days_between': (date.fromisoformat(after['date']) - date.fromisoformat(before['date'])).days,
            'dual_pol': dual,
            'georef': georef,
            'bounds': bounds_json,
            'coordinates': geo.corner_coordinates(bounds_json),
            'size': [int(c1 - c0), int(r1 - r0)],
            'layers': {name: (f'{base}/{name}.png' if name != 'change_hv' or dual else None)
                       for name in LAYER_NAMES},
            'stats': stats,
            'method': {
                'version': METHOD_VERSION,
                'formula': 'Δ ≈ 10·log10((q₂ + c)/(α·q₁ + β + c)), con q = ((ND − 1)/254)²',
                'c': C_OFFSET, 'threshold_db': THRESHOLD_DB, 'filter': 'media 5×5',
                'note': 'Derivado de imágenes browse oficiales GCOV con normalización relativa entre '
                        'fechas; dB aproximados, no γ⁰ calibrado.',
            },
            'limitations': _limitations(before, after, georef, dual, stats['confidence']),
        }

    return store_result(change, construir)
