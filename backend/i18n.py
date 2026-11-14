"""Idioma de los mensajes de error que ve la persona.

Los módulos lanzan sus errores con el texto en español. Este módulo los pasa al inglés, que es el
idioma principal de la aplicación, salvo que la petición pida español con la cabecera
Accept-Language (la interfaz la envía con el idioma elegido). Un mensaje sin traducción se
devuelve tal cual: nunca se pierde información.
"""
import re

IDIOMAS = ('en', 'es')
PREDETERMINADO = 'en'

# Nombres de servicio que llegan interpolados en los mensajes de backend/net.py.
_SERVICIOS = {
    'el servicio externo': 'the external service',
    'el catálogo de NASA CMR': 'the NASA CMR catalog',
    'el KML de ASF': 'the ASF KML file',
}
_ETIQUETAS = {'antes': 'before', 'después': 'after'}


def _servicio(nombre):
    clave = nombre[0].lower() + nombre[1:]
    return _SERVICIOS.get(clave, nombre)


def _mayuscula(texto):
    return texto[0].upper() + texto[1:]


# (patrón del mensaje en español, plantilla en inglés o función que recibe la coincidencia)
_TABLA = [
    # net.py
    (r'No fue posible consultar (.+)\. Reintenta en unos momentos; no se sustituyeron los datos\.',
     lambda m: f'Could not reach {_servicio(m[1])}. Try again in a moment; no data was substituted.'),
    (r'(.+) respondió con el código (\d+)\. Reintenta en unos momentos; no se sustituyeron los datos\.',
     lambda m: f'{_mayuscula(_servicio(m[1]))} answered with status {m[2]}. '
               'Try again in a moment; no data was substituted.'),
    (r'No fue posible consultar (.+)\.', lambda m: f'Could not reach {_servicio(m[1])}.'),
    # main.py
    (r'Parámetros ausentes o inválidos: consulta\.', 'Missing or invalid parameters: query.'),
    (r'Parámetros ausentes o inválidos: (.+)\.', r'Missing or invalid parameters: \1.'),
    (r'Coordenadas fuera de rango: lon entre -180 y 180, lat entre -90 y 90\.',
     'Coordinates out of range: lon between -180 and 180, lat between -90 and 90.'),
    (r'La fecha «(.+)» debe tener el formato AAAA-MM-DD\.', r'The date "\1" must use the format YYYY-MM-DD.'),
    (r'La pila (\S+) no tiene una escena del (\S+) \(disponibles entre (\S+) y (\S+)\)\.',
     r'Stack \1 has no scene on \2 (available between \3 and \4).'),
    (r'La fecha «before» debe ser anterior a «after»\.', 'The "before" date must be earlier than "after".'),
    (r'El parámetro «(\w+)» debe estar entre (\d+) y (\d+)\.', r'The "\1" parameter must be between \2 and \3.'),
    (r'El ancho «w» debe estar entre (\d+) y (\d+)\.', r'The width "w" must be between \1 and \2.'),
    (r'data/stories\.json no se pudo leer como JSON válido\.', 'data/stories.json could not be read as valid JSON.'),
    # catalog.py
    (r'NASA CMR devolvió una respuesta que no se pudo leer; no se sustituyeron los datos\.',
     'NASA CMR returned a response that could not be read; no data was substituted.'),
    (r'El identificador de pila debe tener la forma 011_D_084\.', 'The stack identifier must look like 011_D_084.'),
    (r'No hay datos GCOV para la pila (\S+)\.', r'There is no GCOV data for stack \1.'),
    # geo.py
    (r'El área \(aoi\) debe ser «oeste,sur,este,norte» con oeste < este y sur < norte\.',
     'The area (aoi) must be "west,south,east,north" with west < east and south < north.'),
    (r'El área \(aoi\) no se cruza con el cuadro de esta pila\.',
     'The area (aoi) does not overlap the frame of this stack.'),
    (r'La imagen no tiene suficientes píxeles con dato para georreferenciarla\.',
     'The image does not have enough pixels with data to georeference it.'),
    # browse.py
    (r'Solo se aceptan imágenes browse PNG de (\S+) por https\.',
     r'Only PNG browse images from \1 over https are accepted.'),
    (r'ASF respondió (\d+) al pedir la imagen; puede no estar disponible públicamente\.',
     r'ASF answered \1 when asked for the image; it may not be publicly available.'),
    (r'La imagen supera el tamaño máximo permitido \(40 MB\)\.', 'The image is larger than the 40 MB limit.'),
    (r'No fue posible descargar la imagen desde ASF\. Reintenta en unos momentos\.',
     'Could not download the image from ASF. Try again in a moment.'),
    (r'ASF devolvió un archivo que no es una imagen PNG\.', 'ASF returned a file that is not a PNG image.'),
    # series.py
    (r'La pila (\S+) no tiene escenas analizables\.', r'Stack \1 has no scenes that can be analyzed.'),
    (r'El punto no está dentro del cuadro de esta pila\.', 'The point is not inside the frame of this stack.'),
    # change.py
    (r'Las dos imágenes no tienen el mismo tamaño: no son comparables píxel a píxel\.',
     'The two images are not the same size: they cannot be compared pixel by pixel.'),
    (r'Las dos escenas no comparten píxeles con dato\.', 'The two scenes share no pixels with data.'),
    (r'El identificador de cambio no es válido\.', 'The change identifier is not valid.'),
    (r'Ese cambio no está calculado; pídelo primero con /api/change\.',
     'That change has not been computed yet; request it first with /api/change.'),
    (r'La escena del (\S+) \((antes|después)\) no es analizable: las escenas beta no tienen una cuadrícula '
     r'comparable píxel a píxel\. Elige una fecha provisional o validada\.',
     lambda m: f'The scene from {m[1]} ({_ETIQUETAS[m[2]]}) cannot be analyzed: beta scenes do not have a grid '
               'that can be compared pixel by pixel. Choose a provisional or validated date.'),
    (r'La fecha «antes» debe ser anterior a la fecha «después»\.',
     'The "before" date must be earlier than the "after" date.'),
    (r'Las escenas del (\S+) \(modo (\S+)\) y del (\S+) \(modo (\S+)\) se adquirieron en modos distintos: '
     r'compararlas produce franjas falsas\. Elige dos fechas del mismo modo\.',
     r'The scenes from \1 (mode \2) and \3 (mode \4) were acquired in different modes: comparing them '
     r'produces false stripes. Choose two dates in the same mode.'),
    # rangefile.py y zoom.py
    (r'Solo se aceptan archivos \.h5 de (\S+) por https\.', r'Only .h5 files from \1 over https are accepted.'),
    (r'ASF rechazó el token de Earthdata\. Inicia sesión una vez en https://urs\.earthdata\.nasa\.gov con la '
     r'misma cuenta, acepta los términos de ASF \(Alaska Satellite Facility\) y vuelve a generar el token si '
     r'caducó; después reintenta\.',
     'ASF rejected the Earthdata token. Sign in once at https://urs.earthdata.nasa.gov with the same account, '
     'accept the ASF (Alaska Satellite Facility) terms and generate the token again if it expired; then retry.'),
    (r'Falta EARTHDATA_TOKEN en \.env: la lupa calibrada lee el producto GCOV completo de ASF y necesita un '
     r'token de Earthdata Login \(https://urs\.earthdata\.nasa\.gov/profile → Generate Token\)\.',
     'EARTHDATA_TOKEN is missing in .env: the calibrated zoom reads the full GCOV product from ASF and needs an '
     'Earthdata Login token (https://urs.earthdata.nasa.gov/profile → Generate Token).'),
    (r'Falta EARTHDATA_TOKEN en \.env: la lupa calibrada lee el producto GCOV completo de ASF y necesita un '
     r'token de Earthdata Login\.',
     'EARTHDATA_TOKEN is missing in .env: the calibrated zoom reads the full GCOV product from ASF and needs an '
     'Earthdata Login token.'),
    (r'No fue posible contactar a ASF para firmar la descarga\. Reintenta en unos momentos\.',
     'Could not reach ASF to sign the download. Try again in a moment.'),
    (r'ASF redirigió a una dirección que no usa https; se descartó\.',
     'ASF redirected to an address that does not use https; it was discarded.'),
    (r'ASF respondió (\d+) al firmar la descarga del producto\.',
     r'ASF answered \1 while signing the product download.'),
    (r'ASF encadenó demasiadas redirecciones al firmar la descarga\.',
     'ASF chained too many redirects while signing the download.'),
    (r'ASF devolvió un fragmento incompleto del producto\.', 'ASF returned an incomplete chunk of the product.'),
    (r'Se perdió la conexión con ASF al leer el producto\. Reintenta\.',
     'The connection to ASF was lost while reading the product. Try again.'),
    (r'ASF respondió (\d+) al leer el producto\.', r'ASF answered \1 while reading the product.'),
    (r'No fue posible medir el tamaño del producto en ASF\.', 'Could not measure the size of the product at ASF.'),
    (r'ASF devolvió un producto que h5py no pudo abrir como GCOV de NISAR\.',
     'ASF returned a product that h5py could not open as a NISAR GCOV file.'),
    (r'La escena del (\S+) no tiene archivo \.h5 en el catálogo\.', r'The scene from \1 has no .h5 file in the catalog.'),
    (r'El producto GCOV no tiene los datasets esperados \(HHHH/HVHV\)\.',
     'The GCOV product does not have the expected datasets (HHHH/HVHV).'),
    (r'Se interrumpió la lectura del producto GCOV en ASF\. Reintenta en unos momentos\.',
     'Reading the GCOV product at ASF was interrupted. Try again in a moment.'),
    # gcov.py
    (r'El producto GCOV no trae la proyección o las coordenadas esperadas\.',
     'The GCOV product does not carry the expected projection or coordinates.'),
    (r'El producto GCOV tiene una cuadrícula demasiado pequeña\.', 'The GCOV product has a grid that is too small.'),
    (r'Las dos fechas usan proyecciones distintas \(EPSG (\d+) y (\d+)\): no son comparables píxel a píxel\.',
     r'The two dates use different projections (EPSG \1 and \2): they cannot be compared pixel by pixel.'),
    (r'Las dos fechas tienen distinto tamaño de píxel: no son comparables\.',
     'The two dates have different pixel sizes: they cannot be compared.'),
    (r'Las cuadrículas de las dos fechas no coinciden \(desfase de fracción de píxel\): no se pueden comparar '
     r'sin remuestrear\.',
     'The grids of the two dates do not line up (sub-pixel offset): they cannot be compared without resampling.'),
    (r'El punto queda fuera de la cobertura común de las dos escenas \(o demasiado cerca del borde\)\.',
     'The point is outside the area both scenes cover (or too close to the edge).'),
    (r'Las dos escenas no comparten píxeles con dato en esta ventana\.',
     'The two scenes share no pixels with data in this window.'),
    # extras.py y places.py
    (r'No se pudo consultar EONET y no hay copia en caché\. Inténtalo de nuevo en unos minutos\.',
     'Could not reach EONET and there is no cached copy. Try again in a few minutes.'),
    (r'Falta NASA_API_KEY en \.env', 'NASA_API_KEY is missing in .env'),
    (r'No se pudo consultar la API EPIC de NASA\.', 'Could not reach the NASA EPIC API.'),
    (r'No se pudo descargar la imagen de EPIC\.', 'Could not download the EPIC image.'),
    (r'Escribe al menos dos letras para buscar un lugar\.', 'Type at least two letters to search for a place.'),
    (r'No se pudo consultar el buscador de lugares\. Inténtalo de nuevo o usa coordenadas\.',
     'Could not reach the place search. Try again or use coordinates.'),
]
_COMPILADA = [(re.compile(patron), salida) for patron, salida in _TABLA]


def request_lang(cabecera):
    """Idioma pedido en Accept-Language: el primero de la lista si es español o inglés; si no, inglés."""
    primero = (cabecera or '').split(',')[0].split(';')[0].strip().lower()
    codigo = primero.split('-')[0]
    return codigo if codigo in IDIOMAS else PREDETERMINADO


def translate(detail, lang):
    """Mensaje en el idioma pedido. Si no hay traducción, se devuelve el original."""
    if lang == 'es' or not isinstance(detail, str):
        return detail
    for patron, salida in _COMPILADA:
        coincidencia = patron.fullmatch(detail)
        if coincidencia:
            return salida(coincidencia) if callable(salida) else coincidencia.expand(salida)
    return detail
