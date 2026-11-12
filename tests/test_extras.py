"""Pruebas sin red del módulo backend.extras (eventos EONET y EPIC)."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend import extras

CLAVE = 'CLAVE-SECRETA-123'


def _evento(id_, geometrias, cerrado=None, categoria='wildfires', fuentes=True):
    return {
        'id': id_, 'title': f'Evento {id_}', 'link': f'https://eonet/{id_}', 'closed': cerrado,
        'categories': [{'id': categoria, 'title': 'EN'}],
        'sources': [{'id': 'X', 'url': f'https://fuente/{id_}'}] if fuentes else [],
        'geometry': geometrias,
    }


def _punto(fecha, lon, lat):
    return {'date': fecha, 'type': 'Point', 'coordinates': [lon, lat]}


class PruebasBase(unittest.TestCase):
    def setUp(self):
        extras._events_cache.clear()
        extras._epic_meta.clear()
        app = FastAPI()
        app.include_router(extras.router)
        self.client = TestClient(app)


class PruebasNormalizacion(unittest.TestCase):
    def test_punto(self):
        ev = extras._normalizar_evento(_evento('A', [_punto('2026-11-08T00:00:00Z', 52.6, -13.5)],
                                               categoria='severeStorms'))
        self.assertEqual(ev['lon'], 52.6)
        self.assertEqual(ev['lat'], -13.5)
        self.assertEqual(ev['category'], 'severeStorms')
        self.assertEqual(ev['category_label'], 'Tormentas severas')
        self.assertEqual(ev['source_url'], 'https://fuente/A')
        self.assertIs(ev['closed'], False)

    def test_poligono_centroide(self):
        anillo = [[0, 0], [4, 0], [4, 2], [0, 2], [0, 0]]
        geom = {'date': '2026-11-01T00:00:00Z', 'type': 'Polygon', 'coordinates': [anillo]}
        ev = extras._normalizar_evento(_evento('P', [geom]))
        self.assertEqual((ev['lon'], ev['lat']), (2.0, 1.0))

    def test_sin_geometria_se_descarta(self):
        self.assertIsNone(extras._normalizar_evento(_evento('S', [])))
        raro = {'date': '2026-11-01T00:00:00Z', 'type': 'LineString', 'coordinates': [[0, 0]]}
        self.assertIsNone(extras._normalizar_evento(_evento('S', [raro])))

    def test_geometria_mas_reciente(self):
        geoms = [_punto('2026-11-02T00:00:00Z', 2, 2), _punto('2026-11-05T00:00:00Z', 5, 5),
                 _punto('2026-11-03T00:00:00Z', 3, 3)]
        ev = extras._normalizar_evento(_evento('M', geoms))
        self.assertEqual((ev['lon'], ev['lat'], ev['date']), (5.0, 5.0, '2026-11-05T00:00:00Z'))

    def test_evento_cerrado_y_sin_fuente(self):
        ev = extras._normalizar_evento(_evento('C', [_punto('2026-11-02T00:00:00Z', 1, 1)],
                                               cerrado='2026-11-04T00:00:00Z', fuentes=False))
        self.assertIs(ev['closed'], True)
        self.assertIsNone(ev['source_url'])

    def test_orden_descendente(self):
        datos = {'events': [_evento('v', [_punto('2026-11-01T00:00:00Z', 0, 0)]),
                            _evento('n', [_punto('2026-11-07T00:00:00Z', 0, 0)]),
                            _evento('x', [])]}
        res = extras._normalizar_eventos(datos)
        self.assertEqual([e['id'] for e in res['events']], ['n', 'v'])
        self.assertEqual(res['source'], 'NASA EONET v3')


class PruebasEventos(PruebasBase):
    def test_validacion_days(self):
        with mock.patch.object(extras, '_fetch_json', return_value={'events': []}):
            for malo in (0, 121, -3, 'abc'):
                self.assertEqual(self.client.get('/api/events', params={'days': malo}).status_code, 422)
            self.assertEqual(self.client.get('/api/events', params={'days': 120}).status_code, 200)

    def test_cache_por_days(self):
        crudo = {'events': [_evento('A', [_punto('2026-11-08T00:00:00Z', 1, 2)])]}
        with mock.patch.object(extras, '_fetch_json', return_value=crudo) as f:
            self.client.get('/api/events?days=30')
            self.client.get('/api/events?days=30')
            self.assertEqual(f.call_count, 1)
            self.client.get('/api/events?days=10')
            self.assertEqual(f.call_count, 2)

    def test_stale_si_falla_con_copia_vencida(self):
        crudo = {'events': [_evento('A', [_punto('2026-11-08T00:00:00Z', 1, 2)])]}
        with mock.patch.object(extras, '_fetch_json', return_value=crudo):
            self.client.get('/api/events?days=30')
        marca, payload = extras._events_cache[30]
        extras._events_cache[30] = (marca - extras.EVENTS_TTL - 1, payload)  # vencida
        with mock.patch.object(extras, '_fetch_json', side_effect=extras._ErrorDescarga('x')):
            r = self.client.get('/api/events?days=30')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['stale'])
        self.assertEqual(len(r.json()['events']), 1)
        self.assertNotIn('stale', payload)  # la copia en caché no se contamina

    def test_502_sin_copia(self):
        with mock.patch.object(extras, '_fetch_json', side_effect=extras._ErrorDescarga('x')):
            r = self.client.get('/api/events?days=30')
        self.assertEqual(r.status_code, 502)
        self.assertIn('EONET', r.json()['detail'])


class PruebasEpic(PruebasBase):
    ITEM = [{'date': '2026-11-09 00:50:27', 'image': 'epic_1b_20261109005027', 'caption': 'Tierra'}]

    def test_503_sin_clave(self):
        with mock.patch.object(extras.config, 'NASA_API_KEY', ''):
            for ruta in ('/api/earth-today', '/api/earth-today/image'):
                r = self.client.get(ruta)
                self.assertEqual(r.status_code, 503)
                self.assertEqual(r.json()['detail'], 'Falta NASA_API_KEY en .env')

    def test_metadatos_y_cache(self):
        with mock.patch.object(extras.config, 'NASA_API_KEY', CLAVE), \
                mock.patch.object(extras, '_fetch_json', return_value=self.ITEM) as f:
            r = self.client.get('/api/earth-today')
            self.client.get('/api/earth-today')
        self.assertEqual(r.json(), {'date': '2026-11-09', 'caption': 'Tierra',
                                    'image': '/api/earth-today/image', 'source': 'NASA EPIC / DSCOVR'})
        self.assertEqual(f.call_count, 1)
        self.assertNotIn(CLAVE, json.dumps(r.json()))

    def test_clave_no_se_filtra_si_api_falla(self):
        # Simula el error de httpx, cuyo texto normalmente incluye la URL completa.
        def falla(url, params=None, headers=None):
            raise extras._ErrorDescarga('HTTP 500')
        with mock.patch.object(extras.config, 'NASA_API_KEY', CLAVE), \
                mock.patch.object(extras, '_fetch_json', side_effect=falla):
            r = self.client.get('/api/earth-today')
        self.assertEqual(r.status_code, 502)
        self.assertNotIn(CLAVE, r.text)
        self.assertNotIn(CLAVE, json.dumps(dict(r.headers)))

    def test_fetch_json_no_expone_clave_en_excepcion(self):
        import httpx

        def handler(request):
            raise httpx.ConnectError(f'fallo en {request.url}', request=request)
        transporte = httpx.MockTransport(handler)
        real = httpx.Client
        with mock.patch.object(extras.httpx, 'Client', lambda **kw: real(transport=transporte, **kw)):
            with self.assertRaises(extras._ErrorDescarga) as ctx:
                extras._fetch_json('https://api.nasa.gov/x', {'api_key': CLAVE})
        self.assertNotIn(CLAVE, str(ctx.exception))

    def test_imagen_descarga_una_vez(self):
        with tempfile.TemporaryDirectory() as tmp, \
                mock.patch.object(extras, 'EPIC_DIR', Path(tmp)), \
                mock.patch.object(extras.config, 'NASA_API_KEY', CLAVE), \
                mock.patch.object(extras, '_fetch_json', return_value=self.ITEM), \
                mock.patch.object(extras, '_fetch_bytes', return_value=b'\xff\xd8JPEG') as fb:
            r1 = self.client.get('/api/earth-today/image')
            r2 = self.client.get('/api/earth-today/image')
            self.assertEqual(r1.status_code, 200)
            self.assertEqual(r1.content, b'\xff\xd8JPEG')
            self.assertEqual(r1.headers['cache-control'], 'public, max-age=3600')
            self.assertEqual(r2.status_code, 200)
            self.assertEqual(fb.call_count, 1)
            self.assertIn('/2026/11/09/jpg/epic_1b_20261109005027.jpg', fb.call_args[0][0])
            self.assertNotIn(CLAVE, fb.call_args[0][0])
            self.assertEqual([p.suffix for p in Path(tmp).iterdir()], ['.jpg'])  # sin temporales

    def test_imagen_502_sin_clave_en_mensaje(self):
        with tempfile.TemporaryDirectory() as tmp, \
                mock.patch.object(extras, 'EPIC_DIR', Path(tmp)), \
                mock.patch.object(extras.config, 'NASA_API_KEY', CLAVE), \
                mock.patch.object(extras, '_fetch_json', return_value=self.ITEM), \
                mock.patch.object(extras, '_fetch_bytes', side_effect=extras._ErrorDescarga('HTTP 404')):
            r = self.client.get('/api/earth-today/image')
        self.assertEqual(r.status_code, 502)
        self.assertNotIn(CLAVE, r.text)


if __name__ == '__main__':
    unittest.main()
