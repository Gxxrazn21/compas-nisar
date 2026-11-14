# Recorrido guardado de La Mojana

La portada ofrece **Recorrido guardado**. También se abre con `/?demo=mojana`. Contiene cuatro pasos: territorio, ventana calibrada de 15 km, secuencia a color de las pasadas con notas HH/HV y ficha de evidencia con informe compartible. Usa la misma barra de capas, las mismas capas de contexto (agua, bosques y suelo, población) y el mismo mapa satelital que las historias. Los datos de NISAR son una instantánea fechada, no datos en vivo; el mapa de fondo y las capas de contexto sí se piden por internet, y sin conexión el radar se ve sobre fondo oscuro.

## Preparación y uso

El repositorio incluye el paquete verificado de La Mojana. Para probarlo después de instalar las dependencias no se necesita Earthdata:

```powershell
python -X utf8 scripts/prepare_demo.py --verify
npm.cmd run build
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Abrir `http://127.0.0.1:8000/?demo=mojana`. Para desarrollo, Vite también redirige `/demo-data` al backend. El paquete actual fue preparado el 14 de noviembre de 2026 con productos reales de las fechas declaradas en la historia.

Para regenerar el paquete, ejecutar `python -X utf8 scripts/prepare_demo.py` con acceso a CMR/ASF y `EARTHDATA_TOKEN` configurado localmente. Después, el servidor local entrega el paquete sin token ni consultas externas. Se deben conservar `dist/`, `public/ref` incorporado al build y `data/demo/mojana/`; apagar el servidor local impide usar la app. Los enlaces externos de contraste requieren internet. No se implementó un service worker ni una app instalable completamente autónoma.

## Qué se guarda

- Capas browse y calibradas, cuadros HH/HV, valores de la serie y arrays de sonda.
- Productos identificados, versiones, fecha de preparación y manifiesto SHA-256 con tamaños.
- Archivos separados de la caché evictable, en `data/demo/mojana/`, incluidos en Git para compartir la demostración. Los demás paquetes generados siguen ignorados.

No se incluyen credenciales ni URLs firmadas. Una nueva preparación verifica un directorio temporal antes de reemplazar el paquete anterior. Archivo faltante, hash incorrecto o método incompatible produce error explícito; nunca cae silenciosamente al modo en vivo. La preparación se repite tras cambiar las versiones del método.

Rutas nuevas: `GET /api/demo/mojana`, `GET /demo-data/mojana/assets/…webp` y `GET /api/demo/mojana/probe?change=ID&lon=…&lat=…`. La sonda solo acepta los cambios del paquete. El manifiesto, los arrays y otros archivos no se sirven como descargas públicas.

## Comprobación ejecutable

```powershell
python -X utf8 scripts/smoke_demo.py
```

Bloquea conexiones externas, vacía el token en memoria y sustituye la ruta de caché. Verifica el paquete real, sus 32 imágenes y las dos sondas. Windows necesita loopback para el bucle de eventos del propio cliente de pruebas; esto no habilita conexiones externas.

La prueba de API pasó. La interacción visual, descarga desde el navegador, impresión, teclado y lector de pantalla requieren una revisión manual: el host de automatización no estuvo disponible en esta sesión.

## Evidencia e informe

En **Datos**, el usuario puede abrir el contraste de agua de Sentinel-1, elegir fecha, registrar coincidencia, diferencia o ausencia de datos y escribir una referencia local. Se guarda por comparación en el navegador y se exporta en JSON y HTML. Es una anotación manual: no se calcula concordancia espacial ni se verifica el testimonio.

El HTML lleva la capa HH incorporada, fechas, límites geográficos, productos, áreas, hipótesis, revisión y siguiente comprobación. Se abre sin descargar imágenes externas y se puede imprimir a PDF. La cantidad de texto puede ocupar más de una página; la paginación final no fue comprobada visualmente. El enlace a una instalación local solo funciona donde esa instalación sea accesible.

## Volver a la versión anterior

Punto guardado **antes de modificar la aplicación**: etiqueta `respaldo/antes-mejoras-impacto-2026-11-14`, commit `f0ae5d1bce57704f15731ace5c4ed7852ee799b1`. Incluye la auditoría y conserva el código previo `43bc197`. Las mejoras se desarrollaron en `mejoras/impacto-cientifico` y se integran en `main` por solicitud del usuario. La etiqueta conserva el punto anterior independientemente del avance de las ramas.

Para recuperar el estado anterior en otra carpeta, conservando las mejoras:

```powershell
git worktree add -b recuperar-compas ../nasa-respaldo respaldo/antes-mejoras-impacto-2026-11-14
```

También existe `backups/compas-antes-mejoras-2026-11-14.bundle`, verificado como respaldo completo de Git. Para una copia independiente:

```powershell
git clone backups/compas-antes-mejoras-2026-11-14.bundle ../nasa-recuperado
```

El bundle no contiene `.env`, dependencias ni cachés; esos archivos locales permanecen en el proyecto original. No se necesita borrar ni sobrescribir la rama de mejoras.
