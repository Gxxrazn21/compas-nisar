"""Caché en memoria con caducidad, segura entre hilos."""
import threading
import time


class TtlCache:
    def __init__(self, max_items=256):
        self._data = {}
        self._lock = threading.Lock()
        self._max = max_items

    def get(self, key):
        """Devuelve (encontrado, valor)."""
        with self._lock:
            entry = self._data.get(key)
            if entry and entry[0] > time.monotonic():
                return True, entry[1]
            self._data.pop(key, None)
        return False, None

    def set(self, key, value, ttl):
        with self._lock:
            if len(self._data) >= self._max:
                now = time.monotonic()
                for old in [k for k, v in self._data.items() if v[0] <= now] or [next(iter(self._data))]:
                    self._data.pop(old, None)
            self._data[key] = (time.monotonic() + ttl, value)
