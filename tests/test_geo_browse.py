import unittest

import numpy as np

from backend import browse, geo
from backend.errors import InvalidInput
from tests.helpers import cargar_texto


class KmlYHuellaTests(unittest.TestCase):
    def test_lee_kml_real(self):
        w, s, e, n = geo.parse_kml(cargar_texto('latlon.kml'))
        self.assertAlmostEqual(w, -76.712688, 5)
        self.assertAlmostEqual(s, 7.363793, 5)
        self.assertAlmostEqual(e, -73.628927, 5)
        self.assertAlmostEqual(n, 10.362750, 5)

    def test_kml_invalido(self):
        for texto in ('', '<kml></kml>', '<coordinates>1,2 3,4</coordinates>'):
            with self.assertRaises(ValueError):
                geo.parse_kml(texto)

    def test_ajuste_por_huella_recupera_la_caja(self):
        # Imagen de 100 filas x 200 columnas cuya caja real es (10, 20, 30, 40).
        real = (10.0, 20.0, 30.0, 40.0)
        valid = np.zeros((100, 200), bool)
        valid[10:90, 30:170] = True     # píxeles válidos: columnas 30..170, filas 10..90
        paso_x, paso_y = 20 / 200, 20 / 100
        huella = (real[0] + 30 * paso_x, real[3] - 90 * paso_y,
                  real[0] + 170 * paso_x, real[3] - 10 * paso_y)
        for obtenido, esperado in zip(geo.fit_footprint(valid, huella), real):
            self.assertAlmostEqual(obtenido, esperado, 6)

    def test_ajuste_sin_pixeles_validos(self):
        with self.assertRaises(InvalidInput):
            geo.fit_footprint(np.zeros((10, 10), bool), (0, 0, 1, 1))

    def test_valid_box_ignora_ruido_aislado(self):
        valid = np.zeros((20, 20), bool)
        valid[5:15, 5:15] = True
        valid[0, 0] = valid[19, 19] = True
        self.assertEqual(geo.valid_box(valid), (5, 5, 15, 15))


class VentanasTests(unittest.TestCase):
    bbox, shape = (0.0, 0.0, 10.0, 10.0), (100, 100)

    def test_aoi_ajustada_a_la_cuadricula_e_interseccion(self):
        self.assertEqual(geo.pixel_window((2.05, 3.0, 4.0, 5.0), self.bbox, self.shape), (20, 50, 40, 70))
        self.assertEqual(geo.pixel_window((-5, -5, 100, 100), self.bbox, self.shape), (0, 0, 100, 100))

    def test_interseccion_vacia(self):
        with self.assertRaises(InvalidInput):
            geo.pixel_window((20, 20, 30, 30), self.bbox, self.shape)

    def test_aoi_invalido(self):
        for texto in ('1,2,3', 'a,b,c,d', '5,0,1,1', '0,5,1,1', '-200,0,1,1'):
            with self.assertRaises(InvalidInput):
                geo.parse_aoi(texto)

    def test_limites_y_esquinas(self):
        limites = geo.window_bounds(self.bbox, self.shape, (20, 50, 40, 70))
        self.assertEqual(limites, (2.0, 3.0, 4.0, 5.0))
        self.assertEqual(geo.corner_coordinates(limites), [[2.0, 5.0], [4.0, 5.0], [4.0, 3.0], [2.0, 3.0]])

    def test_punto_a_pixel(self):
        self.assertEqual(geo.point_to_pixel(2.05, 9.95, self.bbox, self.shape), (20, 0))
        self.assertIsNone(geo.point_to_pixel(11, 5, self.bbox, self.shape))

    def test_area_por_fila_depende_de_la_latitud(self):
        ecuador = geo.row_area_km2((0, -0.5, 1, 0.5), (1, 1))[0]
        self.assertAlmostEqual(ecuador, 111.32 * 110.574, delta=1)
        sesenta = geo.row_area_km2((0, 59.5, 1, 60.5), (1, 1))[0]
        self.assertAlmostEqual(sesenta / ecuador, 0.5, delta=0.01)


class ProxyTests(unittest.TestCase):
    BUENA = 'https://nisar.asf.earthdatacloud.nasa.gov/BROWSE/NISAR_L2_GCOV_V1/x/x_LATLON.png'

    def test_acepta_url_valida(self):
        self.assertEqual(browse.validate_browse_url(self.BUENA), self.BUENA)

    def test_rechaza_lo_demas(self):
        malas = [
            self.BUENA.replace('https', 'http'),
            'https://evil.example.com/x_LATLON.png',
            'https://nisar.asf.earthdatacloud.nasa.gov.evil.com/x.png',
            'https://evil.com/@nisar.asf.earthdatacloud.nasa.gov/x.png',
            'https://user:pw@nisar.asf.earthdatacloud.nasa.gov/x.png',
            'https://nisar.asf.earthdatacloud.nasa.gov:8443/x.png',
            'https://nisar.asf.earthdatacloud.nasa.gov/x.h5',
            'file:///etc/passwd', '', 'no es una url',
        ]
        for url in malas:
            with self.subTest(url=url), self.assertRaises(InvalidInput):
                browse.validate_browse_url(url)

    def test_ruta_de_cache_estable(self):
        self.assertEqual(browse.cache_path(self.BUENA), browse.cache_path(self.BUENA))
        self.assertNotEqual(browse.cache_path(self.BUENA), browse.cache_path(self.BUENA + 'x'))
        self.assertTrue(browse.cache_path(self.BUENA).name.endswith('.png'))


if __name__ == '__main__':
    unittest.main()
