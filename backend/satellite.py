"""Órbita de NISAR: elementos orbitales (TLE) de CelesTrak, con copia en disco.

El servidor solo entrega los dos renglones del TLE; la posición se calcula en el navegador
(SGP4), segundo a segundo, sin más peticiones. CelesTrak publica elementos nuevos varias veces
al día y pide no consultarlos más seguido que cada dos horas.
"""
import json
import logging
import os
import re
import threading
import time
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter

from . import config

router = APIRouter()
log = logging.getLogger(__name__)

CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php'
NORAD_ID = 65053                      # NISAR, designación internacional 2025-163A
TTL = 3 * 60 * 60
TLE_FILE = config.CACHE_DIR / 'satellite' / f'{NORAD_ID}.json'
# Copia incluida con el código (CelesTrak, 14 de noviembre de 2026): sin red y sin caché, el satélite
# igual aparece. La interfaz muestra la antigüedad de los elementos y avisa cuando pasan de una semana.
SEED = ('1 65053U 25163A   26318.33841497  .00000208  00000+0  76025-4 0  9998',
        '2 65053  98.4060 143.8397 0001241  89.6085 270.5247 14.42502322 68036')

_lock = threading.Lock()
_memory = {}                          # 'tle' -> (marca_de_tiempo, payload)


def checksum_ok(line):
    """Suma de verificación de un renglón TLE: dígitos más uno por cada signo menos, módulo 10."""
    total = sum(int(c) if c.isdigit() else 1 if c == '-' else 0 for c in line[:68])
    return len(line) == 69 and line[68].isdigit() and total % 10 == int(line[68])


def epoch_iso(line1):
    """Época del TLE (columnas 19 a 32: año de dos cifras y día fraccionario) en ISO 8601 UTC."""
    year = int(line1[18:20])
    year += 2000 if year < 57 else 1900
    moment = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=float(line1[20:32]) - 1)
    return moment.isoformat(timespec='seconds').replace('+00:00', 'Z')


def parse_tle(text):
    """Extrae y valida los dos renglones del TLE de NISAR; ValueError si no es lo esperado."""
    lines = [line.rstrip() for line in text.splitlines() if line.strip()]
    line1 = next((line for line in lines if line.startswith('1 ')), None)
    line2 = next((line for line in lines if line.startswith('2 ')), None)
    if not line1 or not line2 or not checksum_ok(line1) or not checksum_ok(line2):
        raise ValueError('TLE incompleto o con suma de verificación incorrecta')
    if not re.fullmatch(r'\s*0*%d' % NORAD_ID, line1[2:7]) or line1[2:7] != line2[2:7]:
        raise ValueError('El TLE no corresponde a NISAR')
    return {'name': 'NISAR', 'norad_id': NORAD_ID, 'line1': line1, 'line2': line2,
            'epoch': epoch_iso(line1), 'source': 'CelesTrak'}


def _download():
    with httpx.Client(timeout=20, follow_redirects=True, headers={'User-Agent': config.USER_AGENT}) as client:
        response = client.get(CELESTRAK_URL, params={'CATNR': NORAD_ID, 'FORMAT': 'TLE'})
        response.raise_for_status()
        return response.text


def _read_saved():
    try:
        saved = json.loads(TLE_FILE.read_text(encoding='utf-8'))
        parse_tle(f"{saved['line1']}\n{saved['line2']}")
        return float(saved['fetched']), saved
    except (OSError, ValueError, KeyError, TypeError):
        return None


def _save(payload):
    TLE_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary = TLE_FILE.with_name(f'{TLE_FILE.name}.{os.getpid()}.{threading.get_ident()}.tmp')
    temporary.write_text(json.dumps(payload), encoding='utf-8')
    os.replace(temporary, TLE_FILE)


def current_tle(now=None):
    """TLE vigente: memoria, disco o CelesTrak. Si CelesTrak falla se entrega la última copia, marcada `stale`."""
    now = time.time() if now is None else now
    with _lock:
        entry = _memory.get('tle') or _read_saved()
        if entry and now - entry[0] < TTL:
            _memory['tle'] = entry
            return entry[1]
        try:
            payload = {**parse_tle(_download()), 'fetched': now}
        except (httpx.HTTPError, ValueError) as error:
            log.warning('CelesTrak no entregó el TLE de NISAR (%s); se usa la última copia.', type(error).__name__)
            copy = entry[1] if entry else parse_tle('\n'.join(SEED))
            return {**copy, 'stale': True}
        _memory['tle'] = (now, payload)
        _save(payload)
        return payload


@router.get('/api/satellite')
def satellite():
    """Elementos orbitales de NISAR para calcular su posición en el navegador."""
    return current_tle()
