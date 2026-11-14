"""Idioma de los mensajes de error: inglés por defecto, español si la petición lo pide."""
import unittest

from fastapi.testclient import TestClient

from backend import i18n
from backend.main import app


class TestIdiomaDeErrores(unittest.TestCase):
    def test_idioma_de_la_peticion(self):
        self.assertEqual(i18n.request_lang(None), 'en')
        self.assertEqual(i18n.request_lang(''), 'en')
        self.assertEqual(i18n.request_lang('fr-FR,fr;q=0.9'), 'en')
        self.assertEqual(i18n.request_lang('es'), 'es')
        self.assertEqual(i18n.request_lang('es-CO,es;q=0.9,en;q=0.8'), 'es')
        self.assertEqual(i18n.request_lang('en-US,es;q=0.5'), 'en')

    def test_espanol_no_se_toca(self):
        mensaje = 'La fecha «before» debe ser anterior a «after».'
        self.assertEqual(i18n.translate(mensaje, 'es'), mensaje)

    def test_mensajes_con_valores(self):
        self.assertEqual(
            i18n.translate('La pila 011_D_084 no tiene una escena del 2026-01-01 '
                           '(disponibles entre 2026-06-02 y 2026-10-24).', 'en'),
            'Stack 011_D_084 has no scene on 2026-01-01 (available between 2026-06-02 and 2026-10-24).')
        self.assertEqual(
            i18n.translate('El catálogo de NASA CMR respondió con el código 503. '
                           'Reintenta en unos momentos; no se sustituyeron los datos.', 'en'),
            'The NASA CMR catalog answered with status 503. Try again in a moment; no data was substituted.')
        self.assertIn('(after) cannot be analyzed', i18n.translate(
            'La escena del 2026-07-08 (después) no es analizable: las escenas beta no tienen una cuadrícula '
            'comparable píxel a píxel. Elige una fecha provisional o validada.', 'en'))

    def test_sin_traduccion_se_devuelve_el_original(self):
        self.assertEqual(i18n.translate('Mensaje que no está en la tabla.', 'en'),
                         'Mensaje que no está en la tabla.')

    def test_ninguna_traduccion_conserva_espanol(self):
        # Cada plantilla en inglés debe quedar sin tildes ni comillas angulares del original.
        for patron, salida in i18n._TABLA:
            if isinstance(salida, str):
                self.assertNotRegex(salida, r'[áéíóúñ«»¿¡]', patron)

    def test_respuesta_http_segun_cabecera(self):
        cliente = TestClient(app)
        ruta = '/api/change?stack=011_D_084&before=2026-10-24&after=2026-06-26'
        self.assertEqual(cliente.get(ruta).json()['detail'], 'The "before" date must be earlier than "after".')
        self.assertEqual(cliente.get(ruta, headers={'Accept-Language': 'es'}).json()['detail'],
                         'La fecha «before» debe ser anterior a «after».')

    def test_validacion_y_rutas_desconocidas(self):
        cliente = TestClient(app)
        self.assertEqual(cliente.get('/api/change').json()['detail'],
                         'Missing or invalid parameters: after, before, stack.')
        self.assertEqual(cliente.get('/api/places?q=a').json()['detail'],
                         'Type at least two letters to search for a place.')
        self.assertEqual(cliente.get('/api/no-existe').status_code, 404)


if __name__ == '__main__':
    unittest.main()
