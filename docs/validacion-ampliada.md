# Validación ampliada — 14 de noviembre de 2026

Se ejecutaron tres casos fijados antes de observar sus resultados, dos canales y umbrales de 2, 3 y 4 dB. No se eligió un umbral óptimo. Los resultados completos, versiones, identificadores de producto y SHA-256 están en [el JSON de la ejecución](validacion-multiventana-2026-11-14.json).

## Resultados a 3 dB

La referencia es GCOV calibrado agregado a la cuadrícula browse y con media adicional 5×5. No es una clasificación de inundaciones ni verdad de terreno. «—» es una razón indefinida por denominador cero, no 0 % ni 100 %.

| Caso | Canal | Píxeles comunes | r | Error absoluto mediano (dB) | Detecciones browse / GCOV | Coincidencias | Precisión | Exhaustividad |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| A | HH | 7744 | 0,861 | 0,69 | 72 / 20 | 9 | 12,5 % | 45,0 % |
| A | HV | 7744 | 0,858 | 0,80 | 6 / 0 | 0 | 0 % | — |
| B | HH | 3480 | 0,934 | 0,27 | 0 / 0 | 0 | — | — |
| B | HV | 3480 | 0,959 | 0,30 | 0 / 0 | 0 | — | — |
| C | HH | 3481 | 0,471 | 0,92 | 2 / 41 | 0 | 0 % | 0 % |
| C | HV | 3481 | 0,709 | 1,09 | 0 / 0 | 0 | — | — |

- **A:** centro −74,85°, 8,72°, ventana de 15 km, 26 de junio → 24 de octubre de 2026.
- **B:** mismo centro, 10 km, 26 de junio → 8 de julio. Comparación de pasadas consecutivas; no se presupone estabilidad demostrada en campo.
- **C:** centro −74,65°, 8,90°, 10 km, 26 de junio → 24 de octubre.

Sin la media adicional, las correlaciones son menores: A HH/HV 0,517/0,538; B 0,435/0,515; C 0,313/0,470. En A-HH hay 36 coincidencias entre 72 detecciones browse y 296 calibradas: precisión 50,0 % y exhaustividad 12,2 %. En B hay un píxel calibrado sobre el umbral por canal y ninguno en browse. No conviene resumir todo esto con una única cifra de «exactitud».

## Qué demuestra y qué no

El método puede mostrar patrones amplios, pero su coincidencia al umbral varía y puede ser nula. La ventana C se conserva como resultado desfavorable. La correlación alta de B describe cambios pequeños; no demuestra capacidad para detectar eventos fuertes.

Los tres casos pertenecen a una sola pila y región; A y B comparten centro y fecha inicial. No son una validación geográfica independiente. Los píxeles están suavizados y correlacionados. GCOV ya está promediado y suavizado antes de la comparación; los arrays guardados usan float16. Las huellas registran exactamente los insumos utilizados. La corrección posterior del rótulo de consola para mostrar el umbral configurado no modificó métricas ni archivos de resultados.

Quedan pendientes muestras de otras regiones, controles estables corroborados, cambio extenso confirmado, validación de las clases físicas y concordancia con otra fuente con fechas y resolución alineadas. La ficha de revisión visual facilita documentar evidencia, pero no sustituye esa validación cuantitativa. Tampoco se han realizado pruebas de comprensión con usuarios locales.

## Reproducción

Con Earthdata configurado, ejecutar desde la raíz (usar un archivo de salida nuevo; el script rechaza sobrescribir):

```powershell
python -X utf8 scripts/validar_browse_vs_gcov.py --case 011_D_084 2026-06-26 2026-10-24 -74.85 8.72 15 --case 011_D_084 2026-06-26 2026-07-08 -74.85 8.72 10 --case 011_D_084 2026-06-26 2026-10-24 -74.65 8.9 10 --channel HH --channel HV --thresholds 2 3 4 --output docs/validacion-nueva.json
```

Los cambios de productos, cachés o métodos pueden cambiar los resultados; comparar sus identificadores y huellas antes de atribuir la diferencia a una causa.
