# Estado de las mejoras de impacto

Se implementaron las correcciones y mejoras sobre `mejoras/impacto-cientifico`, después de conservar la versión anterior. La [auditoría original](revision-reto-impacto-2026-11-14.md) permanece como registro histórico; este documento describe el resultado posterior.

| Área | Resultado | Comprobación y límite |
|---|---|---|
| Respaldo | Etiqueta, commit y bundle previo a modificar el producto | Bundle verificado; [recuperación sin perder mejoras](demo.md#volver-a-la-versión-anterior). |
| Regla HV | Estabilidad limitada a ±1,5 dB, con métodos y caché versionados | Pruebas de frontera y caso HH +4/HV −6. La regla física aún no tiene validación de campo. |
| Calidad | Ajuste, cobertura e interpretación separados | Pruebas browse y GCOV; ninguna buena normalización se presenta como confirmación. |
| Validación | Tres combinaciones de zona/fechas, HH/HV, umbrales 2/3/4 | [Resultados completos](validacion-ampliada.md), incluidos fallos y denominadores cero; no generalizar fuera de la región. |
| Partitura | Selector HH/HV, escala fija, punto explícito, imágenes normalizadas e intervalos reales | Pruebas de valores ausentes, cancelación, timeout, filtrado y versiones. Revisión visual actual pendiente. |
| Demo | Cuatro pasos con datos reales y ventana calibrada de La Mojana | 32 imágenes y dos sondas verificadas sin conexiones externas, token ni caché derivada. Requiere servidor local. |
| Evidencia | Contraste externo fechado, revisión manual y notas por comparación | Pruebas de estados y fechas. No calcula concordancia automática ni confirma testimonios. |
| Informe | HTML con imagen incorporada, procedencia y siguiente comprobación, además de JSON | Pruebas de escape, enlaces y contenido; descarga e impresión manuales pendientes. |
| Narrativa | Se retiraron afirmaciones de agua inequívoca y bordes exactos | Textos ES/EN y documentación coherentes con los límites del método. |

## Verificación técnica

- Backend: `python -X utf8 -m unittest discover -s tests` — **154 pruebas aprobadas**.
- Frontend: `npm.cmd test -- --run` — **137 pruebas aprobadas**, 16 archivos.
- Producción: `npm.cmd run build` — TypeScript y Vite completados.
- Paquete real: `python -X utf8 scripts/smoke_demo.py` — **32 imágenes y dos sondas**, con conexiones externas bloqueadas.
- Validación ampliada: ejecutada contra productos reales; el JSON conserva productos, métodos, entorno y huellas.

El host de automatización de navegador no estuvo disponible. No se afirma que hayan pasado revisión visual actual, descarga real, impresión, lector de pantalla o teclado de extremo a extremo. El código de presentación móvil permite mostrar intervalos y expandir la explicación; necesita inspección en dispositivos.

## Diferenciación que queda por demostrar

El proyecto ahora conecta una historia local, medición calibrada, explicación sonora y evidencia compartible en un solo recorrido. Eso es una propuesta concreta de valor; todavía no demuestra superioridad frente a otros proyectos.

Para medir su impacto faltan: corroboración cuantitativa con una fuente independiente alineada espacial y temporalmente; observaciones locales fechadas; y pruebas con personas de la audiencia objetivo. Un ensayo sugerido es pedir a cinco participantes que identifiquen qué representa la altura de una nota y distingan cambio de señal de confirmación de inundación, conservando tanto errores como aciertos. No se contactó a terceros ni se inventaron resultados de esas pruebas.
