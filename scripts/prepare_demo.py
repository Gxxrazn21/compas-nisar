"""Prepara La Mojana desde productos reales; --verify verifica sin red ni credenciales."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend import catalog, change, config, demo, series, zoom  # noqa: E402
from backend.errors import ApiError, NotFound, ServiceUnavailable  # noqa: E402


def prepare(destination=None):
    if not config.EARTHDATA_TOKEN:
        raise ServiceUnavailable('Falta EARTHDATA_TOKEN: no se preparó la demo. Configura Earthdata en .env.')
    stories = json.loads(config.STORIES_FILE.read_text(encoding='utf-8'))['stories']
    story = next((item for item in stories if item['id'] == 'mojana'), None)
    if story is None:
        raise NotFound('data/stories.json no contiene La Mojana.')
    stack = catalog.get_stack(story['stack'])
    selected = []
    for side in ('before', 'after'):
        scene = next((scene for scene in stack['scenes'] if scene['date'] == story[side]), None)
        if scene is None:
            raise NotFound(f'La fecha {story[side]} de La Mojana no está disponible en CMR.')
        selected.append(scene)
    before, after = selected
    lens = story['lupa']
    # RangeFile lee únicamente metadatos y bloques HDF5 de esta ventana, no descarga el producto entero.
    calibrated = zoom.compute_zoom(stack, before, after, lens['lon'], lens['lat'], lens['size_km'])
    result = change.compute_change(stack, before, after, story['aoi'])
    west, south, east, north = story['aoi']
    timeline = series.build_series(stack, (west + east) / 2, (south + north) / 2,
                                   maximum=12, radius=4, aoi=story['aoi'])
    return demo.write_package({'story': story, 'stack': catalog.stack_public(stack), 'change': result,
                               'zoom': calibrated, 'series': timeline}, destination)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true', help='Solo verifica el paquete existente, sin acceso a red.')
    args = parser.parse_args(argv)
    try:
        package = demo.read_package() if args.verify else prepare()
    except (ApiError, OSError, ValueError, KeyError) as error:
        # Mensajes de dominio no incluyen URLs firmadas ni tokens.
        print(getattr(error, 'detail', 'No se pudo preparar/verificar el paquete; revisa archivos y configuración.'),
              file=sys.stderr)
        return 1
    print(f"La Mojana verificada: {package['prepared_at']}; "
          f"{len(package['manifest']['files'])} archivos; "
          f"{sum(item['bytes'] for item in package['manifest']['files'].values()) / 1e6:.1f} MB.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
