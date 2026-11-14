"""Capas en WebP y cabeceras de caché (sin red)."""
import tempfile
import unittest
from pathlib import Path

import numpy as np
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from backend import change, main


def _foto(alto=24, ancho=32):
    rng = np.random.default_rng(1)
    rgba = np.dstack([rng.integers(0, 256, (alto, ancho, 3), dtype=np.uint8),
                      np.full((alto, ancho), 255, np.uint8)])
    rgba[:, :4, 3] = 0                                   # sin dato
    return rgba


class TestCapasWebp(unittest.TestCase):
    def test_las_capas_se_escriben_en_webp_rgba_del_tamano_esperado(self):
        with tempfile.TemporaryDirectory() as tmp:
            for nombre in change.LAYER_NAMES:
                ruta = Path(tmp) / f'{nombre}.webp'
                change.save_layer(_foto(), ruta, nombre)
                with Image.open(ruta) as imagen:
                    self.assertEqual(imagen.format, 'WEBP', nombre)
                    rgba = imagen.convert('RGBA')
                    self.assertEqual(rgba.size, (32, 24), nombre)
                    self.assertEqual(imagen.mode, 'RGBA', nombre)
                self.assertTrue((np.asarray(rgba)[:, :4, 3] == 0).all(), nombre)   # el alfa 0 se conserva

    def test_classes_conserva_exactamente_los_colores_de_la_leyenda(self):
        clases = np.arange(24 * 32).reshape(24, 32) % (len(change.CLASSES) + 1)
        rgba = change.render_classes(clases)
        with tempfile.TemporaryDirectory() as tmp:
            ruta = Path(tmp) / 'classes.webp'
            change.save_layer(rgba, ruta, 'classes')
            with Image.open(ruta) as imagen:
                leida = np.asarray(imagen.convert('RGBA'))
        opacos = rgba[..., 3] > 0
        self.assertTrue(opacos.any())
        self.assertTrue((leida[opacos] == rgba[opacos]).all())
        colores = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for _, _, h in change.CLASSES}
        self.assertEqual({tuple(p[:3]) for p in leida[opacos]}, colores)

    def test_el_id_depende_de_la_version_de_render(self):
        escena = {'id': 'a'}
        antes = change.change_id('s', escena, escena, None)
        original = change.RENDER_VERSION
        try:
            change.RENDER_VERSION = original + 1
            self.assertNotEqual(antes, change.change_id('s', escena, escena, None))
        finally:
            change.RENDER_VERSION = original


class TestCabecerasDeCache(unittest.TestCase):
    def test_derived_es_inmutable(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / 'x.webp').write_bytes(b'RIFF')
            app = FastAPI()
            app.mount('/derived', main.InmutableFiles(directory=tmp))
            r = TestClient(app).get('/derived/x.webp')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers['cache-control'], 'public, max-age=31536000, immutable')

    def test_la_aplicacion_monta_derived_con_cabecera_inmutable(self):
        montaje = next(r for r in main.app.routes if getattr(r, 'path', None) == '/derived')
        self.assertIsInstance(montaje.app, main.InmutableFiles)

    def test_frontend_assets_inmutables_e_index_sin_cache(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / 'assets').mkdir()
            (Path(tmp) / 'assets' / 'app-abc123.js').write_text('1', encoding='utf-8')
            (Path(tmp) / 'index.html').write_text('<html></html>', encoding='utf-8')
            app = FastAPI()
            app.mount('/', main.FrontendFiles(directory=tmp, html=True))
            cliente = TestClient(app)
            js = cliente.get('/assets/app-abc123.js')
            raiz = cliente.get('/')
            index = cliente.get('/index.html')
        self.assertEqual(js.headers['cache-control'], 'public, max-age=31536000, immutable')
        self.assertEqual(raiz.headers['cache-control'], 'no-cache')
        self.assertEqual(index.headers['cache-control'], 'no-cache')


if __name__ == '__main__':
    unittest.main()
