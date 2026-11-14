"""Denominadores y umbrales de la comparación, incluidos casos sin detecciones."""
import unittest
import numpy as np
from scripts.validar_browse_vs_gcov import metricas, delta_calibrado


class ValidationMetricsTests(unittest.TestCase):
    def test_confusion_and_sign_have_different_denominators(self):
        result = metricas(np.array([4., -4., 4., 0., 0.]), np.array([4., 4., 0., 4., 0.]))
        self.assertEqual([result[k] for k in ('aciertos_conjuntos', 'falsos_positivos', 'falsos_negativos', 'verdaderos_negativos')], [2, 1, 1, 1])
        self.assertEqual(result['signo_denominador'], 2)
        self.assertEqual(result['signo_correcto_en_aciertos'], .5)
        self.assertEqual(result['precision'], .667)

    def test_no_detections_is_undefined_not_perfect(self):
        result = metricas(np.zeros(4), np.zeros(4))
        for key in ('pearson_r', 'precision', 'exhaustividad', 'signo_correcto_en_aciertos'):
            self.assertIsNone(result[key])

    def test_threshold_is_inclusive_and_configurable(self):
        result = metricas(np.array([2., -2., 1.]), np.array([2., -2., 1.]), 2)
        self.assertEqual(result['detecta_browse'], 2)
        self.assertEqual(result['precision'], 1)

    def test_missing_calibrated_coverage_is_not_zero_change(self):
        delta, valid = delta_calibrado(np.zeros((2, 2)), np.zeros((2, 2)), np.zeros((2, 2)), False)
        self.assertFalse(valid.any())
        self.assertTrue(np.isnan(delta).all())
