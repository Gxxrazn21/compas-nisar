"""La serie debe compartir referencia, escala y caché con sus cuadros."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image

from backend import series


class SeriesTests(unittest.TestCase):
    def test_frames_render_normalized_power_and_mask_not_raw_rgb(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'frame.webp'
            q = np.full((12, 12), .07, dtype=np.float32)  # -10 dB
            valid = np.ones(q.shape, bool)
            valid[0, 0] = False
            series.make_frame(q, valid, (0, 0, 12, 12), path)
            rgba = np.asarray(Image.open(path).convert('RGBA'))
            self.assertEqual(rgba[0, 0, 3], 0)
            self.assertEqual(rgba[6, 6, 3], 255)
            self.assertLess(abs(int(rgba[6, 6, 0]) - 90), 2)
            self.assertEqual(rgba[6, 6, 0], rgba[6, 6, 1])

    def test_series_declares_reference_scale_and_invalidates_method_cache(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / 'source.png'
            Image.fromarray(np.full((24, 24, 3), 128, np.uint8)).save(path)
            scenes = [dict(id=f's{i}', date=date, mode='A', analyzable=True,
                           browse_url='unused', polarizations=['HH', 'HV'],
                           granule=f'g{i}', quality='validated')
                      for i, date in enumerate(['2026-01-01', '2026-01-25'])]
            with patch.object(series, 'SERIES_DIR', root / 'series'), \
                 patch.object(series.browse, 'fetch_browse', return_value=path), \
                 patch.object(series.browse, 'resolve_gcov_grid', return_value=([0, 0, 1, 1], None)), \
                 patch.object(series.cache, 'prune_all'):
                first = series.build_series({'id': 'stack', 'scenes': scenes}, .5, .5)
                self.assertEqual(first['method']['reference_date'], '2026-01-25')
                self.assertEqual(first['method']['scale_db'], [-16, 1])
                self.assertIn('hv_url', first['frames'][0])
                with patch.object(series, 'SERIES_VERSION', series.SERIES_VERSION + 1):
                    second = series.build_series({'id': 'stack', 'scenes': scenes}, .5, .5)
                self.assertNotEqual(first['frames'][0]['url'], second['frames'][0]['url'])


if __name__ == '__main__':
    unittest.main()
