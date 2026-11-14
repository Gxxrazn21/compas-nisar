"""Pruebas sin red del buscador de lugares (backend.places)."""
import unittest
from unittest import mock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend import places


def _item(nombre, lon, lat, etiqueta=None, tipo='city'):
    return {'name': nombre, 'display_name': etiqueta or f'{nombre}, Colombia',
            'lon': str(lon), 'lat': str(lat), 'addresstype': tipo}


class PruebasNormalizacion(unittest.TestCase):
    def test_lugar_completo(self):
        lugar = places._normalizar_lugar(_item('Montería', -75.88, 8.75, 'Montería, Córdoba, Colombia'))
        self.assertEqual(lugar, {'name': 'Montería', 'label': 'Montería, Córdoba, Colombia',
                                 'lon': -75.88, 'lat': 8.75, 'kind': 'city'})

    def test_sin_nombre_usa_el_inicio_de_la_etiqueta(self):
        item = _item('', -74.07, 4.6, 'Carrera 7, Bogotá, Colombia', 'road')
        self.assertEqual(places._normalizar_lugar(item)['name'], 'Carrera 7')

    def test_coordenadas_invalidas_se_descartan(self):
        self.assertIsNone(places._normalizar_lugar({'display_name': 'X', 'lon': 'abc', 'lat': '1'}))
        self.assertIsNone(places._normalizar_lugar({'display_name': 'X', 'lon': '200', 'lat': '1'}))
        self.assertIsNone(places._normalizar_lugar({'display_name': 'X', 'lon': '10', 'lat': '95'}))
        self.assertIsNone(places._normalizar_lugar({'lon': '10', 'lat': '5'}))
        self.assertIsNone(places._normalizar_lugar('texto'))


class PruebasRuta(unittest.TestCase):
    def setUp(self):
        places._cache.clear()
        app = FastAPI()
        app.include_router(places.router)
        self.client = TestClient(app)
        parche = mock.patch.object(places, 'INTERVALO', 0)
        parche.start()
        self.addCleanup(parche.stop)

    def test_devuelve_lugares_y_fuente(self):
        crudo = [_item('Montería', -75.88, 8.75), {'display_name': 'roto', 'lon': 'x', 'lat': 'y'}]
        with mock.patch.object(places, '_fetch_json', return_value=crudo) as f:
            resp = self.client.get('/api/places', params={'q': 'Montería', 'lang': 'es'})
        self.assertEqual(resp.status_code, 200)
        cuerpo = resp.json()
        self.assertEqual([p['name'] for p in cuerpo['places']], ['Montería'])
        self.assertIn('OpenStreetMap', cuerpo['source'])
        _url, params = f.call_args.args[:2]
        self.assertEqual(params['q'], 'Montería')
        self.assertEqual(params['accept-language'], 'es')

    def test_cache_ignora_mayusculas_y_espacios(self):
        with mock.patch.object(places, '_fetch_json', return_value=[_item('Cali', -76.5, 3.4)]) as f:
            self.client.get('/api/places', params={'q': 'Cali'})
            self.client.get('/api/places', params={'q': '  cali '})
        self.assertEqual(f.call_count, 1)

    def test_el_idioma_separa_la_cache(self):
        with mock.patch.object(places, '_fetch_json', return_value=[_item('Cali', -76.5, 3.4)]) as f:
            self.client.get('/api/places', params={'q': 'Cali', 'lang': 'es'})
            self.client.get('/api/places', params={'q': 'Cali', 'lang': 'en'})
        self.assertEqual(f.call_count, 2)

    def test_sin_resultados(self):
        with mock.patch.object(places, '_fetch_json', return_value=[]):
            resp = self.client.get('/api/places', params={'q': 'zzzzqqq'})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['places'], [])

    def test_fallo_del_servicio_da_502_y_no_se_guarda(self):
        with mock.patch.object(places, '_fetch_json', side_effect=places._ErrorDescarga('x')):
            resp = self.client.get('/api/places', params={'q': 'Cali'})
        self.assertEqual(resp.status_code, 502)
        with mock.patch.object(places, '_fetch_json', return_value=[_item('Cali', -76.5, 3.4)]):
            resp = self.client.get('/api/places', params={'q': 'Cali'})
        self.assertEqual(resp.status_code, 200)

    def test_respuesta_inesperada_da_502(self):
        with mock.patch.object(places, '_fetch_json', return_value={'error': 'x'}):
            resp = self.client.get('/api/places', params={'q': 'Cali'})
        self.assertEqual(resp.status_code, 502)

    def test_valida_la_consulta(self):
        with mock.patch.object(places, '_fetch_json', return_value=[]) as f:
            self.assertEqual(self.client.get('/api/places', params={'q': 'a'}).status_code, 422)
            self.assertEqual(self.client.get('/api/places', params={'q': '   '}).status_code, 422)
            self.assertEqual(self.client.get('/api/places', params={'q': 'x' * 200}).status_code, 422)
            self.assertEqual(self.client.get('/api/places', params={'q': 'Cali', 'lang': 'fr'}).status_code, 422)
        f.assert_not_called()

    def test_espera_entre_peticiones(self):
        with mock.patch.object(places, 'INTERVALO', 1.1), \
                mock.patch.object(places.time, 'sleep') as dormir, \
                mock.patch.object(places, '_fetch_json', return_value=[]):
            self.client.get('/api/places', params={'q': 'Cali'})
            self.client.get('/api/places', params={'q': 'Pasto'})
        self.assertTrue(dormir.called)
        self.assertLessEqual(dormir.call_args.args[0], 1.1)


if __name__ == '__main__':
    unittest.main()
