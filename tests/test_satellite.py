"""Órbita de NISAR: el TLE se valida antes de entregarlo y la copia guardada cubre las caídas de red."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from backend import satellite
from backend.main import app

LINE1 = '1 65053U 25163A   26318.33841497  .00000208  00000+0  76025-4 0  9998'
LINE2 = '2 65053  98.4060 143.8397 0001241  89.6085 270.5247 14.42502322 68036'
TLE = f'NISAR                   \n{LINE1}\n{LINE2}\n'


def with_checksum(line):
    """Recalcula el último dígito de un renglón TLE."""
    total = sum(int(c) if c.isdigit() else 1 if c == '-' else 0 for c in line[:68])
    return line[:68] + str(total % 10)


class SatelliteTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.addCleanup(patch.stopall)
        patch.object(satellite, 'TLE_FILE', Path(self.temp.name) / 'tle.json').start()
        patch.object(satellite, '_memory', {}).start()

    def test_parse_reads_lines_and_epoch(self):
        data = satellite.parse_tle(TLE)
        self.assertEqual(data['norad_id'], 65053)
        self.assertEqual((data['line1'], data['line2']), (LINE1, LINE2))
        self.assertEqual(data['epoch'], '2026-11-14T08:07:19Z')

    def test_parse_rejects_damaged_or_foreign_tle(self):
        with self.assertRaises(ValueError):
            satellite.parse_tle(TLE.replace('98.4060', '98.4061'))      # suma de verificación
        with self.assertRaises(ValueError):
            satellite.parse_tle('No GP data found')
        otro = '\n'.join(with_checksum(line.replace('65053', '25544')) for line in (LINE1, LINE2))
        with self.assertRaises(ValueError):
            satellite.parse_tle(otro)                                   # válido, pero de otro satélite

    def test_download_is_cached_and_reused(self):
        with patch.object(satellite, '_download', return_value=TLE) as download:
            first = satellite.current_tle(now=1000)
            second = satellite.current_tle(now=1000 + satellite.TTL - 1)
        self.assertEqual(download.call_count, 1)
        self.assertEqual(first, second)
        self.assertNotIn('stale', first)

    def test_saved_copy_survives_restart_and_outage(self):
        with patch.object(satellite, '_download', return_value=TLE):
            satellite.current_tle(now=1000)
        satellite._memory.clear()                                       # reinicio del servidor
        with patch.object(satellite, '_download', side_effect=httpx.ConnectError('sin red')):
            later = satellite.current_tle(now=1000 + satellite.TTL + 1)
        self.assertTrue(later['stale'])
        self.assertEqual(later['epoch'], '2026-11-14T08:07:19Z')

    def test_outage_without_cache_serves_the_bundled_copy_marked_stale(self):
        with patch.object(satellite, '_download', side_effect=httpx.ConnectError('sin red')):
            response = TestClient(app).get('/api/satellite')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body['stale'])
        self.assertEqual((body['line1'], body['line2']), satellite.SEED)
        self.assertFalse(satellite.TLE_FILE.exists())               # la copia de respaldo no se guarda como reciente

    def test_bundled_copy_is_a_valid_nisar_tle(self):
        self.assertEqual(satellite.parse_tle('\n'.join(satellite.SEED))['norad_id'], satellite.NORAD_ID)


if __name__ == '__main__':
    unittest.main()
