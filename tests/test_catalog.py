import copy
import unittest

from backend import catalog
from tests.helpers import cargar


def registros_gcov():
    return [catalog.normalize_granule(i) for i in cargar('cmr_gcov.json')['items']]


class NormalizacionTests(unittest.TestCase):
    def setUp(self):
        self.por_calidad = {r['quality']: r for r in registros_gcov()}

    def test_granule_validado_real(self):
        r = self.por_calidad['validated']
        self.assertEqual(r['date'], '2026-10-24')
        self.assertEqual(r['datetime'], '2026-10-24T23:28:04Z')
        self.assertEqual((r['stack_id'], r['track'], r['frame'], r['cycle']), ('011_D_084', 11, 84, 34))
        self.assertEqual(r['mode'], '4005_DHDH')
        self.assertEqual(r['direction'], 'DESCENDING')
        self.assertEqual(r['polarizations'], ['HH', 'HV'])
        self.assertTrue(r['analyzable'])
        self.assertTrue(r['browse_url'].endswith('_LATLON.png'))
        self.assertTrue(r['kml_url'].endswith('_LATLON.kml') and '/BROWSE/' in r['kml_url'])
        self.assertTrue(r['download_url'].endswith('.h5'))
        self.assertTrue(r['id'].startswith('G'))
        self.assertEqual(r['footprint']['type'], 'Polygon')
        anillo = r['footprint']['coordinates'][0]
        self.assertEqual(anillo[0], anillo[-1])

    def test_provisional_y_beta(self):
        self.assertTrue(self.por_calidad['provisional']['analyzable'])
        beta = self.por_calidad['beta']
        self.assertFalse(beta['analyzable'])
        self.assertFalse(beta['browse_url'].endswith('_LATLON.png'))   # beta solo publica el .png simple

    def test_solo_urls_https(self):
        for r in self.por_calidad.values():
            for clave in ('browse_url', 'thumbnail_url', 'download_url'):
                if r[clave]:
                    self.assertTrue(r[clave].startswith('https://'))

    def test_escena_publica_sigue_el_contrato(self):
        s = catalog.scene_public(self.por_calidad['validated'])
        self.assertEqual(set(s), {'id', 'granule', 'date', 'datetime', 'cycle', 'mode', 'collection',
                                  'quality', 'analyzable', 'thumbnail', 'browse_url', 'download_url'})
        self.assertTrue(s['thumbnail'].startswith('/api/image?url=https%3A%2F%2F'))
        self.assertTrue(s['thumbnail'].endswith('&w=100'))

    def test_interferograma_fechas(self):
        r = catalog.normalize_interferogram(catalog.normalize_granule(cargar('cmr_gunw.json')['items'][0]))
        self.assertEqual((r['reference_date'], r['secondary_date']), ('2026-10-05', '2026-10-17'))
        self.assertEqual((r['track'], r['frame']), (72, 79))
        self.assertTrue(r['browse_url'].endswith('_LATLON.png'))

    def test_urgente(self):
        r = catalog.normalize_urgent(catalog.normalize_granule(cargar('cmr_ur.json')['items'][0]))
        self.assertEqual(r['product'], 'GCOV')
        self.assertEqual(r['stack'], '091_D_077')
        self.assertEqual(len(r['center']), 2)
        self.assertTrue(r['browse_url'].endswith('_LATLON.png'))


class DeduplicacionTests(unittest.TestCase):
    def _copia(self, registro, **cambios):
        return dict(copy.deepcopy(registro), **cambios)

    def test_prioridad_validada_sobre_provisional_sobre_beta(self):
        por_calidad = {r['quality']: r for r in registros_gcov()}
        fecha = '2026-10-24'
        provisional = self._copia(por_calidad['provisional'], date=fecha, id='P')
        beta = self._copia(por_calidad['beta'], date=fecha, id='B')
        validada = por_calidad['validated']
        for orden in ([beta, provisional, validada], [validada, provisional, beta],
                      [provisional, validada, beta]):
            unico = catalog.dedupe_by_date(orden)
            self.assertEqual(len(unico), 1)
            self.assertEqual(unico[0]['quality'], 'validated')
        self.assertEqual(catalog.dedupe_by_date([beta, provisional])[0]['id'], 'P')

    def test_ordena_por_fecha_y_agrupa_en_pila(self):
        pilas = catalog.build_stacks(registros_gcov())
        self.assertEqual(len(pilas), 1)
        pila = pilas[0]
        self.assertEqual(pila['id'], '011_D_084')
        self.assertEqual([e['date'] for e in pila['scenes']], ['2026-01-09', '2026-10-12', '2026-10-24'])
        self.assertEqual(pila['analyzable_count'], 2)
        self.assertEqual((pila['first'], pila['last']), ('2026-01-09', '2026-10-24'))
        publica = catalog.stack_public(pila)
        self.assertEqual(publica['direction'], 'DESCENDING')
        self.assertEqual(publica['footprint']['type'], 'Polygon')

    def test_pilas_ordenadas_por_fechas_analizables(self):
        a, b = registros_gcov(), registros_gcov()
        for r in b:
            r['stack_id'] = '999_A_001'
        b = [r for r in b if r['quality'] != 'validated']
        pilas = catalog.build_stacks(a + b)
        self.assertEqual([p['id'] for p in pilas], ['011_D_084', '999_A_001'])


if __name__ == '__main__':
    unittest.main()
