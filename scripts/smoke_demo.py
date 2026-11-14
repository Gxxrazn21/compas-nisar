"""Comprueba el paquete real con sockets de red bloqueados y sin token Earthdata."""
import sys
import socket
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend import config, demo
from backend.main import app


def main():
    original_connect = socket.socket.connect
    def local_connect(sock, address):
        # asyncio usa un socketpair en loopback para su propio bucle en Windows.
        if not isinstance(address, tuple) or address[0] not in ('127.0.0.1', '::1'):
            raise AssertionError('La demo intentó usar la red externa')
        return original_connect(sock, address)
    with patch('socket.socket.connect', local_connect), \
         patch.object(config, 'EARTHDATA_TOKEN', ''), \
         patch.object(config, 'DERIVED_DIR', config.DATA_DIR / 'cache-inexistente-para-prueba'):
        client = TestClient(app)
        response = client.get('/api/demo/mojana')
        assert response.status_code == 200, response.text
        package = response.json()
        assets = [name for name in package['manifest']['files'] if name.endswith('.webp')]
        for name in assets:
            response = client.get(demo.PREFIX + name)
            assert response.status_code == 200 and response.content, name
        for name in ('change', 'zoom'):
            result = package[name]
            w, s, e, n = result['bounds']
            response = client.get('/api/demo/mojana/probe', params={'change': result['id'], 'lon': (w + e) / 2, 'lat': (s + n) / 2})
            assert response.status_code == 200, response.text
        print(f'OK: paquete real, {len(assets)} imágenes y 2 sondas; sin red externa, token ni caché derivada.')


if __name__ == '__main__':
    main()
