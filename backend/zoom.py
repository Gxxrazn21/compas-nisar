"""Lupa calibrada: orquesta la lectura remota de dos GCOV, el cálculo, las capas y la caché en disco."""
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from hashlib import sha1

import h5py
import numpy as np

from . import change, config, gcov, geo, rangefile
from .catalog import scene_public
from .errors import InvalidInput, ServiceUnavailable, UpstreamError

METHOD_VERSION = 2            # súbelo si cambia el método: invalida los resultados en caché
POLARIZATIONS = (('HH', 'HHHH'), ('HV', 'HVHV'))

_slots = threading.Semaphore(1)     # una lupa a la vez: descarga y memoria son los cuellos de botella


class Scene:
    """Producto GCOV abierto: archivo remoto, handle h5py y cuadrícula. Se cierra con `close()`."""

    def __init__(self, url):
        self.raw = rangefile.RangeFile(url)
        try:
            self.h5 = h5py.File(self.raw, 'r')
            self.group = self.h5[gcov.GRUPO]
            self.grid = gcov.read_grid(self.group)
        except (OSError, KeyError):
            self.raw.close()
            raise UpstreamError('ASF devolvió un producto que h5py no pudo abrir como GCOV de NISAR.') from None
        except BaseException:
            self.raw.close()
            raise

    def close(self):
        try:
            self.h5.close()
        finally:
            self.raw.close()


def open_scene(url):
    """Punto único de apertura (las pruebas lo sustituyen por archivos locales)."""
    return Scene(url)


def zoom_id(stack_id, before, after, lon, lat, size_km):
    """Identificador de 16 hex que distingue lupa de browse y depende de escenas, punto y tamaño."""
    texto = '|'.join(['gcov', str(METHOD_VERSION), stack_id, before['id'], after['id'],
                      f'{lon:.5f}', f'{lat:.5f}', f'{size_km:g}'])
    return sha1(texto.encode('utf-8')).hexdigest()[:16]


def _open_both(urls):
    """Abre las dos escenas en paralelo; si una falla, cierra la otra y relanza el primer error."""
    with ThreadPoolExecutor(max_workers=2) as pool:
        futuros = [pool.submit(open_scene, url) for url in urls]
    abiertas, error = [], None
    for futuro in futuros:
        try:
            abiertas.append(futuro.result())
        except BaseException as fallo:
            error = error or fallo
    if error:
        for escena in abiertas:
            escena.close()
        raise error
    return abiertas


def _read_scene(scene, rows, cols, n, pols):
    """Precalienta en paralelo los bloques de la ventana y lee su promedio en potencia por polarización."""
    datasets = {pol: scene.group[nombre] for pol, nombre in POLARIZATIONS if pol in pols}
    scene.raw.prefetch([r for d in datasets.values() for r in gcov.chunk_ranges(d, rows, cols)])
    return {pol: gcov.read_power(d, rows, cols, n) for pol, d in datasets.items()}


def _limitations(before, after, dual, window, side_km):
    notas = [
        f'γ⁰ calibrado leído del producto GCOV de NISAR (10 m), promediado {window.n}×{window.n} en '
        f'potencia lineal: cada píxel mide {window.n * abs(window.step_x):g} m. Ventana de {side_km:.1f} km.',
        'Δ = 10·log10(P₂/P₁) sin normalización entre fechas: un cambio general de humedad o de rugosidad '
        'sí aparece, y el moteado (speckle) deja un ruido de pocos dB en píxeles individuales.',
        'Un píxel sin dato en cualquiera de las fechas o polarizaciones queda fuera del análisis.',
        'Toda clase es una hipótesis («posible»), no un evento confirmado.',
        'El área usa el paso de la proyección del producto; en proyecciones polares puede diferir un poco '
        'del área real sobre el terreno.',
    ]
    if 'provisional' in (before['quality'], after['quality']):
        notas.append('Al menos una de las escenas tiene calidad provisional y puede cambiar al validarse.')
    if not dual:
        notas.append('Polarización simple: no hay canal HV, así que no se distinguen cambios de vegetación.')
    return notas


def compute_zoom(stack, before, after, lon, lat, size_km):
    """Calcula (o lee de la caché) la lupa calibrada; devuelve el JSON del contrato de /api/zoom."""
    change.validate_pair(before, after)
    for escena in (before, after):
        if not escena.get('download_url'):
            raise InvalidInput(f'La escena del {escena["date"]} no tiene archivo .h5 en el catálogo.')
        rangefile.validate_h5_url(escena['download_url'])
    lon, lat = round(lon, 5), round(lat, 5)
    ident = zoom_id(stack['id'], before, after, lon, lat, size_km)
    existente = change.read_result(ident)
    if existente:
        return existente
    if not config.EARTHDATA_TOKEN:
        raise ServiceUnavailable('Falta EARTHDATA_TOKEN en .env: la lupa calibrada lee el producto GCOV '
                                 'completo de ASF y necesita un token de Earthdata Login '
                                 '(https://urs.earthdata.nasa.gov/profile → Generate Token).')
    with change._id_lock(ident):
        existente = change.read_result(ident)
        if existente:
            return existente
        with _slots:
            return _compute(stack, before, after, lon, lat, size_km, ident)


def _compute(stack, before, after, lon, lat, size_km, ident):
    inicio = time.perf_counter()
    dual = 'HV' in before['polarizations'] and 'HV' in after['polarizations']
    pols = ('HH', 'HV') if dual else ('HH',)
    escenas = []
    try:
        escenas = _open_both([before['download_url'], after['download_url']])
        antes, despues = escenas              # «antes» fija la cuadrícula de referencia
        epsg = antes.grid.epsg
        cx, cy = geo.transformer(epsg, False).transform(lon, lat)
        window = gcov.plan_window(antes.grid, despues.grid, cx, cy, size_km)
        ventanas = [(window.rows, window.cols), (window.rows_b(), window.cols_b())]
        with ThreadPoolExecutor(max_workers=2) as pool:
            potencias = list(pool.map(lambda par: _read_scene(par[0], par[1][0], par[1][1], window.n, pols),
                                      zip(escenas, ventanas)))
        peticiones = sum(s.raw.requests for s in escenas)
        megabytes = sum(s.raw.bytes for s in escenas) / 1e6
    except KeyError:
        raise UpstreamError('El producto GCOV no tiene los datasets esperados (HHHH/HVHV).') from None
    except OSError:      # h5py convierte en OSError cualquier fallo de lectura del archivo remoto
        raise UpstreamError('Se interrumpió la lectura del producto GCOV en ASF. Reintenta en unos momentos.'
                            ) from None
    finally:
        for abierta in escenas:
            abierta.close()
    analysis = gcov.analyze(potencias[0]['HH'], potencias[1]['HH'],
                            potencias[0].get('HV'), potencias[1].get('HV'))
    grid, esquinas, bounds = gcov.window_geometry(window, epsg)
    alto, ancho = window.shape
    pixel_m = window.n * abs(window.step_x)
    stats = gcov.compute_stats(analysis, pixel_m)
    segundos = round(time.perf_counter() - inicio, 1)

    def construir(temporal):
        capas = gcov.render_layers(analysis)
        for nombre, rgba in capas.items():
            if rgba is not None:
                change.save_png(rgba, temporal / f'{nombre}.png')
        np.savez_compressed(temporal / 'arrays.npz', **gcov.arrays_for_probe(analysis))
        base = f'/derived/{ident}'
        return {
            'id': ident,
            'stack': stack['id'],
            'source': 'gcov',
            'before': scene_public(before),
            'after': scene_public(after),
            'days_between': (date.fromisoformat(after['date']) - date.fromisoformat(before['date'])).days,
            'dual_pol': dual,
            'georef': 'product',
            'resolution_m': pixel_m,
            'bounds': bounds,
            'coordinates': esquinas,
            'size': [int(ancho), int(alto)],
            'layers': {nombre: (f'{base}/{nombre}.png' if capas[nombre] is not None else None)
                       for nombre in change.LAYER_NAMES},
            'stats': stats,
            'method': {'version': f'gcov-{METHOD_VERSION}', 'formula': 'Δ dB = 10·log10(γ⁰₂/γ⁰₁)',
                       'threshold_db': change.THRESHOLD_DB,
                       'filter': f'promedio {window.n}×{window.n} en potencia y media {gcov.SMOOTH_SIZE}×{gcov.SMOOTH_SIZE} antes del cociente',
                       'dark_db': gcov.DARK_DB,
                       'note': 'γ⁰ calibrado leído del producto GCOV de NISAR.'},
            'limitations': _limitations(before, after, dual, window, size_km),
            'grid': grid,
            'download': {'mb': round(megabytes, 1), 'requests': peticiones, 'seconds': segundos},
        }

    return change.store_result(ident, construir)
