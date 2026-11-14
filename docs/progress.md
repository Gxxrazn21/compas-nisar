# Progreso

Estado al 14 de noviembre de 2026.

Los documentos de `docs/superpowers/` (diseño y plan del 11 de noviembre) describen la primera versión, llamada Terra, que mostraba huellas del catálogo y una demostración sintética. Quedaron superados: la aplicación se llama ahora Compás y trabaja solo con datos reales. Las fuentes vigentes son `docs/contrato-api.md` (API, hechos verificados y método) y `docs/diseno.md` (dirección de diseño).

## Hecho

- Backend FastAPI completo: catálogo CMR, imágenes de vista previa con caché, método de cambio versión 3, series y cuadros de animación, sonda, respuesta urgente, interferogramas, eventos EONET, imagen EPIC y lupa calibrada sobre el producto GCOV. 130 pruebas sin red.
- Método validado contra el producto calibrado (`docs/validacion-browse.json`).
- Frontend completo: portada, historias, explorar cualquier punto, lupa calibrada, historia de interferogramas, En vivo con eventos agrupados y respuesta urgente, panel de lectura en pestañas con hipótesis físicas por clase y exportación, capas de contexto (Sentinel-1, cobertura del suelo, población), partitura, danza, mapa óptico del día, diálogo Método con «Qué viene con NISAR», inglés (idioma por defecto) y español, enlace permanente y hoja inferior en celular. 124 pruebas.
- Cuatro historias con datos reales: La Mojana, valle de San Joaquín, Vatnajökull y Kilauea.
- Los catorce recursos abiertos del reto, con el papel de cada uno, en el diálogo Método (`src/lib/resources.ts`) y en el README. Los de CSA y CONAE figuran solo como referencia: no se procesan sus datos.
- Buscador de lugares en Explorar: una ciudad o una dirección lleva al punto y lista sus pilas (`backend/places.py`, `/api/places`, OpenStreetMap Nominatim).
- Lanzador (`scripts/start.ps1`) y precálculo de historias (`scripts/prewarm.py`).
- Inglés como idioma principal: la aplicación abre en inglés y los mensajes de error del backend se entregan en el idioma de la interfaz (`backend/i18n.py`). Un mensaje de error nuevo necesita su línea en la tabla de ese módulo.
- Video explicativo en inglés y español (`video/`): graba la aplicación real con Chrome, la monta en una composición animada y la convierte en MP4. Primera versión de 92 segundos, con música generada y sin voz en off.
- Fronteras, límites internos y nombres sobre el mapa, con datos de Natural Earth guardados en `public/ref/` (`scripts/build_reference.py` los regenera). Se dibujan encima de los datos y a ambos lados de la cortina; dos interruptores en la barra superior los quitan. Los rótulos se pintan en un lienzo con las tipografías de la aplicación (`src/components/stage/reference.ts`).
- Sonido de la partitura: cada nota suena a la altura a la que está dibujada, leída en clave de sol (`src/lib/sound.ts`, `staffStep` y `stepFrequency` en `src/lib/score.ts`). Suena al elegir una nota, al recorrerlas con el teclado y en cada cuadro de la danza.
- Atajos de teclado (`src/state/useShortcuts.ts`), diálogo «Cómo usar Compás» y una pista sobre el mapa con el paso siguiente de cada vista. Las preferencias (fronteras, nombres, sonido, pistas) se recuerdan en el navegador.
- Carga de imágenes: las capas de cada comparación se guardan en WebP (cerca de la quinta parte del peso), se sirven con caché inmutable y el mapa solo añade la capa que se está viendo; las demás se traen al caché del navegador en segundo plano.
- En vivo: actualización automática cada diez minutos y botón «Actualizar», aviso cuando se muestra una copia anterior, filtro «Solo en curso», y el mapa vuelve al globo al cambiar de pestaña para que las huellas urgentes se vean.
- «Ver la danza» funciona en Explorar antes de comparar (usa el punto elegido).
- Repositorio público con licencia MIT: https://github.com/Gxxrazn21/compas-nisar

## Pendiente

- Los videos de `video/` se grabaron antes de las fronteras, los nombres y las pistas: hay que volver a grabar las tomas, o abrirlas con `ref=0` en el enlace para conservar el aspecto anterior.
- El sonido de la partitura solo se comprobó contando las notas que emite el navegador de prueba; falta oírlo en un equipo con altavoces.

- Probar la hoja inferior en un celular real (solo se revisó en Chrome sin cabeza).
- La capa de Sentinel-1 sale vacía en muchas fechas y el servicio GIBS falla a ratos: falta un botón que salte a la pasada con datos más cercana.
- Las capas de contexto no se ven del lado «antes» de la cortina.
- Al desplegar una hipótesis en pantallas bajas, el texto queda cortado hasta desplazar el panel.
- Un párrafo de contexto personal sobre La Mojana, que debe escribir el autor.
- Video: decidir si lleva voz en off (el guion por escena está en `video/composition/script.js`) y revisar la duración que pide el Space Apps.
- El README y los documentos de `docs/` siguen solo en español.

## Decisiones

- Se descartó calibrar las imágenes de vista previa con el histograma de `QA_STATS`: los percentiles del dato sin promediar no coinciden con los del dato promediado.
- Se descartaron dos historias tras probarlas: Tonlé Sap (una fecha cubre solo una franja del cuadro) y la cosecha del Punyab (señal demasiado ruidosa en HH).
- Solo se comparan fechas del mismo modo de adquisición.
