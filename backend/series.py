"""Serie temporal de brillo en un punto y cuadros WebP para la animación."""
import json
import os
import uuid
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha1

import numpy as np
from PIL import Image

from . import browse, cache, change, config, geo
from .errors import InvalidInput

FRAME_MAX_SIDE = 1024
SERIES_DIR = config.DERIVED_DIR / 'series'


def sample_scenes(scenes, maximum):
    """Si hay más de `maximum` escenas, muestrea de forma uniforme conservando la primera y la última."""
    if len(scenes) <= maximum:
        return list(scenes)
    indices = sorted(set(np.round(np.linspace(0, len(scenes) - 1, maximum)).astype(int).tolist()))
    return [scenes[i] for i in indices]


def window_db(q, valid, pixel, radius):
    """10·log10(q + c) de la media de q en la ventana (2r+1)² del píxel, sobre píxeles válidos.

    Devuelve None si la ventana no tiene ningún píxel válido.
    """
    col, fila = pixel
    alto, ancho = q.shape
    corte = (slice(max(0, fila - radius), min(alto, fila + radius + 1)),
             slice(max(0, col - radius), min(ancho, col + radius + 1)))
    con_dato = valid[corte]
    if not con_dato.any():
        return None
    media = float(q[corte][con_dato].astype(np.float64).mean())
    return round(float(10 * np.log10(media + change.C_OFFSET)), 1)


def dominant_mode(escenas):
    """Modo de adquisición más frecuente; en empate, el de la escena más reciente."""
    cuenta = Counter(e['mode'] for e in escenas)
    mejor = max(cuenta.values())
    for escena in reversed(escenas):
        if cuenta[escena['mode']] == mejor:
            return escena['mode']


def normalized_q(rgb, referencia, canal):
    """(q' normalizada contra la referencia, máscara válida) para un canal de una fecha.

    q' = α·q + β recortada al intervalo comparable; la propia referencia no se transforma.
    """
    if rgb is referencia:
        valid = change.valid_mask(rgb, rgb)
        return change.q_channel(rgb[..., canal], valid), valid
    valid = change.valid_mask(rgb, referencia)
    qa = change.q_channel(rgb[..., canal], valid)
    qb = change.q_channel(referencia[..., canal], valid)
    alpha, beta, _, _ = change.fit_normalization(qa, qb, rgb[..., canal], referencia[..., canal], valid)
    lo, hi = change.comparable_range(alpha, beta)
    return np.clip(alpha * qa + beta, lo, hi), valid


def make_frame(rgb, window, path):
    """Escribe el cuadro como WebP con alfa (alfa 0 sin dato), recortado y de máximo 1024 px."""
    c0, r0, c1, r1 = window
    corte = rgb[r0:r1, c0:c1]
    rgba = np.dstack([corte, np.where(corte.max(axis=2) > 0, 255, 0).astype(np.uint8)])
    imagen = Image.fromarray(np.ascontiguousarray(rgba), 'RGBA')
    imagen.thumbnail((FRAME_MAX_SIDE, FRAME_MAX_SIDE), Image.LANCZOS)
    temporal = path.with_name(f'{path.stem}.{uuid.uuid4().hex[:8]}.part')
    try:
        imagen.save(temporal, 'WEBP', quality=80, method=4)
        os.replace(temporal, path)
    finally:
        temporal.unlink(missing_ok=True)


def _scene_shape(ruta):
    with Image.open(ruta) as imagen:
        return imagen.size[1], imagen.size[0]


def build_series(stack, lon, lat, maximum=12, radius=4, aoi=None):
    """Serie en un punto + cuadros de animación de una pila. Descarga con máximo 4 hilos."""
    candidatas = [e for e in stack['scenes'] if e['analyzable']]
    if not candidatas:
        raise InvalidInput(f'La pila {stack["id"]} no tiene escenas analizables.')
    modo = dominant_mode(candidatas)          # mezclar modos produce franjas falsas
    candidatas = [e for e in candidatas if e['mode'] == modo]
    escenas = sample_scenes(candidatas, maximum)

    with ThreadPoolExecutor(max_workers=4) as pool:
        rutas = list(pool.map(lambda e: browse.fetch_browse(e['browse_url']), escenas))

    formas = [_scene_shape(r) for r in rutas]
    forma, _ = Counter(formas).most_common(1)[0]
    omitidas = [{'date': e['date'], 'reason': 'Tamaño de imagen distinto al del resto de la pila.'}
                for e, f in zip(escenas, formas) if f != forma]
    elegidas = [(e, r) for e, r, f in zip(escenas, rutas, formas) if f == forma]

    referencia = browse.load_array(elegidas[0][1], 'RGB')   # solo para la georreferencia
    reciente = browse.load_array(elegidas[-1][1], 'RGB')    # escena contra la que se normaliza
    bbox, _ = browse.resolve_gcov_grid(stack, [], referencia.max(axis=2) > 0)
    pixel = geo.point_to_pixel(lon, lat, bbox, forma)
    if pixel is None:
        raise InvalidInput('El punto no está dentro del cuadro de esta pila.')
    ventana = geo.pixel_window(aoi, bbox, forma) if aoi else (0, 0, forma[1], forma[0])
    limites = geo.window_bounds(bbox, forma, ventana)

    clave = sha1('|'.join([stack['id'], ','.join(e['id'] for e, _ in elegidas),
                           ','.join(map(str, ventana)), str(FRAME_MAX_SIDE)]).encode()).hexdigest()[:12]
    carpeta = SERIES_DIR / clave
    carpeta.mkdir(parents=True, exist_ok=True)
    guardada = carpeta / f'serie_{pixel[0]}_{pixel[1]}_{radius}.json'
    if guardada.exists():                      # misma pila, ventana, punto y radio: respuesta inmediata
        os.utime(carpeta)                      # marca la carpeta como usada para la limpieza de caché
        return json.loads(guardada.read_text(encoding='utf-8'))

    def procesar(par):
        escena, ruta = par
        rgb = browse.load_array(ruta, 'RGB')
        archivo = carpeta / f'{escena["date"]}.webp'
        if not archivo.exists():
            make_frame(rgb, ventana, archivo)
        con_hv = 'HV' in escena['polarizations'] and 'HV' in elegidas[-1][0]['polarizations']
        valores = {}
        for nombre, canal in (('hh_db', 0), ('hv_db', 1)):
            if canal == 1 and not con_hv:
                valores[nombre] = None
                continue
            q, valid = normalized_q(rgb if escena is not elegidas[-1][0] else reciente, reciente, canal)
            valores[nombre] = window_db(q, valid, pixel, radius)
        return {
            'date': escena['date'], 'granule': escena['granule'], 'quality': escena['quality'], **valores,
        }, {'date': escena['date'], 'url': f'/derived/series/{clave}/{escena["date"]}.webp'}, con_hv

    with ThreadPoolExecutor(max_workers=4) as pool:
        salidas = list(pool.map(procesar, elegidas))

    respuesta = {
        'stack': stack['id'],
        'point': [lon, lat],
        'dual_pol': all(s[2] for s in salidas),
        'series': [s[0] for s in salidas],
        'bounds': [round(x, 6) for x in limites],
        'coordinates': geo.corner_coordinates([round(x, 6) for x in limites]),
        'frames': [s[1] for s in salidas],
    }
    if omitidas:
        respuesta['skipped'] = omitidas
    temporal = guardada.with_name(f'{guardada.stem}.{uuid.uuid4().hex[:8]}.part')
    temporal.write_text(json.dumps(respuesta, ensure_ascii=False), encoding='utf-8')
    os.replace(temporal, guardada)
    cache.prune_all()
    return respuesta
