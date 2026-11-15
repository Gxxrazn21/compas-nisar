# SARitmo: cumplimiento del reto y oportunidades de impacto

Revisión del 14 de noviembre de 2026 contra el texto proporcionado por Jhonatan. Es una evaluación del proyecto, no una certificación del concurso ni una comparación exhaustiva con todos los participantes.

## Dictamen

SARitmo cubre el núcleo funcional del reto: utiliza NISAR real, permite comparar fechas y explorar lugares, presenta historias con hipótesis físicas y comunica los resultados en una aplicación interactiva con licencia MIT. También incorpora varias sugerencias opcionales: polarizaciones, contexto de otro radar, cobertura del suelo, población, animación y sonificación.

El cumplimiento es parcial en dos resultados deseados: demostrar que una audiencia no especializada entiende la herramienta y convertir la observación en información útil para una decisión concreta. La principal deuda es científica y comunicativa: buena correlación espacial no equivale a buena detección por umbral, y el indicador de «confianza» puede interpretarse como una garantía que su cálculo no ofrece.

Recomendación: consolidar La Mojana como caso principal, con evidencia calibrada y una pregunta local verificable, y conservar agricultura, hielo y Hawái como prueba de alcance. La partitura ya aporta identidad; el siguiente salto consiste en conectar esa identidad con comprensión y utilidad demostradas.

## Qué se verificó

- Backend: `python -X utf8 -m unittest discover -s tests`, **130 pruebas aprobadas**.
- Frontend: `npm.cmd test`, **124 pruebas aprobadas**, 14 archivos.
- Producción: `npm.cmd run build`, TypeScript y Vite finalizaron con código 0.
- Prueba con servicios reales: `scripts/smoke_backend.py` terminó en `OK`. Consultó CMR, miniatura ASF, cambio de escena completa y área recortada, sonda, serie temporal, adquisiciones urgentes e interferogramas de Hawái.
- Se consultaron además las comparaciones de San Joaquín y Vatnajökull y `/api/events`: respuestas HTTP 200. Esto verifica las rutas de datos, no cada interacción del navegador.
- Se reprodujo `scripts/validar_browse_vs_gcov.py`, cambiando únicamente el archivo de salida para conservar la validación anterior. Resultado nuevo: [validacion-auditoria-2026-11-14.json](validacion-auditoria-2026-11-14.json).
- Se inspeccionaron el código, la documentación, las historias y las capturas existentes de escritorio y celular, especialmente `42-vista-1366x768.png` y `43-movil-390x844.png`.

La primera prueba de red falló con 502 por no poder contactar CMR desde el entorno restringido; al ejecutar la prueba con acceso de red permitido, pasó. El host de automatización del navegador no estuvo disponible. Por tanto, quedan pendientes la verificación visual actual, lector de pantalla, teclado de extremo a extremo, descarga real del informe y pruebas de usabilidad. Tampoco se verificó el acceso público al repositorio o a un despliegue, ni se reprodujo el video.

## Matriz de cumplimiento

«Cumple» indica evidencia de implementación y, donde se señala, ejecución. No significa que toda la experiencia haya sido comprobada manualmente.

| Elemento del texto | Tipo | Estado | Evidencia y alcance |
|---|---|---|---|
| Aplicación interactiva | Núcleo | Cumple en implementación | React, MapLibre, controles de capas, cortina, selección de fechas y sonda. Interacción en vivo pendiente. |
| Usar datos de radar NISAR | Núcleo | Cumple | CMR y ASF respondieron; datos GCOV browse y lectura calibrada HDF5. |
| Rastrear uno o más cambios superficiales | Núcleo | Cumple con límites | Compara retorno HH/HV; las clases son hipótesis, no identificación validada de eventos físicos. |
| Lugares del mundo | Núcleo | Cumple condicionado a cobertura | Exploración por coordenadas/nombre; historias en Colombia, EE. UU. e Islandia. No implica cobertura continua de cualquier sitio y fecha. |
| Elegir un área de estudio | Pasos del reto | Cumple | La Mojana, San Joaquín, Vatnajökull y Hawái, en `data/stories.json`. |
| Obtener datos NISAR gratuitos | Pasos del reto | Cumple | Descargas públicas de browse; producto científico con autenticación Earthdata. |
| Presentar hallazgos en un medio digital | Pasos del reto | Cumple | Aplicación y recorridos narrativos; código de video disponible, reproducción no verificada. |
| Explicar posibles factores físicos | Pasos del reto | Cumple con correcciones | Hipótesis, alternativas y polarización en `src/lib/hypotheses.ts`; inconsistencia de HV detallada abajo. |
| Aplicaciones futuras de NISAR | Pregunta orientadora | Cumple | Sección de futuro del diálogo Método, con aplicaciones y límites actuales. |
| Código abierto | Resultado deseado | Cumple localmente | Licencia MIT, fuentes e instrucciones. Falta verificar que otra persona pueda acceder e instalar desde el repositorio público. |
| Uso fácil y accesible para público amplio | Resultado deseado | Parcial | ES/EN, ayuda, atajos, movimiento reducido, diseño móvil y controles accesibles; falta medir comprensión y completar revisión manual. |
| Información procesable | Resultado deseado | Parcial | Áreas, hipótesis, procedencia y exportación JSON. Falta cerrar el recorrido con una decisión local y evidencia independiente. |
| Diferentes fechas y serie temporal | Opcional | Cumple | Series, comparación, partitura y danza; revisar comparabilidad visual de los cuadros. |
| Diferentes polarizaciones/frecuencias | Opcional | Cumple en parte | HH/HV de NISAR; Sentinel-1 banda C como contexto visual, sin análisis conjunto cuantitativo. No es necesario añadir más sensores para cumplir. |
| Capas auxiliares | Opcional | Cumple | Agua OPERA DSWx-S1, cobertura MODIS y población GPW 2020. Superponer población no calcula población afectada. |
| Impulsores humanos | Opcional | Parcial | Historia agrícola e hipótesis de cosecha, riego y labranza. No se demuestra causalidad con registros externos. |
| Narración e interactividad | Opcional | Cumple | Historias, cortina, reproducción y lenguaje físico por lente. |
| Contexto personal/local | Opcional | Parcial | Contexto territorial de La Mojana; no se encontró testimonio o colaboración local documentada. No es requisito obligatorio. |

El texto no exige cubrir todos los fenómenos enumerados, usar todos los recursos, implementar inteligencia artificial, medir deformación centimétrica ni producir alertas. No conviene ampliar el alcance por esas interpretaciones.

## Hallazgos prioritarios

### P1 — La validación no respalda presentar el umbral como detector confiable

En la nueva ejecución, para una ventana de 15 km de La Mojana, 26 de junio a 24 de octubre de 2026, se compararon 7.744 píxeles comunes:

| Referencia calibrada | Correlación | Mediana de error absoluto | Precisión al umbral de 3 dB | Exhaustividad |
|---|---:|---:|---:|---:|
| Promediada a la cuadrícula browse, aproximadamente 170 m | 0,517 | 0,78 dB | 50,0 % | 12,2 % |
| Además suavizada 5×5, escala cercana a 1 km | 0,861 | 0,69 dB | 12,5 % | 45,0 % |

En la segunda comparación, el browse marca 72 píxeles; la referencia marca 20; coinciden 9. El «100 % de signo correcto» aplica a esos 9 aciertos conjuntos, no a todos los píxeles señalados. En la primera comparación coinciden 36 de 72 detecciones y 296 cambios de referencia.

Esto mide coincidencia del umbral de cambio HH frente al producto calibrado; **no** mide precisión de inundaciones, de vegetación ni del mapa final de clases. El producto calibrado tampoco sustituye verdad de terreno. Los píxeles suavizados están correlacionados espacialmente y no son 7.744 observaciones independientes.

Ubicación: `scripts/validar_browse_vs_gcov.py:78`, nuevo JSON; `README.md:89` y `src/i18n/es.ts:598` resumen la validación anterior. La nueva ejecución da cifras algo distintas en la escala fina; no se atribuye aquí la diferencia a una causa no investigada.

Acción: publicar precisión, exhaustividad, escala y tamaño de muestra junto a correlación y error; distinguir evidencia de patrón espacial de detección de cambios. Reformular «captura la mitad de la variabilidad»: correlación 0,49 no significa 49 % de varianza explicada; la razón de desviaciones es otra medida. Guardar identificadores de productos, versiones del método y huellas de archivos junto a futuras validaciones.

Criterio de cierre: validar varias ventanas y fechas independientes, incluyendo zonas estables y cambios extensos; reportar HH/HV, errores de omisión/comisión y sensibilidad al umbral, sin elegir el umbral y evaluarlo sobre la misma muestra.

### P1 — «Confianza alta» mezcla significados distintos

En `backend/change.py:221`, la confianza describe correlación entre escenas y concordancia del ajuste global. En `backend/gcov.py:254`, la confianza es alta cuando al menos la mitad de la ventana tiene datos válidos. Ambos desembocan en «Confianza alta en esta comparación» (`src/i18n/es.ts:84`).

Impacto: una persona puede interpretar esa etiqueta como certeza de inundación o exactitud de las áreas. La validación anterior muestra que puede haber buena concordancia global y baja coincidencia de detecciones.

Acción: separar «calidad del ajuste entre imágenes», «cobertura de datos» y «respaldo de la interpretación». Indicar explícitamente si existe corroboración independiente y evitar porcentajes de certeza sin calibración estadística.

Criterio de cierre: una comparación con buena normalización, pero sin corroboración, nunca se presenta como confirmación del fenómeno.

### P1 — La regla de vegetación inundada no coincide con su explicación

`backend/change.py:175` exige `delta_hv < 1.5`, mientras `src/lib/hypotheses.ts:115` dice que HV casi no cambia. Una caída fuerte también satisface esa desigualdad. La regla se evalúa antes de pérdida de vegetación y se reutiliza en la lupa calibrada.

Reproducción ejecutada: matrices uniformes con HH = +4 dB, HV = −6 dB, datos válidos y superficie no oscura producen clase **3, vegetación inundada**. HV no está estable.

Acción: decidir y documentar la regla física. Si se pretende estabilidad, evaluar un intervalo acotado alrededor de cero y casos de frontera; si se pretende «sin aumento», corregir explicación e interpretación. Validar la decisión contra muestras independientes antes de conservar la etiqueta física.

Criterio de cierre: código, contrato, texto bilingüe y pruebas de casos contradictorios deben expresar la misma condición.

### P2 — La danza combina imágenes de contraste variable y notas normalizadas

`backend/series.py:68` produce cuadros directamente del RGB browse; `normalized_q` calcula por separado los valores normalizados que alimentan las notas. Un cambio de brillo en la animación puede reflejar el estiramiento de visualización de cada fecha. Además, `src/state/useDance.ts:7` usa 700 ms por cuadro; los intervalos entre adquisiciones no siempre son iguales.

Acción: generar cuadros comparables con una escala compartida, preferentemente calibrados en la historia principal. Mostrar huecos temporales o distinguir reproducción «por observación» de reproducción proporcional al tiempo. Hacer visible el punto al que corresponde la melodía: actualmente `useCompas.ts:409` prioriza el centro del área, no el último punto sondeado.

Criterio de cierre: imagen y nota representan el mismo lugar y fechas, con escala declarada; un intervalo de 24 días no se comunica implícitamente como uno de 12.

### P2 — Algunas frases prometen más precisión de la disponible

`data/stories.json:48` afirma «Lo negro es agua quieta»; `:92` promete «el borde exacto de cada ciénaga». La propia herramienta reconoce otras explicaciones para superficies oscuras y muestra celdas agregadas.

Acción: «En estas ciénagas, las zonas oscuras pueden corresponder a agua quieta; también hay otras causas» y «se aprecia con más detalle el borde de las ciénagas». Revisar ambas traducciones. No confundir tamaño de celda con exactitud del contorno.

La documentación oficial también indica que GCOV puede tener distinto espaciamiento según el modo; los textos generales deberían usar los metadatos del producto, no universalizar 10 m de origen o 30 m de salida. [Guía GCOV de ASF](https://nisar-docs.asf.alaska.edu/gcov/).

### P2 — La continuidad de una demostración aún necesita prueba explícita

El precálculo y la caché existen y funcionan: en esta ejecución, una comparación completa tardó 12 s y su repetición 0,02 s; son observaciones locales, no un benchmark general. Sin embargo, `useDance.ts:52` trata una imagen fallida como una descarga terminada, lo que permite avanzar a reproducción sin distinguir el fallo.

Acción: contabilizar cuadros fallidos y ofrecer reintento o reproducción parcial claramente rotulada. Preparar un paquete reproducible de la historia principal y comprobar arranque con servicios externos caídos. La presencia de caché no demuestra funcionamiento totalmente sin conexión.

## Revisión técnica de interfaz

Valoración provisional por código y capturas existentes, sin certificación WCAG ni medición de rendimiento en dispositivos:

| Dimensión | Puntuación orientativa / 4 | Evidencia |
|---|---:|---|
| Accesibilidad | 3 | Foco visible, diálogos nativos, tabs, nombres de notas, teclado y movimiento reducido. Falta revisión manual completa. |
| Rendimiento | 3 | Caché y separación de bundles; MapLibre produce un chunk de 1.054 kB, 285 kB gzip. No se midió tiempo de interacción. |
| Adaptación a pantallas | 3 | Hoja móvil y reglas de controles de 44 px. Notas SVG con área circular de 28 px: revisar tacto y separación; no se afirma incumplimiento WCAG por ese dato aislado. |
| Consistencia visual | 3 | Tokens y dirección documentada. Mantener la semántica de colores de datos; no cambiarla solo por estética. |
| Identidad y ausencia de patrones genéricos | 4 | Partitura vinculada al tiempo, narración territorial y tipografía coherente. No se observa una plantilla de tarjetas como estructura dominante. |
| Total provisional | **16/20** | Buena base; la corrección científica tiene prioridad sobre el pulido visual. |

No hay un bloqueo P0 confirmado en los recorridos de API probados. Se registran **3 hallazgos P1 y 3 P2** arriba. La revisión visual actual queda pendiente; las capturas muestran composición, no prueban el estado del navegador de hoy.

## Qué puede diferenciar a SARitmo

Worldview ya permite comparar fechas, animar y compartir mapas, y ASF documenta la visualización de NISAR en esa herramienta. Vertex ya ofrece búsqueda especializada de productos SAR. Por eso, mapa + línea de tiempo + búsqueda son una base compartida, no una exclusividad demostrada. [Worldview, NASA](https://earthdata.nasa.gov/s3fs-public/2025-03/worldview-booklet.pdf), [NISAR en Worldview, ASF](https://hyp3-docs.asf.alaska.edu/nisar-docs/worldview/), [NISAR en Vertex, ASF](https://nisar-docs.asf.alaska.edu/vertex/).

Las siguientes son hipótesis de diferenciación que conviene probar, no ventajas competitivas ya medidas:

| Orden | Mejora | Experiencia concreta | Cómo validarla | Esfuerzo relativo |
|---|---|---|---|---|
| 1 | Historia calibrada de La Mojana | Recorrido de 90 segundos: dónde cambió, qué evidencia lo respalda y qué verificar en campo. Abrir una ventana científica precalculada sin pedir al visitante credenciales. | Reproducir desde productos identificados; cotejar varias ventanas con fuente independiente y conservar discrepancias. | Medio-alto |
| 2 | Ficha de evidencia por zona | Al elegir un área: cambio NISAR, coincidencia o desacuerdo con agua Sentinel-1, fechas, calidad, hipótesis alternativas y siguiente comprobación. | Alinear resolución, fecha y máscaras de validez; mostrar «sin dato» cuando corresponda; evaluar concordancia cuantitativa. | Medio-alto |
| 3 | Sonificación que enseña | Alternar HH/HV y escuchar dos lugares, manteniendo una escala común y señalando el punto. Explicar que se sonifican mediciones, no sonidos captados por el satélite. | Cinco usuarios: al menos cuatro deben explicar qué controla la altura de la nota y distinguir observación de hipótesis. Objetivo propuesto, no resultado obtenido. | Medio |
| 4 | Informe breve compartible | Una página con mapa, fechas, fuente, observación, incertidumbre y pregunta siguiente, además del JSON actual. | Un tercero puede abrir la vista y reconstruir la comparación sin explicación oral del autor. | Bajo-medio |
| 5 | Demostración resistente a fallos | Recorrido principal precargado, estado de conexión y fechas del paquete visibles. | Completar el recorrido con CMR/ASF temporalmente indisponibles; nunca presentar una instantánea antigua como dato en vivo. | Medio |

La pregunta local propuesta es: **«¿Qué sectores de La Mojana merecen una verificación de campo por cambios compatibles con expansión del agua?»**. Para sostenerla, hace falta una referencia local fechada —por ejemplo, niveles, reportes o observaciones documentadas— y validar la utilidad con un usuario del territorio. No se hizo ese contacto en esta revisión.

La capa GPW 2020 debe seguir identificada por año y resolución. Calcular exposición requiere datos cuantitativos y un cruce espacial apropiado; una tesela coloreada no sustenta un conteo de personas afectadas en 2026.

## Secuencia recomendada

1. Corregir la interpretación de confianza, el resumen de validación y la inconsistencia HV; conservar evidencia y probar casos frontera. `/clarify` sirve para los textos después de decidir el método.
2. Consolidar la historia principal con comparaciones calibradas y corroboración independiente. Dar a cada cifra una fuente y un límite.
3. Afinar la partitura como herramienta explicativa: punto visible, HH/HV, escala compartida y huecos de adquisición.
4. Medir comprensión con usuarios y completar teclado, lector de pantalla, móvil y zoom del navegador. `/adapt` puede abordar los problemas confirmados de interacción táctil.
5. Medir carga y recuperación ante fallos; usar `/optimize` para cuellos de botella observados.
6. Cerrar con `/polish` y repetir `/audit` sobre la experiencia en vivo.

Estas acciones se pueden abordar individualmente o en conjunto. No priorizaría un chatbot, más historias ni más efectos visuales antes de cerrar las tres brechas P1 y demostrar el valor de La Mojana.

## Archivos producidos por esta revisión

- Este informe.
- `docs/validacion-auditoria-2026-11-14.json`: nueva ejecución de la validación, conservando el archivo histórico.

No se modificó el código de la aplicación. Las pruebas recompilaron `dist` y generaron o reutilizaron caché local de datos.
