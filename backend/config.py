"""Configuración compartida. La clave de NASA vive en .env y nunca sale del servidor."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'
CACHE_DIR = DATA_DIR / 'cache'
BROWSE_DIR = CACHE_DIR / 'browse'      # PNG originales de ASF (no se versionan)
DERIVED_DIR = CACHE_DIR / 'derived'    # capas calculadas; se sirven en /derived
STORIES_FILE = DATA_DIR / 'stories.json'

USER_AGENT = 'nisar-explorer/0.2'
CMR = 'https://cmr.earthdata.nasa.gov/search'
BROWSE_HOST = 'nisar.asf.earthdatacloud.nasa.gov'  # único host desde el que se descargan imágenes


def _read_env_file():
    path = ROOT / '.env'
    if not path.exists():
        return {}
    pairs = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            pairs[key.strip()] = value.strip().strip('"\'')
    return pairs


_env_file = _read_env_file()
NASA_API_KEY = os.environ.get('NASA_API_KEY') or _env_file.get('NASA_API_KEY') or ''
# Token de Earthdata Login (opcional): da acceso a los productos GCOV calibrados en ASF.
EARTHDATA_TOKEN = os.environ.get('EARTHDATA_TOKEN') or _env_file.get('EARTHDATA_TOKEN') or ''

for folder in (BROWSE_DIR, DERIVED_DIR):
    folder.mkdir(parents=True, exist_ok=True)
