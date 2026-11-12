"""Catálogo NISAR en NASA CMR: consultas umm_json, normalización a escenas y pilas, urgentes e
interferogramas. La normalización es pura (sin red) para poder probarla con respuestas grabadas."""
import re
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote, urlparse

from . import browse, config, geo, net
from .errors import InvalidInput, NotFound, UpstreamError
from .ttl import TtlCache

CMR_GRANULES = f'{config.CMR}/granules.umm_json'
QUALITY_BY_COLLECTION = {
    'NISAR_L2_GCOV_V1': 'validated',
    'NISAR_L2_GCOV_PROVISIONAL_V1': 'provisional',
    'NISAR_L2_GCOV_BETA_V1': 'beta',
}
QUALITY_RANK = {'validated': 3, 'provisional': 2, 'beta': 1}
STACK_RE = re.compile(r'^\d{1,3}_[AD]_\d{1,3}$')
CMR_NOMBRE = 'el catálogo de NASA CMR'

_consultas = TtlCache(128)


# ---------------------------------------------------------------- normalización (pura)

def proxy_url(url, ancho):
    """URL del proxy de imágenes del propio backend."""
    return f'/api/image?url={quote(url, safe="")}&w={ancho}'


def _https_urls(umm):
    """URLs https únicas del host de ASF, en orden. Las s3:// duplicadas se descartan."""
    vistas, salida = set(), []
    for relacion in umm.get('RelatedUrls', []):
        url = relacion.get('URL', '')
        partes = urlparse(url)
        if partes.scheme == 'https' and partes.hostname == config.BROWSE_HOST and url not in vistas:
            vistas.add(url)
            salida.append(url)
    return salida


def _atributos(umm):
    return {a['Name']: a.get('Values', []) for a in umm.get('AdditionalAttributes', []) if 'Name' in a}


def _huella(umm):
    try:
        puntos = umm['SpatialExtent']['HorizontalSpatialDomain']['Geometry']['GPolygons'][0]['Boundary']['Points']
    except (KeyError, IndexError, TypeError):
        return None
    anillo = [[p['Longitude'], p['Latitude']] for p in puntos]
    if len(anillo) < 3:
        return None
    if anillo[0] != anillo[-1]:
        anillo.append(anillo[0])
    return {'type': 'Polygon', 'coordinates': [anillo]}


def _entero(valores):
    try:
        return int(valores[0])
    except (IndexError, ValueError, TypeError):
        return None


def normalize_granule(item):
    """Convierte un ítem UMM de CMR en un registro interno; None si no sirve (sin fecha/colección)."""
    umm = item.get('umm', {})
    coleccion = umm.get('CollectionReference', {}).get('ShortName', '')
    try:
        inicio = umm['TemporalExtent']['RangeDateTime']['BeginningDateTime']
        granulo = umm['GranuleUR']
    except KeyError:
        return None
    urls = _https_urls(umm)
    latlon = next((u for u in urls if u.endswith('_LATLON.png')), None)
    simple = next((u for u in urls if u.endswith('.png') and not any(
        marca in u for marca in ('_thumbnail', '_NATIVE', '_LATLON'))), None)
    miniatura = next((u for u in urls if u.endswith('_LATLON_thumbnail.png')), None) or next(
        (u for u in urls if u.endswith('_thumbnail.png')), None)
    atributos = _atributos(umm)
    partes = granulo.split('_')
    calidad = QUALITY_BY_COLLECTION.get(coleccion)
    return {
        'id': item.get('meta', {}).get('concept-id', granulo),
        'granule': granulo,
        'date': inicio[:10],
        'datetime': inicio[:19] + 'Z',
        'cycle': _entero(partes[4:5]),
        'mode': '_'.join(partes[8:10]) if len(partes) > 9 else None,
        'collection': coleccion,
        'quality': calidad,
        # Solo es comparable píxel a píxel el browse _LATLON de colecciones no beta.
        'analyzable': calidad in ('validated', 'provisional') and latlon is not None,
        'browse_url': latlon or simple,
        'thumbnail_url': miniatura,
        'download_url': next((u for u in urls if u.endswith('.h5')), None),
        'kml_url': next((u for u in urls if u.endswith('_LATLON.kml')), None),
        'stack_id': (atributos.get('STACK_ID') or [None])[0],
        'track': _entero(atributos.get('TRACK_NUMBER', [])),
        'frame': _entero(atributos.get('FRAME_NUMBER', [])),
        'direction': (atributos.get('ASCENDING_DESCENDING') or [None])[0],
        'polarizations': list(atributos.get('FREQUENCY_A_POLARIZATION', [])),
        'footprint': _huella(umm),
    }


def scene_public(registro):
    """Escena tal como la entrega el contrato de la API."""
    return {
        'id': registro['id'],
        'granule': registro['granule'],
        'date': registro['date'],
        'datetime': registro['datetime'],
        'cycle': registro['cycle'],
        'mode': registro['mode'],
        'collection': registro['collection'],
        'quality': registro['quality'],
        'analyzable': registro['analyzable'],
        'thumbnail': proxy_url(registro['thumbnail_url'], 100) if registro['thumbnail_url'] else None,
        'browse_url': registro['browse_url'],
        'download_url': registro['download_url'],
    }


def dedupe_by_date(registros):
    """Una escena por fecha: prefiere las analizables y luego validada > provisional > beta."""
    mejores = {}
    for registro in registros:
        clave = (registro['analyzable'], QUALITY_RANK[registro['quality']])
        actual = mejores.get(registro['date'])
        if actual is None or clave > (actual['analyzable'], QUALITY_RANK[actual['quality']]):
            mejores[registro['date']] = registro
    return [mejores[fecha] for fecha in sorted(mejores)]


def build_stacks(registros):
    """Agrupa registros GCOV por STACK_ID. Devuelve pilas internas ordenadas por fechas analizables."""
    grupos = {}
    for registro in registros:
        if registro and registro['quality'] and registro['stack_id']:
            grupos.setdefault(registro['stack_id'], []).append(registro)
    pilas = []
    for stack_id, grupo in grupos.items():
        escenas = dedupe_by_date(grupo)
        con_huella = [e for e in escenas if e['footprint']]
        if not con_huella:
            continue
        recientes = [e for e in escenas if e['analyzable']] or escenas
        referencia = recientes[-1]
        pilas.append({
            'id': stack_id,
            'track': referencia['track'],
            'frame': referencia['frame'],
            'direction': referencia['direction'],
            'polarizations': referencia['polarizations'],
            'footprint': con_huella[-1]['footprint'],
            'first': escenas[0]['date'],
            'last': escenas[-1]['date'],
            'analyzable_count': sum(1 for e in escenas if e['analyzable']),
            'scenes': escenas,
        })
    pilas.sort(key=lambda p: (p['analyzable_count'], p['last'], p['id']), reverse=True)
    return pilas


def stack_public(pila):
    return {
        'id': pila['id'], 'track': pila['track'], 'frame': pila['frame'],
        'direction': pila['direction'], 'polarizations': pila['polarizations'],
        'footprint': pila['footprint'], 'first': pila['first'], 'last': pila['last'],
        'analyzable_count': pila['analyzable_count'],
        'scenes': [scene_public(e) for e in pila['scenes']],
    }


def _fecha_compacta(texto):
    return f'{texto[:4]}-{texto[4:6]}-{texto[6:8]}'


def normalize_interferogram(registro):
    """Añade las fechas de referencia y secundaria (posiciones 11 y 13 del nombre)."""
    partes = registro['granule'].split('_')
    try:
        registro = dict(registro,
                        reference_date=_fecha_compacta(partes[11]),
                        secondary_date=_fecha_compacta(partes[13]))
    except IndexError:
        return None
    return registro


def normalize_urgent(registro):
    partes = registro['granule'].split('_')
    return {
        'granule': registro['granule'],
        'product': partes[3] if len(partes) > 3 else None,
        'datetime': registro['datetime'],
        'stack': registro['stack_id'],
        'footprint': registro['footprint'],
        'center': geo.polygon_center(registro['footprint']),
        'thumbnail': proxy_url(registro['thumbnail_url'], 100) if registro['thumbnail_url'] else None,
        'browse_url': registro['browse_url'],
    }


# ---------------------------------------------------------------- consultas a CMR

def _consultar(params, ttl=600):
    """Consulta de granules (umm_json) con caché breve. Errores de red → UpstreamError."""
    clave = tuple(params)
    encontrado, items = _consultas.get(clave)
    if encontrado:
        return items
    respuesta = net.get(CMR_GRANULES, params=list(params), what=CMR_NOMBRE)
    try:
        items = respuesta.json()['items']
    except (ValueError, KeyError, TypeError) as error:
        raise UpstreamError('NASA CMR devolvió una respuesta que no se pudo leer; '
                            'no se sustituyeron los datos.') from error
    _consultas.set(clave, items, ttl)
    return items


def _gcov_params():
    return [('short_name', 'NISAR_L2_GCOV*'), ('options[short_name][pattern]', 'true'),
            ('page_size', '2000'), ('sort_key', 'start_date')]


def stacks_at_point(lon, lat):
    """Pilas GCOV internas que cubren el punto."""
    items = _consultar(_gcov_params() + [('point', f'{lon},{lat}')])
    return build_stacks([normalize_granule(i) for i in items])


def get_stack(stack_id):
    """Pila interna por identificador; NotFound si no existe."""
    if not STACK_RE.match(stack_id or ''):
        raise InvalidInput('El identificador de pila debe tener la forma 011_D_084.')
    items = _consultar(_gcov_params() + [('attribute[]', f'string,STACK_ID,{stack_id}')])
    pilas = [p for p in build_stacks([normalize_granule(i) for i in items]) if p['id'] == stack_id]
    if not pilas:
        raise NotFound(f'No hay datos GCOV para la pila {stack_id}.')
    return pilas[0]


def urgent_scenes(limit=30):
    """Últimas adquisiciones de respuesta urgente (NISAR_UR_L2) con browse público."""
    params = [('short_name', 'NISAR_UR_L2'), ('sort_key', '-start_date'),
              ('page_size', str(min(max(limit * 2, 10), 200)))]
    registros = [normalize_granule(i) for i in _consultar(params, ttl=120)]
    salida = []
    for registro in registros:
        if registro and registro['footprint'] and registro['browse_url'] and registro['browse_url'].endswith('_LATLON.png'):
            salida.append(normalize_urgent(registro))
    return salida[:limit]


def _interferograma(registro):
    """Interferograma listo para superponer: descarga el browse y resuelve su georreferencia."""
    ruta = browse.fetch_browse(registro['browse_url'])
    alfa = browse.load_array(ruta, 'RGBA')[..., 3]
    caja, georef = browse.resolve_overlay(registro, alfa > 0)
    return {
        'granule': registro['granule'],
        'reference_date': registro['reference_date'],
        'secondary_date': registro['secondary_date'],
        'track': registro['track'],
        'frame': registro['frame'],
        'direction': registro['direction'],
        'image': proxy_url(registro['browse_url'], 1400),
        'coordinates': geo.corner_coordinates(caja),
        'georef': georef,
        'footprint': registro['footprint'],
    }


def interferograms_at_point(lon, lat, limit=8):
    """Interferogramas GUNW más recientes sobre un punto (los que fallen se omiten salvo que fallen todos)."""
    params = [('short_name', 'NISAR_L2_GUNW*'), ('options[short_name][pattern]', 'true'),
              ('point', f'{lon},{lat}'), ('sort_key', '-start_date'), ('page_size', str(min(limit * 2, 60)))]
    registros = []
    for item in _consultar(params, ttl=300):
        registro = normalize_granule(item)
        if registro is None:
            continue
        registro = normalize_interferogram(registro)
        if registro and registro['footprint'] and (registro['browse_url'] or '').endswith('_LATLON.png'):
            registros.append(registro)
    registros = registros[:limit]
    if not registros:
        return []
    with ThreadPoolExecutor(max_workers=4) as pool:
        resultados = list(pool.map(_intentar, [(_interferograma, r) for r in registros]))
    buenos = [r for r in resultados if not isinstance(r, Exception)]
    if not buenos:
        raise resultados[0]
    return buenos


def _intentar(par):
    funcion, argumento = par
    try:
        return funcion(argumento)
    except (UpstreamError, InvalidInput) as error:
        return error
