import unittest

import numpy as np

from backend import change, geo, series
from backend.errors import InvalidInput


def textura(alto=60, ancho=60, semilla=1):
    """Escena sintética RGB (HH, HV, HH) con valores ND variados entre 60 y 200."""
    rng = np.random.default_rng(semilla)
    hh = rng.integers(60, 200, (alto, ancho)).astype(np.uint8)
    hv = rng.integers(60, 200, (alto, ancho)).astype(np.uint8)
    return np.dstack([hh, hv, hh])


def escena(fecha, modo='4005_DHDH', analizable=True, id_=None, calidad='provisional'):
    return {'id': id_ or fecha, 'date': fecha, 'mode': modo, 'analyzable': analizable, 'quality': calidad}


class ValidosYQTests(unittest.TestCase):
    def test_mascara_valida_y_erosion(self):
        a = np.zeros((12, 12, 3), np.uint8)
        a[1:11, 1:11] = 5
        b = a.copy()
        b[:, 6:] = 0                                # B sin dato desde la columna 6
        sin_erosion = change.valid_mask(a, b, erosion=0)
        self.assertEqual(int(sin_erosion.sum()), 10 * 5)
        con_erosion = change.valid_mask(a, b, erosion=2)
        self.assertEqual(int(con_erosion.sum()), 6 * 1)   # 10x5 se reduce a 6x1
        self.assertFalse(con_erosion[0].any())

    def test_q_de_nd_1_y_255(self):
        valid = np.ones((9, 9), bool)
        self.assertTrue(np.allclose(change.q_channel(np.full((9, 9), 1, np.uint8), valid), 0))
        self.assertTrue(np.allclose(change.q_channel(np.full((9, 9), 255, np.uint8), valid), 1))
        medio = change.q_channel(np.full((9, 9), 128, np.uint8), valid)
        self.assertTrue(np.allclose(medio, (127 / 254) ** 2, atol=1e-6))

    def test_suavizado_normalizado_por_validos(self):
        valid = np.zeros((9, 9), bool)
        valid[:, :5] = True
        x = np.where(valid, 0.5, 99.0)              # lo inválido no debe contaminar
        s = change.smooth_values(x, valid)
        self.assertTrue(np.allclose(s[valid], 0.5, atol=1e-5))


class AjusteTests(unittest.TestCase):
    def test_rma_robusta_recupera_recta_con_atipicos(self):
        rng = np.random.default_rng(0)
        x = rng.uniform(0, 1, 5000)
        y = 0.8 * x + 0.1 + rng.normal(0, 0.005, x.size)
        y[:200] = rng.uniform(0, 1, 200)            # 4 % de atípicos
        alpha, beta, inliers = change.rma_robust(x, y)
        self.assertAlmostEqual(alpha, 0.8, delta=0.03)
        self.assertAlmostEqual(beta, 0.1, delta=0.02)
        self.assertGreater(inliers, 0.9)

    def test_ajuste_reproducible_y_sin_pixeles(self):
        a, b = textura(semilla=1), textura(semilla=2)
        valid = np.ones(a.shape[:2], bool)
        qa, qb = change.q_channel(a[..., 0], valid), change.q_channel(b[..., 0], valid)
        uno = change.fit_normalization(qa, qb, a[..., 0], b[..., 0], valid)
        dos = change.fit_normalization(qa, qb, a[..., 0], b[..., 0], valid)
        self.assertEqual(uno, dos)
        vacio = change.fit_normalization(qa, qb, a[..., 0], b[..., 0], np.zeros_like(valid))
        self.assertEqual(vacio, (1.0, 0.0, 0.0, None))

    def test_saturados_se_excluyen_del_ajuste(self):
        valid = np.ones((20, 20), bool)
        saturado = np.full((20, 20), 255, np.uint8)             # A totalmente saturada
        normal = np.full((20, 20), 100, np.uint8)
        q = change.q_channel(normal, valid)
        self.assertEqual(change.fit_normalization(q, q, saturado, normal, valid), (1.0, 0.0, 0.0, None))
        sin_dato = np.full((20, 20), 1, np.uint8)                # ND = 1 también cuenta como saturado
        self.assertEqual(change.fit_normalization(q, q, sin_dato, normal, valid), (1.0, 0.0, 0.0, None))

    def test_intervalo_comparable(self):
        self.assertEqual(change.comparable_range(0.99, 0.061)[0], 0.061)
        self.assertEqual(change.comparable_range(0.99, 0.061)[1], 1.0)
        lo, hi = change.comparable_range(0.5, -0.2)
        self.assertEqual(lo, 0.0)
        self.assertAlmostEqual(hi, 0.3)
        lo, hi = change.comparable_range(0.1, 0.95)
        self.assertEqual((lo, hi), (0.95, 1.0))
        lo, hi = change.comparable_range(0.01, 1.0)  # degenerado: nunca hi <= lo
        self.assertGreater(hi, lo)

    def test_to_db(self):
        self.assertAlmostEqual(float(change.to_db(np.float32(0.07))), 10 * np.log10(0.1), places=5)


class AnalisisTests(unittest.TestCase):
    def test_imagenes_iguales_no_cambian(self):
        a = textura()
        r = change.analyze(a, a.copy(), dual=True, erosion=0)
        self.assertAlmostEqual(r.hh.gain, 1.0, places=3)
        self.assertAlmostEqual(r.hh.bias, 0.0, places=3)
        self.assertLess(np.abs(r.hh.delta).max(), 0.05)
        self.assertEqual(int(r.classes.sum()), 0)
        self.assertEqual(change.confidence(r.hh)['level'], 'alta')

    def test_estiramiento_global_queda_absorbido(self):
        a = textura()
        factor = np.sqrt(0.5)                       # q_B = 0.5·q_A
        b = a.copy()
        b[..., :] = np.round(1 + (a.astype(float) - 1) * factor).astype(np.uint8)
        r = change.analyze(a, b, dual=True, erosion=0)
        self.assertAlmostEqual(r.hh.gain, 0.5, delta=0.03)
        self.assertLess(np.abs(np.median(r.hh.delta)), 0.2)
        self.assertLess(np.mean(np.abs(r.hh.delta) > 1), 0.02)

    def test_parche_oscurecido_es_agua_nueva(self):
        a = textura(semilla=3)
        b = a.copy()
        b[20:40, 20:40, 0] = 2                       # HH casi sin retorno después
        b[20:40, 20:40, 2] = 2
        r = change.analyze(a, b, dual=True, erosion=0)
        self.assertLessEqual(r.hh.delta[30, 30], -3)
        self.assertEqual(int(r.classes[30, 30]), 1)                    # agua_nueva
        self.assertEqual(int(r.classes[5, 5]), 0)
        self.assertTrue(r.hh.dark_after[30, 30])
        self.assertFalse(r.hh.dark_before[30, 30])

    def test_polarizacion_simple_no_tiene_hv(self):
        a = textura()
        r = change.analyze(a, a.copy(), dual=False, erosion=0)
        self.assertIsNone(r.hv)
        self.assertFalse(r.dual)
        self.assertIsNone(change.compute_stats(r, (0, 0, 1, 1))['hv'])

    def test_tamanos_distintos_y_sin_validos(self):
        with self.assertRaises(InvalidInput):
            change.analyze(textura(10, 10), textura(10, 12), dual=True)
        with self.assertRaises(InvalidInput):
            change.analyze(np.zeros((10, 10, 3), np.uint8), textura(10, 10), dual=True, erosion=0)

    def test_recorte_conserva_el_ajuste_del_cuadro_completo(self):
        a = textura()
        r = change.analyze(a, a.copy(), dual=True, erosion=0)
        c = r.crop((10, 5, 30, 25))
        self.assertEqual(c.valid.shape, (20, 20))
        self.assertEqual(c.hh.delta.shape, (20, 20))
        self.assertEqual(c.hh.gain, r.hh.gain)
        self.assertEqual(c.hv.bias, r.hv.bias)


class ClasesTests(unittest.TestCase):
    def _clase(self, d_hh, d_hv=0.0, oscuro_antes=False, oscuro_despues=False, dual=True):
        forma = (9, 9)
        valid = np.ones(forma, bool)
        r = change.classify(np.full(forma, d_hh, np.float32), np.full(forma, d_hv, np.float32),
                            np.full(forma, oscuro_antes), np.full(forma, oscuro_despues), valid, dual)
        return int(r[4, 4])

    def test_prioridad_de_clases(self):
        self.assertEqual(self._clase(-5, oscuro_despues=True), 1)              # agua_nueva
        self.assertEqual(self._clase(5, oscuro_antes=True), 2)                 # agua_retirada
        self.assertEqual(self._clase(5, d_hv=0.0), 3)                          # veg_inundada
        self.assertEqual(self._clase(0, d_hv=-4), 4)                           # veg_perdida
        self.assertEqual(self._clase(5, d_hv=-4), 3)                           # prioridad: veg_inundada primero
        self.assertEqual(self._clase(0, d_hv=4), 5)                            # veg_aumento
        self.assertEqual(self._clase(5, d_hv=2), 6)                            # aumento
        self.assertEqual(self._clase(-5), 7)                                   # disminucion
        self.assertEqual(self._clase(1, d_hv=1), 0)                            # estable

    def test_polarizacion_simple_ignora_clases_de_vegetacion(self):
        self.assertEqual(self._clase(5, d_hv=-9, dual=False), 6)
        self.assertEqual(self._clase(-5, dual=False), 7)

    def test_sin_dato_es_cero_y_la_mediana_quita_puntos_aislados(self):
        forma = (9, 9)
        delta = np.zeros(forma, np.float32)
        delta[4, 4] = -9
        valid = np.ones(forma, bool)
        valid[0, 0] = False
        cero = np.zeros(forma, bool)
        r = change.classify(delta, None, cero, cero, valid, False)
        self.assertEqual(int(r.sum()), 0)


class EstadisticasTests(unittest.TestCase):
    def test_area_por_clase_pesa_la_latitud(self):
        clases = np.array([[1, 0], [0, 0]], np.uint8)
        valid = np.ones((2, 2), bool)
        bounds = (0.0, 59.0, 2.0, 61.0)             # píxeles de 1° a ~60°N
        valido, por_clase = change.class_areas(clases, valid, bounds)
        pixel_arriba = geo.row_area_km2(bounds, (2, 2))[0]
        self.assertAlmostEqual(por_clase[1], pixel_arriba, places=3)
        self.assertGreater(valido, 4 * pixel_arriba * 0.95)

    def test_confianza(self):
        def canal(corr, inliers):
            vacio = np.zeros((1, 1))
            return change.ChannelResult(vacio, vacio, vacio, vacio, vacio, 1, 0, inliers, corr, 0, 1)
        self.assertEqual(change.confidence(canal(0.92, 0.95)), {'level': 'alta', 'reasons': []})
        media = change.confidence(canal(0.75, 0.95))
        self.assertEqual(media['level'], 'media')
        self.assertEqual(len(media['reasons']), 1)
        self.assertEqual(change.confidence(canal(0.92, 0.5))['level'], 'media')   # corr >= 0,70
        self.assertEqual(change.confidence(canal(0.5, 0.9))['level'], 'baja')
        self.assertEqual(change.confidence(canal(None, 0.9))['level'], 'baja')

    def test_estadisticas_completas(self):
        a = textura()
        b = a.copy()
        b[20:40, 20:40, 0] = 2
        b[20:40, 20:40, 2] = 2
        r = change.analyze(a, b, dual=True, erosion=0)
        s = change.compute_stats(r, (-75.0, 8.0, -74.0, 9.0))
        self.assertEqual([c['key'] for c in s['classes']], [k for k, _, _ in change.CLASSES])
        self.assertGreater(s['changed_km2'], 0)
        self.assertLess(s['changed_pct'], 100)
        self.assertEqual(sum(s['hh']['hist']['counts']), 60 * 60)
        self.assertEqual(len(s['hh']['hist']['edges']), len(s['hh']['hist']['counts']) + 1)
        self.assertEqual(set(s['hh']), {'gain', 'bias', 'inliers', 'range', 'p5', 'p95', 'hist'})
        self.assertIn(s['confidence']['level'], ('alta', 'media', 'baja'))


class CapasTests(unittest.TestCase):
    def test_capa_de_cambio(self):
        valid = np.ones((1, 5), bool)
        delta = np.array([[-8, -3, 0.5, 3, 8]], np.float32)
        rgba = change.render_change(delta, valid)
        self.assertEqual(tuple(rgba[0, 0]), (0x02, 0x84, 0xc7, 235))           # azul oscuro, opaco
        self.assertEqual(rgba[0, 2, 3], 0)                                     # estable: transparente
        self.assertEqual(tuple(rgba[0, 4]), (0xea, 0x58, 0x0c, 235))           # naranja oscuro
        self.assertEqual(rgba[0, 1, 3], 235)
        sin_dato = change.render_change(delta, np.zeros((1, 5), bool))
        self.assertEqual(int(sin_dato[..., 3].max()), 0)

    def test_capa_de_clases(self):
        rgba = change.render_classes(np.array([[0, 1, 7]], np.uint8))
        self.assertEqual(rgba[0, 0, 3], 0)
        self.assertEqual(tuple(rgba[0, 1]), (0x38, 0xbd, 0xf8, 230))
        self.assertEqual(tuple(rgba[0, 2][:3]), (0x60, 0xa5, 0xfa))

    def test_composite_y_rgb(self):
        a = np.zeros((1, 2, 3), np.uint8)
        b = np.zeros((1, 2, 3), np.uint8)
        a[0, 0] = (10, 0, 10)
        b[0, 0] = (200, 0, 200)
        c = change.render_composite(a, b)
        self.assertEqual(tuple(c[0, 0]), (200, 10, 10, 255))                   # R = después, G = B = antes
        self.assertEqual(c[0, 1, 3], 0)


class SondeoTests(unittest.TestCase):
    def setUp(self):
        valid = np.ones((4, 4), bool)
        valid[0, 0] = False
        clases = np.zeros((4, 4), np.uint8)
        clases[1, 1] = 3
        antes = np.full((4, 4), -5.0, np.float16)
        despues = np.full((4, 4), -9.0, np.float16)
        self.arreglos = {'valid': valid, 'classes': clases, 'hh_before': antes, 'hh_after': despues}
        self.bounds = [0.0, 0.0, 4.0, 4.0]

    def test_punto_valido_con_clase(self):
        r = change.probe_arrays(self.arreglos, self.bounds, 1.5, 2.5)        # columna 1, fila 1
        self.assertTrue(r['valid'])
        self.assertEqual((r['class'], r['label']), ('veg_inundada', 'Posible vegetación inundada'))
        self.assertEqual(r['hh'], {'before_db': -5.0, 'after_db': -9.0, 'delta_db': -4.0})
        self.assertIsNone(r['hv'])

    def test_estable_fuera_y_sin_dato(self):
        estable = change.probe_arrays(self.arreglos, self.bounds, 3.5, 0.5)
        self.assertTrue(estable['valid'])
        self.assertIsNone(estable['class'])
        self.assertEqual(change.probe_arrays(self.arreglos, self.bounds, 0.5, 3.5), {'valid': False})
        self.assertEqual(change.probe_arrays(self.arreglos, self.bounds, 10, 10), {'valid': False})


class ReglasDeEntradaTests(unittest.TestCase):
    PILA = {'id': '011_D_084'}

    def test_modos_distintos_dan_422_con_ambos_modos(self):
        with self.assertRaises(InvalidInput) as cm:
            change.compute_change(self.PILA, escena('2026-01-01', '2005_QPDH'), escena('2026-02-01', '4005_DHDH'))
        self.assertIn('2005_QPDH', cm.exception.detail)
        self.assertIn('4005_DHDH', cm.exception.detail)

    def test_escena_beta_no_analizable(self):
        with self.assertRaises(InvalidInput) as cm:
            change.compute_change(self.PILA, escena('2026-01-01', analizable=False), escena('2026-02-01'))
        self.assertIn('no es analizable', cm.exception.detail)

    def test_fechas_en_orden(self):
        with self.assertRaises(InvalidInput):
            change.compute_change(self.PILA, escena('2026-02-01'), escena('2026-01-01'))

    def test_id_estable_y_sensible_a_aoi_y_escenas(self):
        a, b = escena('2026-01-01'), escena('2026-02-01')
        base = change.change_id('011_D_084', a, b, None)
        self.assertEqual(base, change.change_id('011_D_084', a, b, None))
        self.assertEqual(len(base), 16)
        self.assertNotEqual(base, change.change_id('011_D_084', a, b, (0, 0, 1, 1)))
        self.assertNotEqual(base, change.change_id('011_D_084', a, escena('2026-02-01', id_='otra'), None))

    def test_probe_rechaza_ids_raros(self):
        for malo in ('../x', 'ABC', '1234', 'z' * 16):
            with self.assertRaises(InvalidInput):
                change.read_result(malo)


class SerieTests(unittest.TestCase):
    def test_muestreo_uniforme_conserva_extremos(self):
        escenas = list(range(10))
        self.assertEqual(series.sample_scenes(escenas, 20), escenas)
        m = series.sample_scenes(escenas, 4)
        self.assertEqual((m[0], m[-1], len(m)), (0, 9, 4))
        self.assertEqual(m, sorted(m))

    def test_ventana_con_bordes_y_sin_dato(self):
        q = np.full((10, 10), 0.07, np.float32)
        valid = np.ones((10, 10), bool)
        self.assertEqual(series.window_db(q, valid, (5, 5), 2), -10.0)
        self.assertEqual(series.window_db(q, valid, (0, 0), 3), -10.0)          # ventana recortada al borde
        self.assertIsNone(series.window_db(q, np.zeros((10, 10), bool), (5, 5), 2))

    def test_modo_dominante(self):
        escenas = [{'mode': 'A'}, {'mode': 'B'}, {'mode': 'B'}, {'mode': 'A'}]
        self.assertEqual(series.dominant_mode(escenas), 'A')                    # empate: el más reciente
        self.assertEqual(series.dominant_mode(escenas[:3]), 'B')

    def test_normalizacion_contra_la_referencia(self):
        ref = textura(semilla=5)
        otra = np.round(1 + (ref.astype(float) - 1) * np.sqrt(0.5)).astype(np.uint8)   # q = 0.5·q_ref
        q, valid = series.normalized_q(otra, ref, 0)
        q_ref, _ = series.normalized_q(ref, ref, 0)
        self.assertTrue(valid.any())
        interior = valid & change.valid_mask(ref, ref)
        self.assertLess(float(np.abs(q[interior] - q_ref[interior]).mean()), 0.02)


if __name__ == '__main__':
    unittest.main()
