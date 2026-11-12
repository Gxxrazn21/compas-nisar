import os
import tempfile
import time
import unittest
from pathlib import Path

from backend import cache


def _unit(root, name, size, age_seconds, as_dir=False):
    path = Path(root) / name
    if as_dir:
        path.mkdir(parents=True)
        (path / 'data.bin').write_bytes(b'x' * size)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b'x' * size)
    stamp = time.time() - age_seconds
    os.utime(path, (stamp, stamp))
    return path


class PruneTests(unittest.TestCase):
    def test_removes_oldest_until_under_limit(self):
        with tempfile.TemporaryDirectory() as root:
            old = _unit(root, 'old', 400, 5000, as_dir=True)
            mid = _unit(root, 'mid', 400, 3000, as_dir=True)
            new = _unit(root, 'new', 400, 1000, as_dir=True)
            freed = cache.prune(Path(root), 900)
            self.assertEqual(freed, 400)
            self.assertFalse(old.exists())
            self.assertTrue(mid.exists() and new.exists())

    def test_keeps_recent_units_even_over_limit(self):
        with tempfile.TemporaryDirectory() as root:
            recent = _unit(root, 'recent.png', 500, 30)
            old = _unit(root, 'old.png', 500, 5000)
            cache.prune(Path(root), 100)
            self.assertTrue(recent.exists())
            self.assertFalse(old.exists())

    def test_nested_folder_children_are_separate_units(self):
        with tempfile.TemporaryDirectory() as root:
            first = _unit(root, 'series/a', 300, 5000, as_dir=True)
            second = _unit(root, 'series/b', 300, 900, as_dir=True)
            cache.prune(Path(root), 350, nested=('series',))
            self.assertFalse(first.exists())
            self.assertTrue(second.exists())
            self.assertTrue((Path(root) / 'series').exists())

    def test_under_limit_removes_nothing_and_skips_partial_downloads(self):
        with tempfile.TemporaryDirectory() as root:
            keep = _unit(root, 'keep.png', 100, 5000)
            partial = _unit(root, 'download.png.abc.part', 100, 5000)
            self.assertEqual(cache.prune(Path(root), 10_000), 0)
            cache.prune(Path(root), 50)
            self.assertFalse(keep.exists())
            self.assertTrue(partial.exists())

    def test_missing_folder_is_fine(self):
        self.assertEqual(cache.prune(Path('no-existe-esta-carpeta'), 10), 0)


if __name__ == '__main__':
    unittest.main()
