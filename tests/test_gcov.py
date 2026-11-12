"""Pruebas de la lupa calibrada sin red: HDF5 locales pequeños y transporte httpx simulado."""
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import h5py
import httpx
import numpy as np
from fastapi.testclient import TestClient

from backend import cache, catalog, change, config, gcov, geo, rangefile, zoom
from backend.errors import InvalidInput, ServiceUnavailable, UpstreamError
from backend.main import app

LON, LAT = -74.85, 8.72
EPSG = 32618
URL_A = 'https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_V1/G_A/G_A.h5'
URL_B = 'https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_V1/G_B/G_B.h5'
TOKEN_FALSO = 'token-secreto-de-prueba'


def centro():
    return geo.transformer(EPSG, False).transform(LON, LAT)


def crear_h5(ruta, x0, y0, forma, hh, hv=None, epsg=EPSG, paso=10.0, chunks=(8, 8)):
    """HDF5 con la estructura de un GCOV: HHHH/HVHV, coordenadas y projection con epsg_code."""
    alto, ancho = forma
    with h5py.File(ruta, 'w') as f:
        g = f.create_group(gcov.GRUPO)
        g.create_dataset('HHHH', data=hh.astype(np.float32), chunks=chunks, compression='gzip')
        if hv is not None:
            g.create_dataset('HVHV', data=hv.astype(np.float32), chunks=chunks, compression='gzip')
        g.create_dataset('xCoordinates', data=x0 + paso * np.arange(ancho))
        g.create_dataset('yCoordinates', data=y0 - paso * np.arange(alto))
        proyeccion = g.create_dataset('projection', data=np.uint32(epsg))
        proyeccion.attrs['epsg_code'] = np.uint32(epsg)


def grid(x0, y0, forma=(100, 100), epsg=EPSG, paso=10.0):
    return gcov.Grid(epsg, x0 + paso * np.arange(forma[1]), y0 - paso * np.arange(forma[0]))


class VentanaTests(unittest.TestCase):
    def test_ventana_centrada_y_multiplo_de_n(self):
        cx, cy = 500000.0, 1000000.0
        g = grid(cx - 5000, cy + 5000, (1000, 1000))
        w = gcov.plan_window(g, g, cx, cy, 3.0)              # 300 px, N = 3
        self.assertEqual(w.n, 3)
        self.assertEqual(w.shape, (100, 100))
        self.assertEqual(w.cols[1] - w.cols[0], 300)
        # el centro cae en el centro de la ventana (±1 píxel)
        self.assertAlmostEqual((w.cols[0] + w.cols[1]) / 2, 500, delta=1)
        self.assertAlmostEqual((w.rows[0] + w.rows[1]) / 2, 500, delta=1)
        # el borde izquierdo es el borde (no el centro) del primer píxel
        self.assertAlmostEqual(w.x0, g.x[w.cols[0]] - 5.0)
        self.assertAlmostEqual(w.y0, g.y[w.rows[0]] + 5.0)

    def test_origenes_distintos_entre_fechas(self):
        cx, cy = 500000.0, 1000000.0
        a = grid(cx - 5000, cy + 5000, (1000, 1000))
        b = grid(cx - 5000 + 70, cy + 5000 - 40, (1000, 1000))     # B arranca 7 col. a la derecha, 4 filas abajo
        w = gcov.plan_window(a, b, cx, cy, 3.0)
        self.assertEqual((w.off_col, w.off_row), (-7, -4))           # índice B = índice A + off
        c0b, _ = w.cols_b()
        f0b, _ = w.rows_b()
        self.assertAlmostEqual(b.x[c0b], a.x[w.cols[0]])            # mismo punto del terreno
        self.assertAlmostEqual(b.y[f0b], a.y[w.rows[0]])

    def test_recorte_a_la_interseccion(self):
        cx, cy = 500000.0, 1000000.0
        a = grid(cx - 500, cy + 500, (100, 100))                     # el producto solo cubre 1 km
        b = grid(cx - 500 + 200, cy + 500, (100, 100))               # B desplazado 20 columnas
        w = gcov.plan_window(a, b, cx, cy, 3.0)
        self.assertLessEqual(w.cols[1], 100)
        self.assertGreaterEqual(w.cols[0], 20)                       # no sale de B
        self.assertEqual((w.cols[1] - w.cols[0]) % w.n, 0)

    def test_errores_de_cuadricula(self):
        cx, cy = 500000.0, 1000000.0
        a = grid(cx - 500, cy + 500)
        with self.assertRaisesRegex(InvalidInput, 'proyecciones distintas'):
            gcov.plan_window(a, grid(cx - 500, cy + 500, epsg=32619), cx, cy, 0.5)
        with self.assertRaisesRegex(InvalidInput, 'tamaño de píxel'):
            gcov.plan_window(a, grid(cx - 500, cy + 500, paso=20.0), cx, cy, 0.5)
        with self.assertRaisesRegex(InvalidInput, 'no coinciden'):
            gcov.plan_window(a, grid(cx - 500 + 3.0, cy + 500), cx, cy, 0.5)      # medio píxel de desfase
        with self.assertRaisesRegex(InvalidInput, 'fuera de la cobertura'):
            gcov.plan_window(a, a, cx + 50000, cy, 0.5)                          # punto lejos del producto
        b = grid(cx + 20000, cy + 500)                                           # sin intersección
        with self.assertRaisesRegex(InvalidInput, 'fuera de la cobertura'):
            gcov.plan_window(a, b, cx, cy, 0.5)

    def test_factor_de_promedio(self):
        self.assertEqual(gcov.averaging_factor(500), 3)
        self.assertEqual(gcov.averaging_factor(3000), 3)
        self.assertEqual(gcov.averaging_factor(4600), 4)

    def test_esquinas_lonlat_orden_y_centro(self):
        cx, cy = centro()
        g = grid(cx - 5000, cy + 5000, (1000, 1000))
        w = gcov.plan_window(g, g, cx, cy, 6.0)
        info, esquinas, bounds = gcov.window_geometry(w, EPSG)
        no, ne, se, so = esquinas
        self.assertLess(no[0], ne[0])
        self.assertGreater(no[1], so[1])
        self.assertAlmostEqual(np.mean([c[0] for c in esquinas]), LON, delta=0.002)
        self.assertAlmostEqual(np.mean([c[1] for c in esquinas]), LAT, delta=0.002)
        self.assertEqual(bounds, [min(c[0] for c in esquinas), min(c[1] for c in esquinas),
                                  max(c[0] for c in esquinas), max(c[1] for c in esquinas)])
        self.assertEqual(info['epsg'], EPSG)
        # ~6 km de lado: 0,054° de latitud ≈ 6 km
        self.assertAlmostEqual(no[1] - so[1], 6.0 / 110.57, delta=0.002)

    def test_localizador_ida_y_vuelta(self):
        cx, cy = centro()
        g = grid(cx - 2000, cy + 2000, (400, 400))
        w = gcov.plan_window(g, g, cx, cy, 3.0)
        info, _, _ = gcov.window_geometry(w, EPSG)
        locate = geo.grid_locator(info)
        alto, ancho = w.shape
        col, fila = locate(LON, LAT, (alto, ancho))
        self.assertAlmostEqual(col, ancho / 2, delta=1)
        self.assertAlmostEqual(fila, alto / 2, delta=1)
        self.assertIsNone(locate(LON + 1, LAT, (alto, ancho)))


class MatematicaTests(unittest.TestCase):
    def test_promedio_en_potencia_ignora_invalidos(self):
        v = np.array([[1, 3, np.nan, 0],
                      [5, -2, np.inf, np.nan],
                      [2, 2, 2, 2],
                      [2, 2, 2, 2]], np.float32)
        p = gcov.block_mean_power(v, 2)
        self.assertAlmostEqual(float(p[0, 0]), 3.0)       # (1 + 3 + 5)/3: el −2 se ignora
        self.assertTrue(np.isnan(p[0, 1]))                # nada válido: NaN, no 0
        self.assertAlmostEqual(float(p[1, 0]), 2.0)

    def test_delta_y_clases_con_valores_fisicos(self):
        n = 8
        base = np.full((n, n), 0.1, np.float32)                     # −10 dB
        antes, despues = base.copy(), base.copy()
        despues[:, :4] = 0.01                                        # −20 dB: baja 10 dB y queda oscuro
        antes[:, 4:] = 0.001                                         # −30 dB (oscuro antes)
        despues[:, 4:] = 0.2                                         # sube 23 dB desde oscuro
        hv_a, hv_d = np.full((n, n), 0.01, np.float32), np.full((n, n), 0.01, np.float32)
        a = gcov.analyze(antes, despues, hv_a, hv_d)
        self.assertAlmostEqual(float(a.delta_hh[0, 0]), -10.0, places=4)
        claves = [c[0] for c in change.CLASSES]
        self.assertEqual(claves[a.classes[4, 1] - 1], 'agua_nueva')
        self.assertEqual(claves[a.classes[4, 6] - 1], 'agua_retirada')
        # Δ de +3,01 dB sin HV de cambio y HH antes claro: vegetación inundada (dual)
        despues2 = np.full((n, n), 0.2, np.float32)
        b = gcov.analyze(base, despues2, hv_a, hv_d)
        self.assertAlmostEqual(float(b.delta_hh[3, 3]), 3.0103, places=3)
        self.assertEqual(claves[b.classes[3, 3] - 1], 'veg_inundada')
        # en polarización simple pasa a «aumento de retorno»
        c = gcov.analyze(base, despues2)
        self.assertEqual(claves[c.classes[3, 3] - 1], 'aumento')
        # un cambio de 2 dB no llega al umbral
        d = gcov.analyze(base, np.full((n, n), 0.16, np.float32))
        self.assertTrue((d.classes == 0).all())

    def test_sin_pixeles_validos(self):
        nan = np.full((4, 4), np.nan, np.float32)
        with self.assertRaises(InvalidInput):
            gcov.analyze(nan, nan)

    def test_estadisticas(self):
        n = 10
        antes = np.full((n, n), 0.1, np.float32)
        despues = antes.copy()
        despues[:, :5] = 0.001                                       # mitad: −20 dB → agua nueva
        antes[0, 0] = np.nan                                         # un píxel sin dato
        a = gcov.analyze(antes, despues)
        s = gcov.compute_stats(a, 30.0)
        self.assertAlmostEqual(s['valid_km2'], 99 * 0.0009, places=1)
        self.assertAlmostEqual(s['changed_km2'], 49 * 0.0009, places=1)
        agua = next(c for c in s['classes'] if c['key'] == 'agua_nueva')
        self.assertEqual(len(s['classes']), 7)
        self.assertEqual([c['color'] for c in s['classes']], [c[2] for c in change.CLASSES])
        self.assertGreater(agua['pct'], 45)
        self.assertEqual(s['confidence']['level'], 'alta')
        self.assertIsNone(s['hv'])
        hh = s['hh']
        self.assertEqual(hh['median_before_db'], -10.0)
        self.assertEqual(hh['hist']['edges'][0], -10.0)
        self.assertEqual(sum(hh['hist']['counts']), 99)

    def test_confianza_media_con_poca_cobertura(self):
        antes = np.full((10, 10), np.nan, np.float32)
        antes[:3] = 0.1
        s = gcov.compute_stats(gcov.analyze(antes, antes * 2), 30.0)
        self.assertEqual(s['confidence']['level'], 'media')

    def test_capas_y_estiramiento_fijo(self):
        self.assertEqual(int(gcov.stretch(np.array([-25.0]), gcov.STRETCH_HH)[0]), 0)
        self.assertEqual(int(gcov.stretch(np.array([0.0]), gcov.STRETCH_HH)[0]), 255)
        self.assertEqual(int(gcov.stretch(np.array([-7.0]), gcov.STRETCH_HV)[0]), 255)
        a = gcov.analyze(np.full((6, 6), 0.1, np.float32), np.full((6, 6), 0.2, np.float32),
                         np.full((6, 6), 0.01, np.float32), np.full((6, 6), 0.01, np.float32))
        capas = gcov.render_layers(a)
        self.assertEqual(set(capas), set(change.LAYER_NAMES))
        for rgba in capas.values():
            self.assertEqual(rgba.shape, (6, 6, 4))
        self.assertEqual(int(capas['before'][0, 0, 3]), 255)
        simple = gcov.analyze(np.full((6, 6), 0.1, np.float32), np.full((6, 6), 0.2, np.float32))
        sin_hv = gcov.render_layers(simple)
        self.assertIsNone(sin_hv['change_hv'])


def servir_bytes(contenido, consultas, estado=None):
    """Transporte simulado: ASF (con token) redirige a una URL firmada; la firmada sirve rangos.

    `estado['asf_da']` es la firma que entrega ASF y `estado['vigente']` la única que acepta el CDN
    (cualquier otra → 403, como una firma caducada).
    """
    estado = estado if estado is not None else {}
    estado.setdefault('asf_da', 'uno')
    estado.setdefault('vigente', 'uno')

    def manejar(peticion):
        consultas.append(peticion)
        if peticion.url.host == config.BROWSE_HOST:
            if peticion.headers.get('authorization') != f'Bearer {TOKEN_FALSO}':
                return httpx.Response(401)
            destino = f'https://d111.cloudfront.net/firmada?sig={estado["asf_da"]}'
            return httpx.Response(303, headers={'location': destino})
        if f'sig={estado["vigente"]}' not in str(peticion.url):
            return httpx.Response(403)
        rango = peticion.headers['range'].split('=')[1]
        inicio, fin = (int(x) for x in rango.split('-'))
        fin = min(fin, len(contenido) - 1)
        return httpx.Response(206, content=contenido[inicio:fin + 1],
                              headers={'content-range': f'bytes {inicio}-{fin}/{len(contenido)}'})

    return httpx.MockTransport(manejar)


class ArchivoPorRangosTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        rng = np.random.default_rng(3)
        cls.hh = rng.gamma(4, 0.025, (64, 64)).astype(np.float32)
        cls.ruta = Path(cls.tmp.name) / 'a.h5'
        crear_h5(cls.ruta, 500000.0, 1000000.0, (64, 64), cls.hh, chunks=(16, 16))
        cls.bytes = cls.ruta.read_bytes()

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def abrir(self, estado=None):
        consultas = []
        raw = rangefile.RangeFile(URL_A, token=TOKEN_FALSO,
                                  transport=servir_bytes(self.bytes, consultas, estado), block=4096)
        return raw, consultas

    def test_cabecera_authorization_solo_va_a_asf(self):
        raw, consultas = self.abrir()
        with h5py.File(raw, 'r') as f:
            np.testing.assert_allclose(f[gcov.GRUPO]['HHHH'][10:30, 5:40], self.hh[10:30, 5:40])
        self.assertGreater(len(consultas), 3)
        for peticion in consultas:
            if peticion.url.host == config.BROWSE_HOST:
                self.assertEqual(peticion.headers['authorization'], f'Bearer {TOKEN_FALSO}')
            else:
                self.assertEqual(peticion.url.host, 'd111.cloudfront.net')
                self.assertNotIn('authorization', peticion.headers)
            self.assertNotIn(TOKEN_FALSO, str(peticion.url))
        raw.close()

    def test_precalentamiento_reduce_peticiones_y_lee_igual(self):
        raw, consultas = self.abrir()
        with h5py.File(raw, 'r') as f:
            d = f[gcov.GRUPO]['HHHH']
            rangos = gcov.chunk_ranges(d, (10, 40), (5, 50))
            self.assertEqual(len(rangos), 3 * 4)                  # bloques de 16: filas 0, 16 y 32; columnas 0 a 48
            antes = raw.requests
            raw.prefetch(rangos)
            descargadas = raw.requests - antes
            self.assertGreater(descargadas, 0)
            antes = raw.requests
            ventana = d[10:40, 5:50]
            self.assertEqual(raw.requests, antes)                 # ya estaba todo en la caché
            np.testing.assert_allclose(ventana, self.hh[10:40, 5:50])
        raw.close()

    def test_403_firma_de_nuevo(self):
        estado = {}
        raw, consultas = self.abrir(estado)
        estado.update(asf_da='dos', vigente='dos')                 # la primera firma caducó
        base = len(consultas)
        datos = raw._get_range(0, 99)
        self.assertEqual(datos, self.bytes[:100])
        self.assertTrue(any('sig=dos' in str(p.url) for p in consultas[base:]))
        raw.close()

    def test_token_rechazado_en_la_firma(self):
        with self.assertRaises(UpstreamError) as ctx:
            rangefile.RangeFile(URL_A, token='otro', transport=servir_bytes(self.bytes, []))
        self.assertIn('Inicia sesión', ctx.exception.detail)
        self.assertNotIn('otro', ctx.exception.detail)

    def test_red_que_cae_con_el_archivo_abierto_es_502(self):
        """Fallo de red a mitad de la lectura: h5py lo vuelve OSError y la lupa debe responder 502."""
        cx, cy = centro()
        ruta = Path(self.tmp.name) / 'centrado.h5'
        crear_h5(ruta, cx - 320, cy + 320, (64, 64), self.hh, self.hh, chunks=(16, 16))
        contenido = ruta.read_bytes()
        consultas, estado = [], {'cae': False}
        servir = servir_bytes(contenido, consultas)

        def transporte(peticion):
            if estado['cae']:
                raise httpx.ConnectError('sin red')
            return servir.handle_request(peticion)

        class Remota:
            def __init__(inner):
                inner.raw = rangefile.RangeFile(URL_A, token=TOKEN_FALSO, block=512,
                                                transport=httpx.MockTransport(transporte))
                inner.h5 = h5py.File(inner.raw, 'r')
                inner.group = inner.h5[gcov.GRUPO]
                inner.grid = gcov.read_grid(inner.group)
                estado['cae'] = True                       # el archivo ya está abierto: se corta la red

            def close(inner):
                inner.h5.close()
                inner.raw.close()

        escena = LupaCompletaTests.escena
        with mock.patch.object(config, 'EARTHDATA_TOKEN', TOKEN_FALSO),                 mock.patch.object(zoom, 'open_scene', lambda url: Remota()),                 mock.patch.object(rangefile.time, 'sleep', lambda s: None):
            with self.assertRaises(UpstreamError) as ctx:
                zoom.compute_zoom({'id': 's'}, escena('2026-06-26', URL_A), escena('2026-10-24', URL_B),
                                  LON, LAT, 0.3)
        self.assertNotIn(TOKEN_FALSO, ctx.exception.detail)
        self.assertNotIn('cloudfront', ctx.exception.detail)

    def test_red_caida_es_502(self):
        def caido(_peticion):
            raise httpx.ConnectError('sin red')
        with self.assertRaises(UpstreamError):
            rangefile.RangeFile(URL_A, token=TOKEN_FALSO, transport=httpx.MockTransport(caido))

    def test_sin_token_503_y_cache_acotada(self):
        with mock.patch.object(config, 'EARTHDATA_TOKEN', ''):
            with self.assertRaises(ServiceUnavailable) as ctx:
                rangefile.RangeFile(URL_A)
        self.assertIn('Falta EARTHDATA_TOKEN en .env', ctx.exception.detail)
        consultas = []
        raw = rangefile.RangeFile(URL_A, token=TOKEN_FALSO, transport=servir_bytes(self.bytes, consultas),
                                  block=1024, cache_bytes=4096)
        raw.prefetch([(0, len(self.bytes))])
        self.assertLessEqual(raw._cache_size, 4096 + 1024)
        raw.close()

    def test_validacion_de_url_h5(self):
        malas = ['http://nisar.asf.earthdatacloud.nasa.gov/a.h5', 'https://otro.host/a.h5',
                 'https://user:clave@nisar.asf.earthdatacloud.nasa.gov/a.h5',
                 'https://nisar.asf.earthdatacloud.nasa.gov:8443/a.h5',
                 'https://nisar.asf.earthdatacloud.nasa.gov/a.png', '', None,
                 'https://nisar.asf.earthdatacloud.nasa.gov.evil.com/a.h5']
        for url in malas:
            with self.assertRaises(InvalidInput, msg=url):
                rangefile.validate_h5_url(url)
        self.assertEqual(rangefile.validate_h5_url(URL_A), URL_A)
        self.assertEqual(rangefile.validate_h5_url(URL_A.replace('.h5', '.H5')), URL_A.replace('.h5', '.H5'))


class LupaCompletaTests(unittest.TestCase):
    """Orquestación completa con HDF5 locales en lugar de ASF."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        cx, cy = centro()
        rng = np.random.default_rng(5)
        forma = (200, 200)
        hh = rng.gamma(30, 0.1 / 30, forma).astype(np.float32)        # ~ −10 dB con poco moteado
        hv = rng.gamma(30, 0.01 / 30, forma).astype(np.float32)
        despues = hh.copy()
        despues[:, :100] = 0.002                                      # mitad izquierda: agua nueva
        despues[0, 0] = np.nan
        # B arranca 3 columnas a la derecha y 2 filas abajo: orígenes distintos
        crear_h5(self.dir / 'a.h5', cx - 1000, cy + 1000, forma, hh, hv)
        crear_h5(self.dir / 'b.h5', cx - 1000 + 30, cy + 1000 - 20, forma, np.roll(despues, 0, 1), hv)
        self.abiertas = []
        parches = [mock.patch.object(config, 'DERIVED_DIR', self.dir / 'derived'),
                   mock.patch.object(config, 'EARTHDATA_TOKEN', TOKEN_FALSO),
                   mock.patch.object(cache, 'prune_all', lambda: 0),
                   mock.patch.object(zoom, 'open_scene', self.abrir_local)]
        (self.dir / 'derived').mkdir()
        for p in parches:
            p.start()
            self.addCleanup(p.stop)
        self.addCleanup(self.tmp.cleanup)
        self.pila = {'id': '011_D_084'}
        self.antes = self.escena('2026-06-26', URL_A)
        self.despues = self.escena('2026-10-24', URL_B)

    @staticmethod
    def escena(fecha, url):
        return {'id': fecha, 'granule': 'G', 'date': fecha, 'datetime': fecha + 'T00:00:00Z', 'cycle': 1,
                'mode': '4005_DHDH', 'collection': 'NISAR_L2_GCOV_V1', 'quality': 'validated',
                'analyzable': True, 'polarizations': ['HH', 'HV'], 'download_url': url, 'browse_url': None,
                'thumbnail_url': None, 'kml_url': None}

    def abrir_local(self, url):
        archivo = self.dir / ('a.h5' if url == URL_A else 'b.h5')

        class Local:
            raw = mock.Mock(requests=1, bytes=1000, prefetch=lambda rangos: None)

            def __init__(self):
                self.h5 = h5py.File(archivo, 'r')
                self.group = self.h5[gcov.GRUPO]
                self.grid = gcov.read_grid(self.group)

            def close(self):
                self.h5.close()

        self.abiertas.append(url)
        return Local()

    def test_pipeline_completo_probe_y_cache(self):
        r = zoom.compute_zoom(self.pila, self.antes, self.despues, LON, LAT, 1.2)
        self.assertEqual(r['source'], 'gcov')
        self.assertEqual(r['georef'], 'product')
        self.assertEqual(r['resolution_m'], 30.0)
        self.assertEqual(r['method']['version'], 'gcov-2')
        self.assertEqual(r['size'], [40, 40])                       # 120 px / 3
        self.assertEqual(len(r['coordinates']), 4)
        carpeta = config.DERIVED_DIR / r['id']
        for nombre in ('before', 'after', 'change_hh', 'change_hv', 'classes', 'composite'):
            self.assertTrue((carpeta / f'{nombre}.png').exists(), nombre)
        self.assertTrue((carpeta / 'arrays.npz').exists())
        self.assertNotIn(TOKEN_FALSO, (carpeta / 'result.json').read_text(encoding='utf-8'))
        agua = next(c for c in r['stats']['classes'] if c['key'] == 'agua_nueva')
        self.assertGreater(agua['km2'], 0.3)
        # caché: no vuelve a abrir los archivos
        abiertas = len(self.abiertas)
        self.assertEqual(zoom.compute_zoom(self.pila, self.antes, self.despues, LON, LAT, 1.2)['id'], r['id'])
        self.assertEqual(len(self.abiertas), abiertas)
        # sonda sobre la mitad que pasó a agua (oeste del centro) y sobre la estable (este)
        oeste = change.probe(r['id'], LON - 0.003, LAT)
        self.assertTrue(oeste['valid'])
        self.assertEqual(oeste['class'], 'agua_nueva')
        self.assertAlmostEqual(oeste['hh']['before_db'], -10.0, delta=1.0)
        self.assertAlmostEqual(oeste['hh']['after_db'], -27.0, delta=0.2)
        este = change.probe(r['id'], LON + 0.003, LAT)
        self.assertTrue(este['valid'])
        self.assertIsNone(este['class'])
        self.assertEqual(change.probe(r['id'], LON + 1, LAT), {'valid': False})

    def test_id_distingue_lupa_de_browse_y_depende_de_punto_y_tamano(self):
        base = zoom.zoom_id('s', self.antes, self.despues, LON, LAT, 15)
        self.assertNotEqual(base, change.change_id('s', self.antes, self.despues, None))
        self.assertNotEqual(base, zoom.zoom_id('s', self.antes, self.despues, LON + 0.001, LAT, 15))
        self.assertNotEqual(base, zoom.zoom_id('s', self.antes, self.despues, LON, LAT, 10))
        self.assertEqual(len(base), 16)

    def test_reglas_de_fechas_y_modo(self):
        with self.assertRaises(InvalidInput):
            zoom.compute_zoom(self.pila, self.despues, self.antes, LON, LAT, 1.2)
        otro = dict(self.despues, mode='2005_QPDH')
        with self.assertRaises(InvalidInput):
            zoom.compute_zoom(self.pila, self.antes, otro, LON, LAT, 1.2)
        mala = dict(self.despues, download_url='https://evil.example/x.h5')
        with self.assertRaises(InvalidInput):
            zoom.compute_zoom(self.pila, self.antes, mala, LON, LAT, 1.2)

    def test_punto_fuera_del_producto_es_422(self):
        with self.assertRaises(InvalidInput):
            zoom.compute_zoom(self.pila, self.antes, self.despues, LON + 1.0, LAT, 1.2)


class EndpointTests(unittest.TestCase):
    def setUp(self):
        self.cliente = TestClient(app)

    def test_health_informa_earthdata(self):
        with mock.patch.object(config, 'EARTHDATA_TOKEN', 'x'):
            self.assertTrue(self.cliente.get('/api/health').json()['earthdata'])
        with mock.patch.object(config, 'EARTHDATA_TOKEN', ''):
            self.assertFalse(self.cliente.get('/api/health').json()['earthdata'])

    def test_zoom_sin_token_503_y_validaciones(self):
        pila = {'id': '011_D_084', 'first': '2026-06-26', 'last': '2026-10-24',
                'scenes': [LupaCompletaTests.escena('2026-06-26', URL_A),
                           LupaCompletaTests.escena('2026-10-24', URL_B)]}
        params = dict(stack='011_D_084', before='2026-06-26', after='2026-10-24', lon=LON, lat=LAT)
        with mock.patch.object(catalog, 'get_stack', return_value=pila), \
                mock.patch.object(config, 'EARTHDATA_TOKEN', ''):
            r = self.cliente.get('/api/zoom', params=params)
            self.assertEqual(r.status_code, 503)
            self.assertIn('Falta EARTHDATA_TOKEN en .env', r.json()['detail'])
            invertidas = {'before': '2026-10-24', 'after': '2026-06-26'}
            for malo in ({'size_km': 4}, {'size_km': 31}, {'size_km': 'nan'}, invertidas):
                self.assertEqual(self.cliente.get('/api/zoom', params={**params, **malo}).status_code, 422, malo)
            self.assertEqual(self.cliente.get('/api/zoom', params={**params, 'lon': 200}).status_code, 422)

    def test_resultado_antiguo_de_browse_recibe_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            carpeta = Path(tmp) / 'abcdef0123456789'
            carpeta.mkdir()
            (carpeta / 'result.json').write_text('{"id": "abcdef0123456789"}', encoding='utf-8')
            with mock.patch.object(config, 'DERIVED_DIR', Path(tmp)):
                self.assertEqual(change.read_result('abcdef0123456789')['source'], 'browse')


if __name__ == '__main__':
    unittest.main()
