# Progreso

Estado al 12 de noviembre de 2026.

Los documentos de `docs/superpowers/` (diseño y plan del 11 de noviembre) describen la primera versión, llamada Terra, que mostraba huellas del catálogo y una demostración sintética. Quedaron superados: la aplicación se llama ahora Compás y trabaja solo con datos reales. Las fuentes vigentes son `docs/contrato-api.md` (API, hechos verificados y método) y `docs/diseno.md` (dirección de diseño).

## Hecho

- Backend FastAPI completo: catálogo CMR, imágenes de vista previa con caché, método de cambio versión 3, series y cuadros de animación, sonda, respuesta urgente, interferogramas, eventos EONET, imagen EPIC y lupa calibrada sobre el producto GCOV. 106 pruebas sin red.
- Método validado contra el producto calibrado (`docs/validacion-browse.json`).
- Frontend completo: portada, historias, explorar cualquier punto, lupa calibrada, historia de interferogramas, En vivo con eventos agrupados y respuesta urgente, panel de lectura en pestañas con hipótesis físicas por clase y exportación, capas de contexto (Sentinel-1, cobertura del suelo, población), partitura, danza, mapa óptico del día, diálogo Método con «Qué viene con NISAR», español e inglés, enlace permanente y hoja inferior en celular. 104 pruebas.
- Cuatro historias con datos reales: La Mojana, valle de San Joaquín, Vatnajökull y Kilauea.
- Lanzador (`scripts/start.ps1`) y precálculo de historias (`scripts/prewarm.py`).
- Repositorio público con licencia MIT: https://github.com/Gxxrazn21/compas-nisar

## Pendiente

- Probar la hoja inferior en un celular real (solo se revisó en Chrome sin cabeza).
- La capa de Sentinel-1 sale vacía en muchas fechas y el servicio GIBS falla a ratos: falta un botón que salte a la pasada con datos más cercana.
- Las capas de contexto no se ven del lado «antes» de la cortina.
- Al desplegar una hipótesis en pantallas bajas, el texto queda cortado hasta desplazar el panel.
- Un párrafo de contexto personal sobre La Mojana, que debe escribir el autor.
- Material de entrega del Space Apps: video o diapositivas de la demostración.

## Decisiones

- Se descartó calibrar las imágenes de vista previa con el histograma de `QA_STATS`: los percentiles del dato sin promediar no coinciden con los del dato promediado.
- Se descartaron dos historias tras probarlas: Tonlé Sap (una fecha cubre solo una franja del cuadro) y la cosecha del Punyab (señal demasiado ruidosa en HH).
- Solo se comparan fechas del mismo modo de adquisición.
