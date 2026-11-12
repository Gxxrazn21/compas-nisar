// Diccionario en español (idioma por defecto). Los marcadores {nombre} se reemplazan al usar t().
export const es = {
  'brand': 'compás',
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
  'conf.alta': 'Confianza alta en esta comparación',
  'conf.media': 'Confianza media: lee las cifras con cautela',
  'conf.baja': 'Confianza baja: lee las cifras como orientación',
  'conf.reason.corr':
    'La correlación entre las dos fechas es {value}: cambió gran parte de la escena o los estiramientos de brillo difieren.',
  'conf.reason.fit':
    'Solo el {value} de los píxeles concuerda con el ajuste entre fechas; se esperaba al menos el 80 %.',
  'conf.lead.media':
    'Entre estas fechas cambió una parte apreciable de la escena. Las manchas son fiables como pista; las cifras, menos.',
  'conf.lead.baja':
    'No quiere decir que el resultado esté mal: entre estas fechas cambió tanta parte de la escena que el radar pierde su punto de referencia. Las manchas siguen sirviendo como pista; los kilómetros cuadrados, solo como orden de magnitud.',

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
  'dance.point': 'La nota sube o baja con el retorno HH en el centro del área.',
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
    'Cuando la confianza es baja, cambió tanta parte de la escena que la normalización deja de ser fiable.',
  'method.formula': 'Fórmula de referencia',
  'method.formulaText': 'Δ ≈ 10·log10((q₂ + c) / (α·q₁ + β + c)), con q = ((ND − 1) / 254)² y c = 0,03',
  'method.sources': 'Fuentes y versión',
  'method.sourcesText':
    'Imágenes: NISAR GCOV (NASA e ISRO), distribuidas por ASF DAAC. Mapa base: Esri World Imagery. La Tierra hoy: NASA EPIC. Versión del método: 3.',

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
    'Haz clic en el globo o escribe unas coordenadas. Te mostramos las pilas de pasadas de NISAR que cubren ese punto.',
  'explore.titleShort':
    'Explorar',
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
    'Lo que pasa en la Tierra en este momento y lo que NISAR acaba de observar.',
  'live.tabs':
    'Qué mostrar en el mapa',
  'live.tab.events':
    'Eventos naturales',
  'live.tab.urgent':
    'Respuesta urgente',
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
    'Fuentes: eventos de NASA EONET; adquisiciones de respuesta urgente de NISAR, por ASF DAAC.',
  'live.footer':
    'Eventos: NASA EONET. Adquisiciones: NISAR, NASA e ISRO, vía ASF. Imágenes satelitales: Esri, Maxar, Earthstar Geographics y la comunidad de usuarios de GIS.',
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
    'Menos de la mitad de la ventana tiene datos',
  'conf.gcov.text':
    'Parte de la ventana cae fuera del producto o en franjas sin señal: las cifras describen solo la zona con datos.',
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
    'La lupa lee, en una ventana de 10 a 20 km, el producto GCOV completo de NISAR (γ⁰ a 10 m, promediado a 30 m) en lugar de la imagen de vista previa. Los decibelios son reales y no hay normalización entre fechas: un cambio general de humedad sí aparece. El umbral sigue siendo de 3 dB y «oscuro» significa HH de −18 dB o menos. A cambio, pide una cuenta de Earthdata en el servidor y la primera vez descarga entre 50 y 90 MB. La vista general cubre toda la escena en segundos, pero con dB aproximados.',
  'method.s8.title':
    'Cuánto se parece la vista general al dato calibrado',
  'method.s8.text':
    'Lo comprobamos en una ventana de 15 km de La Mojana, entre el 26 de junio y el 24 de octubre de 2026. A escala de aproximadamente 1 km, el cambio de la vista general coincide con el del dato calibrado: correlación de 0,86, error típico de 0,7 dB (casi todo es un desfase constante, no ruido) y el mismo signo donde ambos detectan cambio. A 170 m, el tamaño real del píxel de la vista previa, solo captura la mitad de la variabilidad del dato calibrado (correlación de 0,49). Sirve para ubicar zonas, no para medir píxeles sueltos. Es una sola ventana, no una cifra general: es una comprobación, no una garantía.',
  'method.s9.title':
    'El estiramiento de la vista previa está confirmado',
  'method.s9.text':
    'Los metadatos de control de calidad de cada producto confirman cómo se fabrica la vista previa: recorte entre los percentiles 5 y 95, gamma de 0,5 y unidades lineales. Esos metadatos no sirven para calibrar la imagen (su histograma es del dato sin promediar), así que la calibración real solo sale de la lupa.',
  'method.s10.title':
    'El mapa óptico del día',
  'method.s10.text':
    'Es la imagen diaria de color verdadero del satélite VIIRS (NASA GIBS) en la fecha «después». Muestra lo que ve un satélite óptico: a menudo, nubes. El radar de NISAR ve la misma zona a través de ellas, y por eso conviene mirarlos juntos.',
} as const;

export type Key = keyof typeof es;
