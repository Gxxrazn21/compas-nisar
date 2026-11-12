# Progreso

Estado al 12 de noviembre de 2026.

Los documentos de `docs/superpowers/` (diseño y plan del 11 de noviembre) describen la primera versión, llamada Terra, que mostraba huellas del catálogo y una demostración sintética. Quedaron superados: la aplicación se llama ahora Compás y trabaja solo con datos reales. Las fuentes vigentes son `docs/contrato-api.md` (API, hechos verificados y método) y `docs/diseno.md` (dirección de diseño).

## Hecho

- Backend FastAPI completo: catálogo CMR, imágenes de vista previa con caché, método de cambio versión 3, series y cuadros de animación, sonda, respuesta urgente, interferogramas, eventos EONET, imagen EPIC y lupa calibrada sobre el producto GCOV. 106 pruebas sin red.
- Método validado contra el producto calibrado (`docs/validacion-browse.json`).
- Frontend completo: portada, historias, explorar cualquier punto, lupa calibrada, historia de interferogramas, En vivo (eventos y respuesta urgente), panel de lectura con exportación, partitura, danza, mapa óptico del día, diálogo Método, español e inglés, enlace permanente y hoja inferior en celular. 75 pruebas.
- Tres historias con datos reales: La Mojana, Vatnajökull y Kilauea.
- Lanzador (`scripts/start.ps1`) y precálculo de historias (`scripts/prewarm.py`).
- Verificado en modo producción (un solo servidor en el puerto 8000) con capturas en `docs/capturas/`.

## Pendiente

- Probar la hoja inferior en un celular real (solo se revisó en Chrome sin cabeza).
- Panel de lectura largo: agruparlo en pestañas lo haría más cómodo de proyectar.
- A 1366×768 el mapa queda ajustado entre paneles.
- El diálogo Método es extenso; la validación merecería una figura.
- En vivo: los incendios (más de 400 puntos) tapan otras categorías; convendría agruparlos.

## Decisiones

- Se descartó calibrar las imágenes de vista previa con el histograma de `QA_STATS`: los percentiles del dato sin promediar no coinciden con los del dato promediado.
- Se descartaron dos historias tras probarlas: Tonlé Sap (una fecha cubre solo una franja del cuadro) y la cosecha del Punyab (señal demasiado ruidosa en HH).
- Solo se comparan fechas del mismo modo de adquisición.
