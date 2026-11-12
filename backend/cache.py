"""Tope de tamaño de la caché en disco: borra lo más antiguo cuando se supera el límite."""
import shutil
import threading
import time

from . import config

DERIVED_MAX_BYTES = 1_500 * 1024 * 1024   # capas y arreglos calculados
BROWSE_MAX_BYTES = 2_000 * 1024 * 1024    # PNG originales de ASF y sus copias reducidas
MIN_AGE_SECONDS = 600                     # nunca se borra algo que pudo usarse hace menos de 10 minutos

_lock = threading.Lock()


def _size(path):
    if path.is_file():
        return path.stat().st_size
    return sum(item.stat().st_size for item in path.rglob('*') if item.is_file())


def _units(root, nested=()):
    """Unidades borrables de `root`: cada hijo directo, y cada hijo de las carpetas `nested`."""
    units = []
    if not root.exists():
        return units
    for child in root.iterdir():
        if child.name in nested and child.is_dir():
            units.extend(child.iterdir())
        elif not child.name.endswith(('.part', '.tmp')) and '.tmp-' not in child.name:
            units.append(child)
    return units


def prune(root, max_bytes, nested=(), now=None):
    """Borra las unidades más antiguas de `root` hasta quedar por debajo de `max_bytes`.

    Devuelve los bytes liberados. Las unidades usadas en los últimos 10 minutos no se tocan.
    """
    now = time.time() if now is None else now
    entries = []
    for unit in _units(root, nested):
        try:
            entries.append((unit.stat().st_mtime, _size(unit), unit))
        except OSError:
            continue
    total = sum(size for _, size, _ in entries)
    freed = 0
    for mtime, size, unit in sorted(entries, key=lambda entry: entry[0]):
        if total - freed <= max_bytes:
            break
        if now - mtime < MIN_AGE_SECONDS:
            continue
        if unit.is_dir():
            shutil.rmtree(unit, ignore_errors=True)
        else:
            unit.unlink(missing_ok=True)
        freed += size
    return freed


def prune_all():
    """Aplica los topes a toda la caché. Si ya hay una limpieza en curso, no hace nada."""
    if not _lock.acquire(blocking=False):
        return 0
    try:
        return (prune(config.DERIVED_DIR, DERIVED_MAX_BYTES, nested=('series',))
                + prune(config.BROWSE_DIR, BROWSE_MAX_BYTES, nested=('resized',)))
    finally:
        _lock.release()
