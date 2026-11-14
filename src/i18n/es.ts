// Diccionario en español (define las claves; el idioma por defecto de la app es el inglés). Los marcadores {nombre} se reemplazan al usar t().
export const es = {
  'score.fixedPair': 'Comparación guardada: fechas fijas',
  'score.channel': 'Escuchar',
  'score.scaleShort': 'Qué suena',
  'score.pointSelected': 'punto elegido: {lat}, {lon}',
  'score.pointCenter': 'centro del área: {lat}, {lon}',
  'score.noPoint': 'sin punto elegido',
  'score.scale': 'HH y HV comparten una escala de −16 a +1 dB aproximados, relativos a la escena. Más retorno produce una nota más aguda. Son mediciones convertidas en sonido, no audio captado por el satélite. La normalización independiente de cada canal no permite comparar su potencia absoluta.',
  'score.timing': 'Se reproduce una observación cada 0,7 segundos. Las fechas y los intervalos indican el tiempo real; una adquisición ausente no se interpola.',
  'score.reference': 'Las imágenes son las vistas previas a color de cada pasada (HH en lila, HV en verde). Las notas se normalizan a la referencia del {date} y promedian una ventana de radio {radius} píxeles alrededor del punto.',
  'score.noValue': 'sin valor de retorno',
  'score.value': '{channel}: {db} dB aproximados',
  'dance.first': 'Primera observación',
  'dance.gap': '{days} días desde la observación anterior',
  'dance.partial': 'Reproducción parcial: {n} de {total} imágenes no cargaron.',
  'dance.failed': 'No cargaron {n} de {total} imágenes.',
  'dance.retry': 'Reintentar imágenes',
  'brand': 'compás',
  'doc.title': 'Compás, el radar NISAR en el tiempo',
  'top.method': 'Método',
  'top.langLabel': 'Idioma',
  'top.home': 'Compás, ir a la portada',
  'top.back': 'Todas las historias',

  'cover.title': 'Cada 12 días, un radar escucha cómo cambia la Tierra',
  'cover.tempo': 'programa de historias',
  'cover.intro':
    'NISAR atraviesa las nubes y la noche. Elige una historia y mira qué cambió entre dos de sus pasadas.',
  'cover.programLabel': 'Historias disponibles',
  'cover.loadingStories': 'Buscando las historias en el servidor…',
  'cover.storiesError':
    'No se pudieron cargar las historias. Revisa que el servidor de Compás esté encendido y vuelve a intentarlo.',
  'cover.earth': 'La Tierra hoy, {date}',
  'cover.earthAlt': 'Imagen de la Tierra completa tomada por el satélite DSCOVR',

  'story.panelLabel': 'Guía de la historia',
  'story.stepOf': 'Paso {n} de {total}',
  'story.steps': 'Pasos de la historia',
  'story.prev': 'Anterior',
  'story.next': 'Siguiente',
  'story.sources': 'Para saber más',
  'story.lens': 'Lente de lectura: {lens}',
  'story.comparing': 'Comparando {before} con {after}',
  'story.free.title': 'Comparación de la pila {stack}',
  'story.free.text': 'Elige dos notas en la partitura y pulsa «Comparar estas fechas».',
  'story.danceHint': 'Pide la serie completa de pasadas y reprodúcela sobre el mapa.',

  'load.title': 'Calculando el cambio',
  'load.fresh':
    'Si esta comparación es nueva, descargamos dos imágenes de NISAR de unos 5 MB cada una y las alineamos. Suele tardar entre 5 y 20 segundos.',
  'load.elapsed': 'Van {s} segundos.',
  'load.slow': 'Está tardando más de lo normal; el servicio de la NASA puede estar lento.',
  'err.title': 'No se pudo calcular el cambio',
  'err.network':
    'No hay conexión con el servidor de Compás. Comprueba que esté encendido y vuelve a intentarlo.',
  'err.notFound':
    'No hay datos de NISAR para ese par de fechas en este lugar. Prueba con otras dos pasadas de la partitura.',
  'err.invalid': 'Esas fechas no se pueden comparar: {detail}',
  'err.invalidPlain':
    'Esas fechas no se pueden comparar. Elige dos pasadas analizables del mismo modo de adquisición.',
  'err.upstream':
    'El servicio de imágenes de la NASA no respondió. Espera un momento y vuelve a intentarlo.',
  'err.generic': 'Algo falló al calcular el cambio. Vuelve a intentarlo en un momento.',
  'err.retry': 'Reintentar',

  'layer.group': 'Capa del mapa',
  'layer.before': 'Antes',
  'layer.after': 'Después',
  'layer.swipe': 'Cortina',
  'layer.change_hh': 'Cambio HH',
  'layer.change_hv': 'Cambio HV',
  'layer.classes': 'Señales',
  'layer.composite': 'Compuesto',
  'layer.hint.before': 'La pasada anterior, tal como la publica la NASA.',
  'layer.hint.after': 'La pasada posterior, tal como la publica la NASA.',
  'layer.hint.swipe': 'Arrastra la cortina para comparar antes y después.',
  'layer.hint.change_hh': 'Azul: el retorno bajó. Rojo: el retorno subió. Canal HH.',
  'layer.hint.change_hv': 'Azul: el retorno bajó. Rojo: el retorno subió. Canal HV.',
  'layer.hint.classes': 'Las clases de la lista, pintadas sobre el mapa.',
  'layer.hint.composite': 'Rojo: más señal después. Cian: más señal antes.',
  'map.opacity': 'Opacidad de la capa',
  'map.zoomIn': 'Acercar',
  'map.zoomOut': 'Alejar',
  'map.backToArea': 'Volver al área',
  'map.curtain': 'Cortina entre antes y después',
  'map.curtainBefore': 'Antes: {date}',
  'map.curtainAfter': 'Después: {date}',
  'map.label': 'Mapa interactivo del planeta',
  'map.attribution':
    'Imágenes satelitales: Esri, Maxar, Earthstar Geographics y la comunidad de usuarios de GIS. Radar: NISAR, NASA e ISRO, vía ASF.',
  'sheet.toggle': 'Mostrar u ocultar el panel',

  'read.title': 'Lectura',
  'read.summary':
    '{between} se registró un posible cambio en {changed} de los {valid} observados.',
  'read.summaryNone':
    '{between} no se registró cambio por encima del umbral en los {valid} observados.',
  'read.days': 'Entre ambas pasadas transcurrieron {days} días.',
  'conf.reason.missing': 'No se pudo medir la correlación HH entre fechas.',
  'conf.coverage': 'Cobertura común de datos: {value} de las celdas de esta ventana.',
  'conf.coverage.unknown': 'Cobertura numérica no disponible en este resultado guardado.',
  'conf.interpretation': 'Interpretación sin corroboración independiente: ninguna clase confirma un evento.',
  'conf.alta':
    'Calidad alta del ajuste global HH',
  'conf.media':
    'Calidad media del ajuste global HH',
  'conf.baja':
    'Calidad baja del ajuste global HH',
  'conf.reason.corr':
    'La correlación HH entre fechas es {value}. Puede reflejar cambios extensos o diferencias de estiramiento; no valida las clases.',
  'conf.reason.fit':
    'El {value} de los píxeles concuerda con el ajuste entre fechas; el criterio del método es al menos 80 %.',
  'conf.lead.media':
    'La normalización global tiene limitaciones. Las áreas clasificadas requieren verificación independiente.',
  'conf.lead.baja':
    'El ajuste global tiene poco respaldo. No se ha medido la exactitud de las clases ni de sus áreas.',

  'classes.title': 'Qué cambió',
  'classes.legend': 'Clases del mapa y su extensión',
  'classes.none': 'Ninguna zona superó el umbral de 3 dB entre estas dos fechas.',
  'classes.share': 'Cada barra se compara con la clase más extensa.',

  'probe.title': 'Un punto del mapa',
  'probe.hint': 'Haz clic en el mapa para ver cuánto cambió el retorno del radar en ese punto.',
  'probe.loading': 'Consultando el punto…',
  'probe.invalid': 'Ese punto queda fuera del cuadro o no tiene datos. Prueba en otro lugar.',
  'probe.error': 'No se pudo consultar ese punto. Intenta de nuevo.',
  'probe.before': 'Antes',
  'probe.after': 'Después',
  'probe.delta': 'Cambio',
  'probe.class': 'Clase',
  'probe.stable': 'Sin cambio por encima del umbral',
  'probe.note': 'Valores en dB relativos a la escena, no calibrados.',
  'probe.at': 'Punto {lon}, {lat}',
  'probe.marker': 'Punto sondeado',

  'hist.title': 'Cuánto cambió el retorno (HH)',
  'hist.axis': 'Cambio en dB aproximados',
  'hist.desc':
    'Histograma del cambio por píxel entre las dos fechas. A la izquierda el retorno bajó; a la derecha subió. Las líneas marcan el umbral de 3 dB.',

  'prov.title': 'Procedencia',
  'prov.before': 'Antes',
  'prov.after': 'Después',
  'prov.quality.validated': 'validada',
  'prov.quality.provisional': 'provisional',
  'prov.quality.beta': 'beta',
  'prov.track': 'Pista {track}, cuadro {frame}, trayectoria {direction}',
  'prov.direction.DESCENDING': 'descendente',
  'prov.direction.ASCENDING': 'ascendente',
  'prov.pol.dual': 'Polarización doble (HH y HV)',
  'prov.pol.single': 'Polarización simple (solo HH)',
  'prov.georef.kml': 'Esquinas tomadas del archivo KML oficial de la escena.',
  'prov.georef.stack-kml':
    'Esquinas tomadas del KML de otra escena de la misma pila; la cuadrícula es fija dentro de una pila.',
  'prov.georef.footprint':
    'Esquinas estimadas a partir de la huella publicada: error de entre 1 y 3 píxeles.',
  'prov.asf': 'Ver en ASF',
  'prov.asfLabel': 'Ver el producto del {date} en el buscador de ASF',
  'prov.mode': 'Modo de adquisición {mode}',
  'prov.cycle': 'ciclo {cycle}',

  'limits.title': 'Límites',
  'limits.1': 'Los decibelios son aproximados: vienen de imágenes de vista previa, no de datos calibrados.',
  'limits.2':
    'Se mide el cambio relativo al conjunto de la escena: lo que cambia por igual en todo el cuadro, como la humedad general tras lluvias, queda absorbido.',
  'limits.3':
    'Donde la superficie es muy oscura o muy brillante, el cambio real puede ser mayor que el mostrado.',
  'limits.4': 'Toda clase es una hipótesis, nunca un evento confirmado.',
  'limits.provisional': 'Al menos una de las escenas es provisional y puede cambiar al validarse.',
  'limits.method': 'Cómo se calcula, paso a paso',

  'score.title': 'Partitura',
  'score.tempo': 'cada 12 días',
  'score.label': 'Partitura de pasadas de NISAR: cada nota es una pasada del radar',
  'score.compare': 'Comparar estas fechas',
  'score.compareSame': 'Estas fechas ya están en el mapa.',
  'score.compareNeed': 'Elige primero las dos notas, antes y después.',
  'score.dance': 'Ver la danza',
  'score.pickBefore': 'Elige la nota de «antes».',
  'score.pickAfter': 'Ahora elige la nota de «después».',
  'score.ready': 'Listo: pulsa «Comparar estas fechas».',
  'score.before': 'antes',
  'score.after': 'después',
  'score.noteAria': '{date}, {quality}',
  'score.noteBefore': '{date}, {quality}, nota de antes',
  'score.noteAfter': '{date}, {quality}, nota de después',
  'score.blocked.not-analyzable':
    'Esta pasada es de la colección beta: solo tiene vista previa y no se puede comparar.',
  'score.blocked.other-mode':
    'Esa pasada se tomó en otro modo de adquisición ({mode}); solo se comparan fechas del mismo modo ({anchor}).',
  'score.blocked.same-date': 'Elige una fecha distinta a la de «antes».',
  'score.pitch': 'Cuanto más aguda la nota, más retorno del radar en el centro del área.',
  'score.loading': 'Cargando la partitura…',
  'score.error': 'No se pudo cargar la partitura de esta pila.',

  'dance.series': 'Pidiendo la serie de pasadas a NISAR. Van {s} segundos; la primera vez puede tardar hasta un minuto.',
  'dance.preload': 'Preparando los cuadros: {n} de {total}.',
  'dance.error': 'No se pudo preparar la danza. Vuelve a intentarlo.',
  'dance.errorDetail': 'No se pudo preparar la danza: {detail}',
  'dance.controls': 'Controles de la danza',
  'dance.play': 'Reproducir',
  'dance.pause': 'Pausa',
  'dance.stop': 'Salir de la danza',
  'dance.loop': 'Repetir',
  'dance.prev': 'Cuadro anterior',
  'dance.next': 'Cuadro siguiente',
  'dance.frame': 'Cuadro {n} de {total}, {date}',
  'dance.point': 'La nota sube o baja con el retorno {channel} en el punto marcado.',
  'dance.cancel': 'Cancelar',

  'method.title': 'Cómo se calcula el cambio',
  'method.close': 'Cerrar',
  'method.intro':
    'Compás no mide el terreno: compara dos fotografías de radar de la misma zona y señala dónde cambió la señal. Esta es la receta completa.',
  'method.s1.title': 'De dónde salen las imágenes',
  'method.s1.text':
    'NISAR es un radar de la NASA y la agencia espacial india (ISRO). Pasa por el mismo lugar cada 12 días y lo ve de noche y a través de las nubes. Usamos las imágenes de vista previa que la NASA publica para cada pasada, con dos canales: HH y HV, dos formas de emitir y recibir la señal.',
  'method.s2.title': 'Por qué no se pueden restar sin más',
  'method.s2.text':
    'Cada imagen de vista previa se estira por separado: se recorta entre sus percentiles 5 y 95 y se comprime con una raíz cuadrada. Dos fechas no quedan en la misma escala. Antes de comparar, el método las lleva a una escala común con un ajuste lineal robusto sobre todo el cuadro, y solo compara el rango donde ambas imágenes tienen información.',
  'method.s3.title': 'Qué significan los «dB aproximados»',
  'method.s3.text':
    'Un decibelio es una forma logarítmica de decir cuántas veces cambió la señal: 3 dB es, más o menos, el doble o la mitad. Como partimos de imágenes estiradas y no de datos calibrados, los dB son aproximados: sirven para ubicar y ordenar cambios, no para citar un valor físico. En superficies muy oscuras o muy brillantes el cambio real puede ser mayor que el mostrado.',
  'method.s4.title': 'Cómo se clasifica',
  'method.s4.text':
    'Un píxel cuenta como cambio si la señal sube o baja 3 dB o más. Después se mira qué canal cambió y si la superficie era oscura, como el agua o la nieve mojada: de ahí salen siete clases. El nombre que ves depende del lente, porque la misma señal significa cosas distintas en una selva y en un glaciar.',
  'method.s5.title': 'Por qué todo dice «posible»',
  'method.s5.text':
    'Un radar no ve agua: ve cómo rebota la señal. Una caída del retorno es compatible con agua nueva, pero también con otras causas. Por eso cada etiqueta es una hipótesis para mirar más de cerca, nunca un evento confirmado.',
  'method.s6.title': 'Qué no puede afirmar esta herramienta',
  'method.s6.1': 'No mide inundaciones, deforestación ni deshielo con valores calibrados.',
  'method.s6.2': 'No distingue la causa de un cambio, solo que la señal cambió.',
  'method.s6.3':
    'Un cambio que afecta por igual a toda la escena, como la humedad general tras lluvias, queda absorbido por la normalización.',
  'method.s6.4': 'Solo compara pasadas del mismo modo de adquisición.',
  'method.s6.5':
    'La calidad del ajuste entre imágenes no es certeza sobre la causa. Un ajuste bajo puede indicar cambios extensos o problemas de comparabilidad; la cobertura de datos se informa por separado.',
  'method.formula': 'Fórmula de referencia',
  'method.formulaText': 'Δ ≈ 10·log10((q₂ + c) / (α·q₁ + β + c)), con q = ((ND − 1) / 254)² y c = 0,03',
  'method.sources': 'Fuentes y versión',
  'method.sourcesText':
    'Imágenes: NISAR GCOV (NASA e ISRO), distribuidas por ASF DAAC. Mapa base: Esri World Imagery. La Tierra hoy: NASA EPIC. Método browse: 4; lupa GCOV: 3; serie: 2.',

  'resources.title': 'Recursos abiertos del reto',
  'resources.intro':
    'Los recursos que propone el reto «Dancing with the SARs» y el papel de cada uno en Compás. La aplicación procesa datos de NISAR; los radares de Canadá y Argentina figuran como fuentes para contrastar y aún no se procesan aquí.',
  'resources.group.nasa': 'NASA',
  'resources.group.csa': 'Agencia Espacial Canadiense (CSA)',
  'resources.group.conae': 'Comisión Nacional de Actividades Espaciales de Argentina (CONAE)',
  'resources.earthdataSearch.name': 'Earthdata Search',
  'resources.earthdataSearch.use':
    'Buscador del catálogo de NASA. Compás consulta ese mismo catálogo (CMR) para saber qué pasadas de NISAR cubren cada punto.',
  'resources.asfSearch.name': 'ASF Data Search (Vertex)',
  'resources.asfSearch.use':
    'Archivo de radar de NASA en Alaska. Cada producto que cita Compás enlaza a su ficha aquí, para comprobar la procedencia.',
  'resources.nisarDocs.name': 'Documentación de NISAR',
  'resources.nisarDocs.use':
    'Describe los productos GCOV y GUNW que lee Compás y las formas de acceder a ellos.',
  'resources.remoteSensing.name': 'Fundamentos de teledetección',
  'resources.remoteSensing.use': 'Introducción de NASA a la observación de la Tierra desde el espacio.',
  'resources.sarBasics.name': 'Qué es un radar de apertura sintética',
  'resources.sarBasics.use':
    'Explica bandas, polarización e interferometría: la base para leer los mapas de cambio y las hipótesis de Compás.',
  'resources.arset.name': 'Capacitaciones ARSET',
  'resources.arset.use':
    'Cursos gratuitos de NASA sobre teledetección aplicada, entre ellos agua superficial con radar y desplazamiento del terreno con NISAR.',
  'resources.storymaps.name': 'StoryMaps de NISAR',
  'resources.storymaps.use':
    'Cinco relatos cartográficos: inundaciones, incendios, manchas de petróleo, movimiento glaciar y hundimiento del terreno.',
  'resources.societal.name': 'Beneficios sociales de NISAR',
  'resources.societal.use':
    'Fichas de dos páginas por aplicación: inundaciones, seguridad alimentaria, glaciares, volcanes y más. Lectura de fondo para las hipótesis de cada clase de cambio.',
  'resources.uavsar.name': 'Postales de UAVSAR',
  'resources.uavsar.use':
    'Imágenes del radar aéreo de banda L que sirvió de antecedente a NISAR. Dos coinciden con historias de Compás: Kilauea y Vatnajökull.',
  'resources.rcm.name': 'Misión de la Constelación RADARSAT (RCM)',
  'resources.rcm.use':
    'Tres satélites de banda C con parte de sus productos en acceso abierto. Sirven para contrastar con la banda L de NISAR.',
  'resources.csaTutorial.name': 'Tutorial de radar de apertura sintética',
  'resources.csaTutorial.use': 'Guía para principiantes: abrir y graficar imágenes de RADARSAT en QGIS y Python.',
  'resources.radarsat1.name': 'Archivo de RADARSAT-1',
  'resources.radarsat1.use':
    'Imágenes de banda C de 1995 a 2013, con licencia abierta. Permiten mirar un mismo lugar décadas antes de NISAR.',
  'resources.saocomCatalog.name': 'Catálogo SAOCOM',
  'resources.saocomCatalog.use':
    'Radar argentino de banda L, la misma de NISAR. Buscar y ver miniaturas es libre; descargar exige registro y licencia.',
  'resources.saocomAccess.name': 'Acceso al archivo SAOCOM',
  'resources.saocomAccess.use':
    'Desde febrero de 2023, cualquier persona registrada puede acceder a los productos de archivo sobre territorio argentino.',

  'nav.label':
    'Secciones',
  'nav.stories':
    'Historias',
  'nav.explore':
    'Explorar',
  'nav.live':
    'En vivo',
  'explore.panelLabel':
    'Explorar el mundo',
  'explore.title':
    'Explora cualquier lugar',
  'explore.intro':
    'Haz clic en el globo, busca una ciudad o una dirección, o escribe unas coordenadas. Te mostramos las pilas de pasadas de NISAR que cubren ese punto.',
  'explore.titleShort':
    'Explorar',
  'explore.place.label': 'Ciudad o dirección',
  'explore.place.placeholder': 'Montería, Colombia',
  'explore.place.go': 'Buscar lugar',
  'explore.place.searching': 'Buscando el lugar…',
  'explore.place.empty': 'No encontramos ese lugar. Prueba con otro nombre o agrega el país.',
  'explore.place.error': 'No se pudo consultar el buscador de lugares. Inténtalo de nuevo o usa coordenadas.',
  'explore.place.showing': 'Lugar: {name}',
  'explore.place.others': 'Otros resultados',
  'explore.place.credit': 'Búsqueda de lugares: © colaboradores de OpenStreetMap.',
  'explore.lon':
    'Longitud',
  'explore.lat':
    'Latitud',
  'explore.go':
    'Buscar pilas',
  'explore.coordsInvalid':
    'Escribe una longitud entre −180 y 180 y una latitud entre −90 y 90.',
  'explore.examples':
    'Lugares para probar',
  'explore.ex.mojana':
    'La Mojana, Colombia',
  'explore.ex.iceland':
    'Islandia',
  'explore.ex.california':
    'Valle Central de California',
  'explore.ex.punjab':
    'Punyab, India',
  'explore.point':
    'Punto {lon}, {lat}.',
  'explore.otherPlace':
    'Elegir otro lugar',
  'explore.searching':
    'Buscando las pilas de NISAR sobre este punto…',
  'explore.stacksError':
    'No se pudieron consultar las pilas de NISAR. Revisa que el servidor de Compás esté encendido y vuelve a elegir el punto.',
  'explore.empty.title':
    'NISAR aún no tiene datos aquí',
  'explore.empty.text':
    'Ninguna pila de productos GCOV cubre este punto: NISAR todavía no observa todo el planeta con este producto. Prueba en otro lugar, por ejemplo en uno de estos.',
  'explore.stacksTitle':
    'Pilas que cubren este punto: {n}',
  'explore.stacksHelp':
    'Una pila es la serie de pasadas de NISAR sobre un mismo cuadro, desde la misma pista y en la misma dirección. Elige una para ver su huella y sus fechas.',
  'explore.stackTitle':
    'Pista {track}, cuadro {frame}, {direction}',
  'explore.stackDates':
    '{n} fechas analizables de {total}',
  'explore.stackRange':
    'del {first} al {last}',
  'explore.stackPol':
    'Polarizaciones: {pol}',
  'explore.otherStack':
    'Ver las otras pilas de este punto',
  'explore.around.pair':
    'Elegimos las pasadas que rodean el evento: la última anterior y la primera posterior. Revisa las fechas y pulsa «Comparar estas fechas».',
  'explore.around.before-only':
    'Todavía no hay una pasada posterior al evento. Dejamos elegida la última anterior; cuando NISAR vuelva a pasar podrás compararla con la nueva.',
  'explore.around.none':
    'Ninguna pila de este punto tiene pasadas analizables antes y después de esa fecha. Elige una pila y las fechas que quieras.',
  'explore.lens':
    'Lente de lectura',
  'explore.lensHelp':
    'Cambia cómo se nombran las señales según el terreno.',
  'explore.area':
    'Área de análisis',
  'explore.area.view':
    'Vista actual del mapa',
  'explore.area.full':
    'Cuadro completo',
  'explore.area.viewHelp':
    'Acércate a la zona antes de comparar: se analiza lo que ves, recortado a la huella. Es más claro y más rápido.',
  'explore.area.fullHelp':
    'Se analiza todo el cuadro de la pila, sin importar lo que muestre el mapa.',
  'explore.areaNote.view':
    'Se analizó la vista del mapa en el momento de comparar.',
  'explore.areaNote.full':
    'Se analizó el cuadro completo.',
  'explore.areaNote.covers':
    'La vista cubría casi todo el cuadro, así que se analizó el cuadro completo.',
  'explore.areaNote.outside':
    'La vista quedaba fuera del cuadro, así que se analizó el cuadro completo.',
  'explore.pickHint':
    'En la partitura, elige la nota de «antes» y la de «después», y pulsa «Comparar estas fechas».',
  'explore.scoreEmpty':
    'Elige un lugar y una pila: aquí aparecerán sus pasadas como notas.',
  'explore.marker':
    'Punto elegido para explorar',
  'live.panelLabel':
    'Lo que ocurre ahora',
  'live.title':
    'En vivo',
  'live.intro':
    'Lo que pasa en la Tierra en este momento, lo que NISAR acaba de observar y por dónde vuela ahora.',
  'live.tabs':
    'Qué mostrar en el mapa',
  'live.tab.events':
    'Eventos',
  'live.tab.urgent':
    'Urgentes',
  'live.events.loading':
    'Consultando los eventos de los últimos días…',
  'live.events.error':
    'No se pudieron cargar los eventos naturales. El servicio de la NASA puede estar lento.',
  'live.events.count':
    '{n} eventos de los últimos {days} días',
  'live.events.none':
    'No hay ninguna categoría visible: activa alguna arriba.',
  'live.events.list':
    'Eventos ordenados por fecha',
  'live.filter':
    'Filtrar por categoría',
  'live.showAll':
    'Mostrar todas',
  'live.more':
    'Ver {n} más',
  'live.card':
    'Elemento elegido',
  'live.closed':
    'cerrado',
  'live.open':
    'en curso',
  'live.linkEonet':
    'Ver en EONET',
  'live.linkSource':
    'Ver la fuente',
  'live.explore':
    'Explorar las pasadas de NISAR aquí',
  'live.exploreHelp':
    'Te lleva a Explorar en este punto y deja elegidas las pasadas que rodean la fecha, si existen.',
  'live.urgent.loading':
    'Consultando las últimas adquisiciones urgentes…',
  'live.urgent.error':
    'No se pudieron cargar las adquisiciones urgentes. Intenta de nuevo en un momento.',
  'live.urgent.intro':
    'NISAR publica casi en tiempo real lo que observa durante una emergencia. Las huellas violetas del mapa son esas áreas.',
  'live.urgent.stack':
    'Pila {stack}, productos {products}',
  'live.urgent.preview':
    'Ver la vista previa',
  'live.urgent.list':
    'Adquisiciones urgentes, de la más reciente a la más antigua',
  'live.sources':
    'Fuentes: eventos de NASA EONET; adquisiciones de respuesta urgente de NISAR, por ASF DAAC; órbita de NISAR, por CelesTrak.',
  'live.footer':
    'Eventos: NASA EONET. Adquisiciones: NISAR, NASA e ISRO, vía ASF. Órbita: CelesTrak. Imágenes satelitales: Esri, Maxar, Earthstar Geographics y la comunidad de usuarios de GIS.',
  'cat.wildfires':
    'Incendios',
  'cat.floods':
    'Inundaciones',
  'cat.severeStorms':
    'Tormentas severas',
  'cat.volcanoes':
    'Volcanes',
  'cat.earthquakes':
    'Sismos',
  'cat.landslides':
    'Deslizamientos',
  'cat.drought':
    'Sequías',
  'cat.dustHaze':
    'Polvo y bruma',
  'cat.seaLakeIce':
    'Hielo de mar y lagos',
  'cat.snow':
    'Nieve',
  'cat.tempExtremes':
    'Temperaturas extremas',
  'cat.waterColor':
    'Color del agua',
  'cat.manmade':
    'Eventos de origen humano',
  'lupa.title':
    'Lupa calibrada',
  'lupa.helpProbe':
    'Lee el producto completo de NISAR, ya calibrado, en una ventana alrededor del punto que sondeaste.',
  'lupa.helpCenter':
    'Lee el producto completo de NISAR, ya calibrado, en una ventana alrededor del centro del mapa. Si sondeas un punto, la ventana se centra ahí.',
  'lupa.size':
    'Tamaño de la ventana',
  'lupa.sizeKm':
    '{n} km',
  'lupa.open':
    'Lupa calibrada aquí',
  'lupa.slow':
    'La primera vez descarga entre 50 y 90 MB y tarda de 20 a 40 segundos.',
  'lupa.badge':
    'Lupa calibrada',
  'lupa.badgeText':
    'dB reales de γ⁰ calibrado a {res} m, en una ventana de {size} km. No son los dB aproximados de la vista general.',
  'lupa.back':
    'Volver a la vista general',
  'lupa.load.title':
    'Leyendo el producto calibrado',
  'lupa.load.text':
    'Leemos una ventana de {size} km del producto GCOV completo de NISAR, que pesa unos 6 GB; solo descargamos la ventana.',
  'lupa.load.open':
    'Abriendo el archivo y leyendo sus metadatos…',
  'lupa.load.read':
    'Descargando la ventana de las dos fechas, entre 50 y 90 MB…',
  'lupa.load.calc':
    'Calculando el cambio en dB reales…',
  'lupa.load.cache':
    'Las ventanas de las historias ya están guardadas y responden al instante.',
  'lupa.load.cancel':
    'Cancelar y volver a la vista general',
  'lupa.err.title':
    'No se pudo abrir la lupa calibrada',
  'conf.gcov.title':
    'Retorno calibrado: sin ajuste global entre fechas',
  'conf.gcov.text':
    'La calibración permite comparar la potencia. No garantiza la exactitud de una clase ni confirma su causa.',
  'probe.noteCal':
    'Valores en dB reales de γ⁰ calibrado.',
  'hist.axisCal':
    'Cambio en dB reales',
  'prov.georef.product':
    'Esquinas calculadas con la proyección del propio producto calibrado.',
  'prov.resolution':
    'Resolución de {m} m por píxel.',
  'limits.cal.1':
    'Los decibelios son reales (γ⁰ calibrado), pero cada píxel de 30 m promedia 3×3 píxeles de 10 m: el moteado del radar deja un ruido de pocos dB en píxeles sueltos.',
  'limits.cal.2':
    'No se normaliza entre fechas: un cambio general de humedad o de rugosidad sí aparece.',
  'limits.cal.3':
    'Solo cubre una ventana de 10 a 20 km, no toda la escena.',
  'story.zoomHint':
    'El panel de la derecha pasa a dB reales. Usa «Volver a la vista general» para regresar al mapa completo.',
  'read.collapse':
    'Plegar lectura',
  'read.expand':
    'Mostrar lectura',
  'export.title':
    'Exportar',
  'export.json':
    'Descargar informe (JSON)',
  'export.copy':
    'Copiar enlace',
  'export.help':
    'El informe lleva fechas, método, estadísticas, procedencia y límites. El enlace reabre esta misma vista.',
  'export.copied':
    'Enlace copiado.',
  'export.copyFail':
    'No se pudo copiar: copia la dirección desde la barra del navegador.',
  'export.layers':
    'Descargar las capas (PNG)',
  'basemap.group':
    'Mapa base',
  'basemap.sat':
    'Satélite',
  'basemap.optical':
    'Óptico del día',
  'basemap.hint':
    'Imagen óptica diaria de la fecha «después»: lo que vería un satélite que no atraviesa las nubes.',
  'basemap.swipeHint':
    'No está disponible con la cortina.',
  'basemap.note':
    'Óptico del día, {date}: lo que habría visto un satélite óptico. A menudo solo se ven nubes; el radar de NISAR ve a través de ellas.',
  'basemap.attribution':
    'Imágenes ópticas: NASA GIBS, VIIRS.',
  'layer.group.image':
    'Imagen',
  'layer.group.change':
    'Cambio',
  'layer.group.reading':
    'Lectura',
  'map.zoomGroup':
    'Acercar y alejar',
  'ig.loading':
    'Buscando los interferogramas más recientes sobre este lugar…',
  'ig.error':
    'No se pudieron cargar los interferogramas. Vuelve a intentarlo en un momento.',
  'ig.errorDetail':
    'No se pudieron cargar los interferogramas: {detail}',
  'ig.none':
    'No hay interferogramas recientes sobre este punto.',
  'ig.pairTrack':
    'Pista {track}, {direction}',
  'ig.pairs':
    'Pares de fechas',
  'ig.pairDates':
    'Del {reference} al {secondary}',
  'ig.sentence':
    'Interferograma entre la pasada de referencia del {reference} y la secundaria del {secondary}.',
  'ig.sentenceNone':
    'Interferogramas de NISAR sobre este lugar.',
  'ig.what.title':
    'Qué estás viendo',
  'ig.what.text':
    'Un interferograma compara la fase de la onda de radar entre dos pasadas. Si el suelo se movió entre ambas, la fase cambia, y el cambio se pinta en colores.',
  'ig.fringes':
    'Cada franja, un ciclo completo de color, corresponde a un movimiento del suelo de media longitud de onda a lo largo de la línea de visión del radar: en banda L, alrededor de 12 cm.',
  'ig.product.title':
    'Un producto oficial, sin procesar',
  'ig.product.text':
    'La imagen es la vista previa oficial del producto GUNW provisional de NISAR, tal como la publica la NASA. Compás no la recalcula ni la interpreta.',
  'ig.georef':
    'La georreferencia es aproximada: se estima con la huella de la escena, no con la geolocalización del producto.',
  'ig.limit.1':
    'Las franjas pueden venir del movimiento del suelo, pero también de la atmósfera y de la topografía.',
  'ig.limit.2':
    'Para medir centímetros hay que usar los datos del producto, no su imagen de vista previa.',
  'ig.limit.3':
    'Donde la imagen no tiene color, no hay datos o la señal se perdió entre las dos pasadas.',
  'ig.source':
    'Fuente: NISAR GUNW provisional, distribuido por ASF DAAC.',
  'method.s7.title':
    'La lupa calibrada',
  'method.s7.text':
    'La lupa lee γ⁰ del producto GCOV en una ventana de 10 a 20 km. El espaciado se obtiene de los metadatos y se promedia en potencia; en el caso de La Mojana, las celdas resultantes son de 30 m. No aplica ajuste global entre fechas. El umbral es 3 dB y «oscuro» significa HH de −18 dB o menos. Las clases siguen siendo hipótesis: una celda de 30 m no garantiza un borde exacto. Preparar una ventana nueva requiere Earthdata en el servidor; el recorrido guardado ya incluye sus datos.',
  'method.s8.expanded': 'La ampliación a tres combinaciones de zona y fechas, HH/HV y umbrales de 2, 3 y 4 dB conserva también los resultados desfavorables. En otra ventana de 10 km, HH alcanza correlación 0,471 a la escala suavizada, pero ninguna coincidencia al umbral de 3 dB (2 detecciones browse y 41 calibradas). En pasadas consecutivas hay pocos cambios fuertes y algunas razones no se pueden calcular. Los tres casos pertenecen a La Mojana: no son una validación geográfica independiente.',
  'method.s8.title':
    'Cuánto se parece la vista general al dato calibrado',
  'method.s8.text':
    'Auditoría del 14 de noviembre de 2026: una ventana de 15 km de La Mojana, del 26 de junio al 24 de octubre, con 7.744 píxeles comunes. Frente al GCOV agregado a unos 170 m: correlación 0,517, mediana del error absoluto 0,78 dB, precisión 50,0 % y exhaustividad 12,2 % al umbral HH de 3 dB. Con media adicional 5×5 (cerca de 1 km): correlación 0,861, error 0,69 dB, precisión 12,5 % y exhaustividad 45,0 %. En esta última escala coinciden 9 de 72 detecciones browse y 20 de referencia; el 100 % de signo correcto corresponde solo a esos 9 aciertos conjuntos. La correlación espacial no mide exactitud de detección. Los píxeles suavizados no son observaciones independientes. Esta ventana no valida otras zonas, HV ni las clases físicas; GCOV calibrado tampoco es verdad de terreno.',
  'method.s9.title':
    'El estiramiento de la vista previa está confirmado',
  'method.s9.text':
    'Los metadatos de control de calidad de cada producto confirman cómo se fabrica la vista previa: recorte entre los percentiles 5 y 95, gamma de 0,5 y unidades lineales. Esos metadatos no sirven para calibrar la imagen (su histograma es del dato sin promediar), así que la calibración real solo sale de la lupa.',
  'method.s10.title':
    'El mapa óptico del día',
  'method.s10.text':
    'Es la imagen diaria de color verdadero del satélite VIIRS (NASA GIBS) en la fecha «después». Muestra lo que ve un satélite óptico: a menudo, nubes. El radar de NISAR ve la misma zona a través de ellas, y por eso conviene mirarlos juntos.',
  'ctx.button':
    'Contexto',
  'ctx.title':
    'Capas de contexto',
  'ctx.intro':
    'Capas de la NASA para ver qué rodea el cambio: dónde hay agua, qué cubre el suelo y cuánta gente vive allí. Quedan debajo del cambio de NISAR.',
  'ctx.agua.name':
    'Agua vista por Sentinel-1',
  'ctx.agua.what':
    'Marca agua abierta y vegetación inundada. Cumple dos papeles: es un contraste independiente (otro satélite, otro día) y otra frecuencia (banda C, frente a la banda L de NISAR). Si coinciden, la pista se sostiene mejor; si no, puede deberse a la frecuencia o al día.',
  'ctx.suelo.name':
    'Cobertura del suelo (MODIS, 2024)',
  'ctx.suelo.what':
    'Qué hay sobre el terreno: bosque, cultivo, humedal o ciudad. Ayuda a leer el cambio, porque la misma señal significa cosas distintas en un cultivo y en un bosque.',
  'ctx.poblacion.name':
    'Densidad de población (2020)',
  'ctx.poblacion.what':
    'Cuánta gente vive en cada zona: muestra a quién puede afectar un cambio, como una inundación.',
  'ctx.opacity':
    'Opacidad',
  'ctx.opacityOf':
    'Opacidad de la capa: {name}',
  'ctx.legend':
    'Cómo leer los colores',
  'ctx.poblacion.read':
    'De crema (menos de 1 persona por km²) a rojo oscuro (1.000 o más). Sin color: sin dato, como en el océano.',
  'ctx.link':
    'Ver la capa en NASA Worldview',
  'ctx.s1.group':
    'Fecha de Sentinel-1',
  'ctx.s1.prev':
    'Un día antes',
  'ctx.s1.next':
    'Un día después',
  'ctx.s1.same':
    'Igual que la fecha «después» de la comparación',
  'ctx.s1.later':
    '{n} {unit} después de la fecha «después»',
  'ctx.s1.earlier':
    '{n} {unit} antes de la fecha «después»',
  'ctx.day':
    'día',
  'ctx.days':
    'días',
  'ctx.s1.reset':
    'Volver a la fecha «después»',
  'ctx.s1.note':
    'Sentinel-1 es otro radar, de banda C; pasa cada 6 a 12 días. Si el mapa sale vacío, avanza o retrocede un día hasta dar con una pasada.',
  'ctx.attr.agua':
    'OPERA con Sentinel-1',
  'ctx.attr.suelo':
    'MODIS',
  'ctx.attr.poblacion':
    'GPW v4',
  'ctx.attr.pie':
    'Contexto: NASA GIBS, {names}.',
  'ctx.attr.full':
    'Atribución: NASA EOSDIS GIBS; OPERA (JPL); MODIS (NASA LP DAAC); GPW v4 (NASA SEDAC, CIESIN).',
  'classes.hint':
    'Elige una clase para ver por qué pudo cambiar.',
  'why.signal':
    'Qué hace la señal',
  'why.mechanism':
    'Mecanismo más probable',
  'why.lead':
    'Lo más probable',
  'why.others':
    'También puede ser',
  'why.pol':
    'Qué polarización lo revela',
  'pol.title':
    'Qué ve cada polarización',
  'pol.single':
    'Esta comparación tiene una sola polarización (HH): no hay lectura de HV.',
  'tabs.label':
    'Secciones de la lectura',
  'tabs.reading':
    'Lectura',
  'tabs.point':
    'Punto',
  'tabs.data':
    'Datos',
  'story.future':
    'Qué viene con NISAR',
  'story.futureLead':
    'Esta historia es una parte de lo que NISAR puede hacer.',
  'future.title':
    'Qué viene con NISAR',
  'future.intro':
    'Lo que Compás muestra hoy es una parte de lo que NISAR puede ofrecer. Esto es lo que ya sabemos del satélite y lo que se abre a partir de ahí.',
  'future.facts.title':
    'Lo que ya es un hecho',
  'future.facts.1':
    'NISAR lleva dos radares: banda L (NASA) y banda S (ISRO).',
  'future.facts.2':
    'Pasa por el mismo lugar cada 12 días y observa en órbitas ascendentes y descendentes.',
  'future.facts.3':
    'La banda L atraviesa el follaje.',
  'future.facts.4':
    'El catálogo público ya publica, además de lo que usa Compás, productos de humedad del suelo, de desplazamientos (útiles para glaciares) e interferogramas, y una línea de respuesta urgente casi en tiempo real.',
  'future.apps.title':
    'Aplicaciones que eso abre',
  'future.apps.1':
    'Seguimiento de humedales e inundaciones bajo las nubes y bajo el bosque.',
  'future.apps.2':
    'Calendario y área de cultivos.',
  'future.apps.3':
    'Alertas de deforestación.',
  'future.apps.4':
    'Deshielo y movimiento de glaciares.',
  'future.apps.5':
    'Deformación del terreno por sismos, volcanes y hundimientos.',
  'future.apps.6':
    'Apoyo a la respuesta ante desastres.',
  'future.gap.title':
    'Qué le falta a Compás para llegar ahí',
  'future.gap.1':
    'Series completas y calibradas: hoy la vista general usa imágenes de vista previa con dB aproximados, y la lupa calibrada cubre solo ventanas pequeñas.',
  'future.gap.2':
    'Validación con datos de campo: Compás todavía no contrasta sus señales con mediciones hechas en el terreno.',
  'live.clusterHint':
    'Los círculos con número agrupan eventos cercanos; púlsalos para acercarte y separarlos.',
  'ref.group':
    'Referencia sobre el mapa',
  'ref.borders':
    'Fronteras',
  'ref.names':
    'Nombres',
  'ref.bordersHint':
    'Mostrar u ocultar las fronteras de países y los límites de departamentos o estados',
  'ref.namesHint':
    'Mostrar u ocultar los nombres de países, regiones y ciudades',
  'ref.attribution':
    'Fronteras y nombres: Natural Earth.',
  'score.soundOn':
    'Sonido de las notas: encendido',
  'score.soundOff':
    'Sonido de las notas: apagado',
  'help.open':
    'Cómo usar Compás y atajos de teclado',
  'help.title':
    'Cómo usar Compás',
  'help.step.1':
    'Elige una historia de la portada, o entra en Explorar y pulsa cualquier lugar del mapa.',
  'help.step.2':
    'En la partitura de abajo, cada nota es una pasada del radar. Elige la de «antes» y la de «después», y pulsa «Comparar estas fechas».',
  'help.step.3':
    'Pulsa un punto del mapa para medir cuánto cambió ahí, cambia de capa en la barra del mapa y pulsa «Ver la danza» para oír y ver toda la serie.',
  'help.keys':
    'Atajos de teclado',
  'help.keysNote':
    'Los atajos no actúan mientras escribes en un campo. En la partitura, las flechas recorren las notas y Enter elige.',
  'help.space':
    'Espacio',
  'help.key.stories':
    'Ir a Historias',
  'help.key.explore':
    'Ir a Explorar',
  'help.key.live':
    'Ir a En vivo',
  'help.key.prev':
    'Paso anterior de la historia',
  'help.key.next':
    'Paso siguiente de la historia',
  'help.key.dance':
    'Empezar la danza o salir de ella',
  'help.key.playPause':
    'Pausar o reanudar la danza',
  'help.key.sound':
    'Encender o apagar el sonido de las notas',
  'help.key.borders':
    'Mostrar u ocultar las fronteras',
  'help.key.names':
    'Mostrar u ocultar los nombres',
  'help.key.zoomIn':
    'Acercar el mapa',
  'help.key.zoomOut':
    'Alejar el mapa',
  'help.key.recenter':
    'Volver al área',
  'help.key.help':
    'Abrir esta ayuda',
  'help.prefs':
    'Preferencias',
  'help.pref.borders':
    'Fronteras y límites internos sobre el mapa',
  'help.pref.names':
    'Nombres de países, regiones y ciudades',
  'help.pref.sound':
    'Sonido de las notas de la partitura',
  'help.pref.hints':
    'Pistas sobre el mapa',
  'hint.dismiss':
    'Ocultar las pistas',
  'hint.pickPlace':
    'Pulsa cualquier lugar del mapa, o búscalo por nombre en el panel.',
  'hint.pickStack':
    'Elige en el panel una de las pilas de pasadas que cubren este punto.',
  'hint.pickNotes':
    'En la partitura de abajo, elige la nota de «antes» y la de «después».',
  'hint.probe':
    'Pulsa el mapa para medir cuánto cambió un punto.',
  'hint.interferogram':
    'Sigue los pasos del panel para leer el interferograma.',
  'hint.dance':
    'Cada pasada hace sonar su nota: más aguda, más retorno del radar.',
  'hint.live':
    'Pulsa un punto del mapa o una fila de la lista para ver el evento.',
  'hint.keys.steps':
    '← y → cambian de paso.',
  'hint.keys.dance':
    'Espacio la pausa.',
  'live.updated':
    'Actualizado a las {time}.',
  'live.stale':
    'El servicio no respondió: se muestra la última copia recibida.',
  'live.refresh':
    'Actualizar',
  'live.refreshing':
    'Actualizando…',
  'live.onlyOpen':
    'Solo en curso',
  'live.onlyOpenHint':
    'Oculta los eventos que la NASA ya dio por cerrados',
  'live.events.noneOpen':
    'Ahora mismo no hay eventos en curso en las categorías visibles.',
  'hint.liveUrgent':
    'Pulsa una huella violeta o una fila de la lista para ver esa adquisición.',
  'hint.liveSelected':
    'El botón dorado del panel te lleva a las pasadas de NISAR sobre este punto.',
  'ctx.agua.short':
    'Agua',
  'ctx.suelo.short':
    'Bosques y suelo',
  'ctx.poblacion.short':
    'Población',
  'ctx.settings':
    'Ajustar las capas de contexto: opacidad, fecha y explicación',
  'ctx.close':
    'Cerrar los ajustes de contexto',
  'ctx.s1.on':
    'Sentinel-1, {date}',
  'ctx.poblacion.low':
    'menos de 1',
  'ctx.poblacion.high':
    '1.000 o más personas por km²',
  'hint.liveSatellite':
    'El modelo es NISAR en este instante; la franja dorada, lo que su radar alcanza a ver; la línea punteada, su próxima vuelta.',
  'live.tab.satellite':
    'NISAR ahora',
  'sat.marker':
    'NISAR dibujado a escala, en su posición de este instante',
  'sat.loading':
    'Consultando la órbita de NISAR…',
  'sat.error':
    'No se pudo obtener la órbita de NISAR. Revisa la conexión e inténtalo de nuevo.',
  'sat.over':
    'En este instante NISAR vuela sobre',
  'sat.north': 'N',
  'sat.south': 'S',
  'sat.east': 'E',
  'sat.west': 'O',
  'sat.altitude':
    'Altitud',
  'sat.speed':
    'Velocidad',
  'sat.speedValue':
    '{kms} km/s ({kmh} km/h)',
  'sat.heading':
    'Rumbo',
  'sat.ascending':
    'Hacia el norte',
  'sat.descending':
    'Hacia el sur',
  'sat.period':
    'Una vuelta cada',
  'sat.periodValue':
    '{min} minutos',
  'sat.time':
    'Hora universal',
  'sat.focus':
    'Centrar el mapa en NISAR',
  'sat.track':
    'La línea dorada punteada es el recorrido de su próxima vuelta; la clara, el de los últimos {minutes} minutos. NISAR vuelve a pasar por el mismo lugar cada 12 días: de ahí sale el compás de la partitura.',
  'sat.source':
    'Posición calculada con el modelo orbital SGP4 a partir de los elementos que CelesTrak publicó {age}. Es una estimación con un margen de pocos kilómetros, no telemetría de la misión.',
  'sat.ageHours':
    'hace {n} h',
  'sat.ageDays':
    'hace {n} días',
  'sat.old':
    'Los elementos orbitales tienen más de una semana o no se pudieron actualizar: la posición puede estar desviada.',
  'sat.scaleUp':
    'ampliado {n} veces',
  'sat.scaleReal':
    'a tamaño real',
  'sat.swath':
    'La franja dorada es el suelo que su radar alcanza a ver: más de 240 km de ancho, a la izquierda del rumbo y a escala real sobre el mapa. Es lo que puede observar, no una confirmación de que esté grabando.',
  'sat.model':
    'El satélite está dibujado con sus proporciones reales. Mide unos 17 m de punta a punta, así que en el mapa aparece ampliado; el rótulo dice cuántas veces.',
  'sat.tour':
    'Ver cómo funciona NISAR',
  'tour.open':
    'Recorrido guiado',
  'tour.short':
    'Recorrido',
  'tour.label':
    'Recorrido guiado de Compás',
  'tour.chapters':
    'Capítulos del recorrido',
  'tour.chapter.satellite':
    'El satélite',
  'tour.chapter.observe':
    'Cómo observa',
  'tour.chapter.app':
    'Cómo se usa',
  'tour.controls':
    'Controles del recorrido',
  'tour.stepOf':
    'Paso {n} de {total}',
  'tour.play':
    'Reanudar el recorrido',
  'tour.pause':
    'Pausar el recorrido',
  'tour.prev':
    'Paso anterior',
  'tour.next':
    'Paso siguiente',
  'tour.close':
    'Cerrar el recorrido',
  'tour.restart':
    'Repetir',
  'tour.finish':
    'Empezar a usar Compás',
  'tour.figure':
    'NISAR dibujado a escala',
  'tour.figureDimensions':
    'NISAR dibujado a escala con sus medidas: antena de 12 metros, brazo de 9 metros, cuerpo de 5,5 metros y paneles solares de 5,5 metros, junto a una persona de 1,75 metros',
  'tour.figureNote':
    'Medidas publicadas por NASA/JPL. La disposición es esquemática.',
  'tour.dim.reflector':
    '12 m',
  'tour.dim.boom':
    '9 m',
  'tour.dim.body':
    '5,5 m',
  'tour.dim.solar':
    '5,5 m',
  'tour.dim.person':
    '1,75 m',
  'cover.tour':
    'Ver el recorrido guiado',
  'cover.tourHelp':
    'Unos cinco minutos y avanza solo: el satélite pieza por pieza, cómo observa y cómo se usa Compás.',
  'help.tour':
    'Ver el recorrido guiado',
  'tour.now.title':
    'Este es NISAR, ahora mismo',
  'tour.now.text':
    'NISAR es un satélite de radar de la NASA y de ISRO, la agencia espacial de India. Despegó el 30 de julio de 2025 y da una vuelta a la Tierra cada 100 minutos, a 747 km de altura. El modelo se mueve en el mapa en tiempo real, con la órbita que publica CelesTrak.',
  'tour.scale.title':
    'Dibujado a escala',
  'tour.scale.text':
    'El dibujo guarda las medidas reales: una antena de 12 m, más ancha que una cancha de tenis, al final de un brazo de 9 m. A su tamaño verdadero no ocuparía ni un píxel del mapa, así que aparece ampliado; el rótulo bajo el satélite dice cuántas veces.',
  'tour.reflector.title':
    'La antena reflectora',
  'tour.reflector.text':
    'Una malla de alambre bañado en oro, tensada en un aro de 12 m. Funciona como un espejo para las microondas: concentra el pulso del radar hacia la Tierra y recoge el eco que vuelve. Viajó plegada y se abrió en órbita.',
  'tour.boom.title':
    'El brazo',
  'tour.boom.text':
    'Sostiene la antena a 9 m del cuerpo del satélite, a la distancia y con el ángulo justos para que el radar la ilumine desde abajo y el haz baje inclinado hacia la Tierra.',
  'tour.radar.title':
    'Dos radares en uno',
  'tour.radar.text':
    'El de banda L, de la NASA, usa ondas de 24 cm que atraviesan el follaje y sienten el suelo y el hielo. El de banda S, de ISRO, usa ondas de 9,4 cm, más sensibles a cultivos y vegetación baja. Los dos emiten hacia la antena desde la placa dorada.',
  'tour.solar.title':
    'Los paneles solares',
  'tour.solar.text':
    'Dos alas de 5,5 m, con tres paneles cada una, entregan unos 5 kilovatios. NISAR vuela sobre la frontera entre el día y la noche, así que casi nunca entra en la sombra de la Tierra y tiene sol para el radar casi todo el tiempo.',
  'tour.bus.title':
    'El cuerpo del satélite',
  'tour.bus.text':
    'Lo construyó ISRO. Lleva los computadores, la batería, el combustible y las ruedas de reacción que mantienen el radar bien apuntado. Con el instrumento encima mide 5,5 m de alto, y todo el satélite pesó cerca de 2.400 kg al despegar.',
  'tour.antenna.title':
    'La antena de datos',
  'tour.antenna.text':
    'El radar produce muchísima información: hasta 26 terabits por día. Esta antena de banda Ka la envía a las estaciones en tierra. De ahí salen los productos abiertos de NISAR que Compás consulta.',
  'tour.orbit.title':
    'Una vuelta cada 100 minutos',
  'tour.orbit.text':
    'La línea punteada es su próxima vuelta; la clara, los últimos 25 minutos. NISAR pasa cerca de los dos polos mientras la Tierra gira debajo. Tras 173 vueltas, cada 12 días, repite el mismo camino: ese es el compás que da nombre a la aplicación.',
  'tour.swath.title':
    'Mira de lado',
  'tour.swath.text':
    'La franja dorada es lo que su radar alcanza a ver: más de 240 km de ancho, a la izquierda del rumbo y a escala real. Mira de lado para distinguir lo cercano de lo lejano por lo que tarda el eco. Es la zona que puede observar, no una confirmación de que esté grabando.',
  'tour.echo.title':
    'Escucha el eco',
  'tour.echo.text':
    'NISAR no toma fotos: emite pulsos de microondas y mide cuánto vuelve. El agua quieta devuelve poco y se ve oscura; el bosque y las ciudades devuelven mucho. Como lleva su propia luz, ve de noche y a través de las nubes.',
  'tour.stories.title':
    'Historias',
  'tour.stories.text':
    'Aquí empieza Compás. Cada historia es un lugar real donde algo cambió entre dos pasadas del radar. Vamos a abrir una.',
  'tour.story.title':
    'Una historia, paso a paso',
  'tour.story.text':
    'El panel de la izquierda cuenta la historia por pasos. Cada paso mueve el mapa y cambia lo que muestra: el lugar, el antes, el después y lo que cambió. Se avanza con «Anterior» y «Siguiente».',
  'tour.layers.title':
    'Las capas del mapa',
  'tour.layers.text':
    'Esta barra elige qué ves: la imagen de antes, la de después, el cambio en color o una cortina que se arrastra para comparar las dos fechas, como ahora. En las capas de cambio, azul es menos retorno del radar y rojo, más.',
  'tour.reading.title':
    'La lectura',
  'tour.reading.text':
    'A la derecha, lo que cambió dicho con palabras: cuántos km² y de qué tipo. La lista de clases es también la leyenda del mapa. Todo cambio se llama «posible»: el radar da pistas, y la procedencia y los límites están siempre a la vista.',
  'tour.probe.title':
    'Medir un punto',
  'tour.probe.text':
    'Un clic en el mapa mide ese punto: cuánto subió o bajó el retorno entre las dos fechas. El recorrido acaba de consultar uno por ti; el resultado aparece en el panel de lectura.',
  'tour.score.title':
    'La partitura',
  'tour.score.text':
    'Abajo, el tiempo es un pentagrama. Cada nota es una pasada de NISAR sobre este lugar y cada barra marca 12 días. Elige una nota para «antes», otra para «después» y pulsa «Comparar estas fechas».',
  'tour.dance.title':
    'La danza',
  'tour.dance.text':
    '«Ver la danza» reproduce todas las pasadas en orden y las hace sonar: a más retorno, nota más aguda. Sirve para ver cuándo empezó un cambio y cómo siguió.',
  'tour.explore.title':
    'Explorar',
  'tour.explore.text':
    'Aquí eliges tú. Busca un lugar o pulsa cualquier punto del mapa, y Compás lista las pasadas de NISAR que lo cubren. Con dos fechas elegidas obtienes la misma lectura que en las historias.',
  'tour.live.title':
    'En vivo',
  'tour.live.text':
    'Los eventos naturales que la NASA sigue en este momento: incendios, tormentas, volcanes. Desde cualquiera puedes saltar a Explorar y ver qué captó NISAR antes y después. Aquí están también las adquisiciones urgentes y el satélite en tiempo real.',
  'tour.end.title':
    'Ahora te toca',
  'tour.end.text':
    'Ya conoces el satélite y la aplicación. Elige una historia, explora tu territorio o sigue a NISAR en vivo. El recorrido queda en la barra superior por si quieres repetirlo.',
} as const;

export type Key = keyof typeof es;
