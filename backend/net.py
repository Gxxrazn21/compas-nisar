"""Cliente HTTP compartido (httpx.Client es seguro entre hilos) con reintentos y errores en español."""
import time

import httpx

from . import config
from .errors import UpstreamError

client = httpx.Client(
    timeout=httpx.Timeout(90.0, connect=15.0),
    follow_redirects=True,
    headers={'User-Agent': config.USER_AGENT},
    limits=httpx.Limits(max_connections=16),
)


def get(url, *, params=None, headers=None, what='el servicio externo', ok=(200,), attempts=3):
    """GET con reintentos ante fallos de red o 5xx. Códigos fuera de `ok` → UpstreamError."""
    for intento in range(attempts):
        ultimo = intento == attempts - 1
        try:
            respuesta = client.get(url, params=params, headers=headers)
        except httpx.HTTPError as error:
            if ultimo:
                raise UpstreamError(
                    f'No fue posible consultar {what}. Reintenta en unos momentos; '
                    'no se sustituyeron los datos.') from error
            time.sleep(0.8 * (intento + 1))
            continue
        if respuesta.status_code in ok:
            return respuesta
        if respuesta.status_code >= 500 and not ultimo:
            time.sleep(0.8 * (intento + 1))
            continue
        raise UpstreamError(
            f'{what[0].upper()}{what[1:]} respondió con el código {respuesta.status_code}. '
            'Reintenta en unos momentos; no se sustituyeron los datos.')
    raise UpstreamError(f'No fue posible consultar {what}.')  # inalcanzable, por claridad
