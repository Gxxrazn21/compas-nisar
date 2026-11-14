"""La demo conserva evidencia local y falla explícitamente cuando no puede verificarla."""
import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from fastapi.testclient import TestClient

from backend import change, config, zoom
from backend.main import app


class DemoTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(importlib.util.find_spec('backend.demo'), 'Falta el paquete de demo offline')
        from backend import demo
        self.demo = demo
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.derived = self.root / 'derived'
        self.package = self.root / 'mojana'
        self.payload = {
            'story': {'id': 'mojana', 'stack': '011_D_084', 'before': '2026-06-26', 'after': '2026-10-24'},
            'stack': {'id': '011_D_084', 'scenes': []},
            'series': {'method': {'version': demo.method_versions()['series']},
                       'series': [{'date': '2026-06-26', 'hh_db': -2.5}],
                       'frames': [{'date': '2026-06-26', 'url': '/derived/series/example/frame.webp'}]},
        }
        for section, ident, source, version in [('change', 'a' * 16, 'browse', change.METHOD_VERSION),
                                               ('zoom', 'b' * 16, 'gcov', f'gcov-{zoom.METHOD_VERSION}')]:
            folder = self.derived / ident
            folder.mkdir(parents=True)
            (folder / 'before.webp').write_bytes(b'real-layer-fixture')
            np.savez_compressed(folder / 'arrays.npz', valid=np.ones((2, 2), dtype=bool),
                                classes=np.ones((2, 2), dtype=np.uint8),
                                hh_before=np.full((2, 2), -12.0), hh_after=np.full((2, 2), -8.0))
            self.payload[section] = {
                'id': ident, 'stack': '011_D_084', 'source': source, 'bounds': [0, 0, 2, 2],
                'before': {'id': 'scene-a', 'date': '2026-06-26', 'granule': 'NISAR_GCOV_A',
                           'download_url': 'https://example.test/file?X-Amz-Signature=SECRET',
                           'thumbnail': '/api/image?url=https://example.test/a'},
                'after': {'id': 'scene-b', 'date': '2026-10-24', 'granule': 'NISAR_GCOV_B'},
                'method': {'version': version}, 'layers': {'before': f'/derived/{ident}/before.webp'},
                'stats': {'changed_km2': 1.25},
            }
        frame = self.derived / 'series/example/frame.webp'
        frame.parent.mkdir(parents=True)
        frame.write_bytes(b'frame-fixture')
        self.addCleanup(patch.stopall)
        patch.object(demo, 'PACKAGE_DIR', self.package).start()
        self.client = TestClient(app)

    def prepare(self):
        return self.demo.write_package(self.payload, self.package, self.derived)

    def test_absent_package_is_404_and_never_falls_back_to_network(self):
        with patch('backend.catalog.get_stack', side_effect=AssertionError('Sin red')):
            response = self.client.get('/api/demo/mojana')
        self.assertEqual(response.status_code, 404)

    def test_prepared_package_repeats_dates_values_assets_and_probe_without_upstream(self):
        self.prepare()
        with patch('backend.catalog.get_stack', side_effect=RuntimeError('CMR caído')), \
             patch('backend.zoom.compute_zoom', side_effect=RuntimeError('ASF caído')), \
             patch.object(config, 'DERIVED_DIR', self.root / 'cache-borrada'):
            first = self.client.get('/api/demo/mojana')
            second = self.client.get('/api/demo/mojana')
            self.assertEqual(first.status_code, 200)
            self.assertEqual(first.json(), second.json())
            body = first.json()
            self.assertEqual(body['zoom']['after']['date'], '2026-10-24')
            self.assertEqual(body['zoom']['stats']['changed_km2'], 1.25)
            self.assertEqual(body['series']['series'][0]['hh_db'], -2.5)
            self.assertEqual(self.client.get(body['zoom']['layers']['before']).content, b'real-layer-fixture')
            probe = self.client.get('/api/demo/mojana/probe', params={'change': 'a' * 16, 'lon': 1, 'lat': 1})
            self.assertEqual(probe.status_code, 200)
            self.assertEqual(probe.json()['hh'], {'before_db': -12.0, 'after_db': -8.0, 'delta_db': 4.0})
        serialized = first.text
        self.assertNotIn('SECRET', serialized)
        self.assertNotIn('download_url', serialized)
        self.assertNotIn('/api/image', serialized)

    def test_changed_file_is_503_for_both_payload_and_asset(self):
        self.prepare()
        body = self.client.get('/api/demo/mojana').json()
        url = body['zoom']['layers']['before']
        (self.package / url.split('/mojana/')[1]).write_bytes(b'corrupted')
        self.assertEqual(self.client.get('/api/demo/mojana').status_code, 503)
        self.assertEqual(self.client.get(url).status_code, 503)

    def test_hv_frames_are_copied_and_served_locally(self):
        frame = self.derived / 'series/example/hv.webp'
        frame.write_bytes(b'hv-fixture')
        self.payload['series']['frames'][0]['hv_url'] = '/derived/series/example/hv.webp'
        package = self.prepare()
        url = package['series']['frames'][0]['hv_url']
        self.assertTrue(url.startswith('/demo-data/mojana/'))
        self.assertEqual(self.client.get(url).content, b'hv-fixture')

    def test_inconsistent_series_version_cannot_be_published(self):
        self.payload['series']['method']['version'] = -1
        with self.assertRaises(self.demo.ServiceUnavailable):
            self.prepare()

    def test_missing_arrays_make_package_incomplete(self):
        self.prepare()
        next(self.package.rglob('arrays.npz')).unlink()
        self.assertEqual(self.client.get('/api/demo/mojana').status_code, 503)

    def test_new_method_rejects_old_package(self):
        self.prepare()
        with patch.object(zoom, 'METHOD_VERSION', 999):
            self.assertEqual(self.client.get('/api/demo/mojana').status_code, 503)

    def test_manifest_traversal_cannot_expose_file(self):
        self.prepare()
        manifest_path = self.package / 'manifest.json'
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        manifest['files']['../secret.txt'] = {'sha256': '0' * 64, 'bytes': 3}
        manifest_path.write_text(json.dumps(manifest), encoding='utf-8')
        self.assertEqual(self.client.get('/api/demo/mojana').status_code, 503)

    def test_unlisted_files_and_manifest_are_not_public(self):
        self.prepare()
        (self.package / 'secret.txt').write_text('secret')
        for path in ['secret.txt', 'manifest.json', 'payload.json', 'assets/%2e%2e/%2e%2e/secret.txt']:
            with self.subTest(path=path):
                self.assertEqual(self.client.get('/demo-data/mojana/' + path).status_code, 404)

    def test_preparer_refuses_traversing_source_and_preserves_existing_package(self):
        self.prepare()
        original = (self.package / 'manifest.json').read_bytes()
        self.payload['zoom']['layers']['before'] = '/derived/../secret.txt'
        with self.assertRaises((ValueError, self.demo.ServiceUnavailable)):
            self.prepare()
        self.assertEqual((self.package / 'manifest.json').read_bytes(), original)

    def test_failed_prepare_does_not_publish_partial_package(self):
        (self.derived / ('b' * 16) / 'arrays.npz').unlink()
        with self.assertRaises((OSError, ValueError, self.demo.ServiceUnavailable)):
            self.prepare()
        self.assertFalse((self.package / 'manifest.json').exists())

    def test_missing_token_preparation_fails_before_network(self):
        from scripts.prepare_demo import prepare
        with patch.object(config, 'EARTHDATA_TOKEN', ''), \
             patch('backend.catalog.get_stack', side_effect=AssertionError('Sin red')):
            with self.assertRaises(self.demo.ServiceUnavailable):
                prepare(self.package)
        self.assertFalse(self.package.exists())


if __name__ == '__main__':
    unittest.main()
