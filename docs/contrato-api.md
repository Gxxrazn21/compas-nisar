# Contrato de la API y hechos verificados

Documento de trabajo para quienes construyen el backend y el frontend. Todo lo que aparece en «Hechos verificados» se comprobó contra los servicios reales el 11 de noviembre de 2026; los prototipos están en `scripts/proto/`. Los textos de `data/stories.json` son bilingües: cada campo de texto es `{"es": "…", "en": "…"}`.

## Hechos verificados

**Imágenes browse de NISAR (públicas, sin Earthdata Login).** Cada granule GCOV de las colecciones `NISAR_L2_GCOV_V1` (validada) y `NISAR_L2_GCOV_PROVISIONAL_V1` publica `…_LATLON.png` (~5 MB, ~1980×1950 px, ~170 m/píxel, RGB, color transparente `(0,0,0)` = sin dato) y `…_LATLON_thumbnail.png` (100×100). La URL responde 303 hacia una URL firmada de CloudFront; hay que seguir redirecciones. Host único: `nisar.asf.earthdatacloud.nasa.gov`.

- Canal R = HH, canal G = HV, canal B = HH (se cumple `R == B` en el 100 % de los píxeles). En adquisiciones de una sola polarización `R == G == B`.
- La colección `NISAR_L2_GCOV_BETA_V1` solo publica `….png` (sin `_LATLON`), en otra cuadrícula (1948×1986 frente a 1955×1986 en la misma pila). No es comparable píxel a píxel: se lista con `analyzable: false`.
- El `…_LATLON.kml` (esquinas exactas en `<coordinates>` dentro de `LatLonQuad`, orden SO, SE, NE, NO, rectángulo alineado a los ejes) solo es público en la colección validada (ruta `/BROWSE/`). En PROVISIONAL y BETA la URL listada está bajo `/NISAR/` y devuelve 401.
- Los archivos `.h5`, `QA_*`, `.rc.yaml`, `.met.json` exigen login (401). No se usan.

**La cuadrícula es fija dentro de una pila.** Todas las fechas `_LATLON` de un mismo `STACK_ID` tienen idéntico tamaño en píxeles y la correlación entre fechas es máxima sin desplazamiento (0,947 frente a 0,90 con ±1 px). Por tanto, el KML de cualquier escena validada de la pila georreferencia a todas las demás del mismo tamaño.

**Georreferencia alternativa por huella.** Si la pila no tiene ningún KML público: caja de píxeles válidos (columnas y filas con ≥3 píxeles no nulos) ↔ caja de la huella CMR (`GPolygons`). Error medido frente al KML: 0,3–2,9 px. Ver `scripts/proto/proto_georef.py`.

**CMR (`https://cmr.earthdata.nasa.gov/search/granules.umm_json`).**
- Colecciones GCOV: `short_name=NISAR_L2_GCOV*` con `options[short_name][pattern]=true`.
- Filtros útiles: `point=lon,lat`, `bounding_box=w,s,e,n`, `temporal=inicio,fin`, `attribute[]=string,STACK_ID,011_D_084`, `sort_key=-start_date`, `page_size` (máx. 2000). El total viene en la cabecera `CMR-Hits`.
- Campos: `meta.concept-id`, `umm.GranuleUR`, `umm.TemporalExtent.RangeDateTime.BeginningDateTime`, `umm.CollectionReference.ShortName`, `umm.AdditionalAttributes[]` (`STACK_ID`, `TRACK_NUMBER`, `FRAME_NUMBER`, `ASCENDING_DESCENDING`, `FREQUENCY_A_POLARIZATION` = `['HH','HV']`), `umm.SpatialExtent.HorizontalSpatialDomain.Geometry.GPolygons[0].Boundary.Points[]` (`Longitude`, `Latitude`), `umm.RelatedUrls[]` (`URL`; aparecen duplicadas en https y s3: usar solo https).
- Nombre del granule: `NISAR_L2_PR_GCOV_034_083_D_085_4005_DHDH_A_20261029T232018_…` → ciclo `034`, pista `083`, dirección `D`, cuadro `085`.
- La misma fecha puede existir en varias colecciones: conservar una por fecha con prioridad validada > provisional > beta.
- Otras colecciones con browse `_LATLON.png` público: `NISAR_L2_GUNW_PROVISIONAL_V1` (interferogramas; PNG RGBA; el nombre trae las dos fechas en las posiciones 11 y 13 al separar por `_`), `NISAR_L2_GOFF_PROVISIONAL_V1` (desplazamientos), `NISAR_UR_L2` (respuesta urgente, casi en tiempo real: más de 6500 granules, el último de hoy).

**Otros servicios NASA.**
- EONET v3 (sin clave): `https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=30`. Categorías: drought, dustHaze, earthquakes, floods, landslides, manmade, seaLakeIce, severeStorms, snow, tempExtremes, volcanoes, waterColor, wildfires.
- EPIC (con `NASA_API_KEY`): `https://api.nasa.gov/EPIC/api/natural?api_key=…` → lista del día más reciente; imagen en `https://api.nasa.gov/EPIC/archive/natural/AAAA/MM/DD/jpg/{image}.jpg?api_key=…`. La clave nunca se envía al navegador: el backend descarga y sirve la imagen.
- `api.nasa.gov/planetary/earth/imagery` y `api.nasa.gov/EONET` devuelven 503: no usar.
- GIBS (teselas sin clave, las usa el frontend directo): `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{AAAA-MM-DD}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg` (máx. z 9).

## Método de cambio (normativo, versión 3)

Entradas: dos imágenes `_LATLON` de la misma pila **y del mismo modo de adquisición** (mismo tamaño en píxeles). Implementación de referencia: `scripts/proto/proto_normalizacion.py`.

**Cómo se fabrica el browse** (código fuente de `nisarqa`, `backscatter_images_and_browse.py` y `plotting_utils.py`): potencia lineal promediada → recorte entre los percentiles 5 y 95 **de cada imagen y canal** → normalización a 0–1 → gamma 0,5 → cuantización a 1–255 (0 = sin dato). Es decir, `ND = 1 + 254·√((clip(P, p5, p95) − p5)/(p95 − p5))`. Consecuencia: `q = ((ND − 1)/254)²` es una función afín de la potencia, `P = p5 + (p95 − p5)·q`, con constantes distintas en cada fecha. Dos fechas no son comparables sin normalizar, y por debajo de p5 o por encima de p95 el dato está censurado.

1. `valido = (A.max(eje 2) > 0) & (B.max(eje 2) > 0)`, erosionado 2 px (bordes de franja).
2. `q = ((ND − 1)/254)²` por canal, filtrado con media 5×5 normalizada por píxeles válidos.
3. **Normalización relativa entre fechas.** Sobre píxeles válidos no saturados (ND distinto de 1 y de 255 en ambas fechas; muestra de hasta 300.000) se ajusta `q_B ≈ α·q_A + β` con regresión de eje mayor reducido robusta (pendiente = σ_B/σ_A; 5 iteraciones descartando residuos ortogonales mayores que 2,5 σ robustas). Es simétrica: no sufre el sesgo de atenuación de los mínimos cuadrados. La fecha A queda expresada en unidades de B: `q_A' = α·q_A + β`.
4. **Intervalo comparable.** En unidades de B, A solo informa entre `β` y `α + β`; B, entre 0 y 1. Ambos se recortan a `[max(0, β), min(1, α + β)]` para no inventar cambio donde una de las fechas está censurada.
5. `Δ = 10·log10((q_B + c)/(q_A' + c))` con `c = 0,03`, valor supuesto para `p5/(p95 − p5)` (≈ −20 dB frente a −4 dB, típico de γ⁰ en banda L sobre tierra). Las cifras son **dB aproximados**: en superficies muy oscuras o muy brillantes son cotas inferiores del cambio real.
6. Clases, en orden de prioridad (umbral 3 dB; «oscuro» = valor recortado ≤ límite inferior del intervalo + 0,04), seguidas de un filtro de mediana 3×3:

| clave | condición | etiqueta |
|---|---|---|
| `agua_nueva` | ΔHH ≤ −3 y HH después oscuro | Posible agua abierta nueva |
| `agua_retirada` | ΔHH ≥ +3 y HH antes oscuro | Posible retiro de agua |
| `veg_inundada` | dual, ΔHH ≥ +3, ΔHV < +1,5 y HH antes no oscuro | Posible vegetación inundada |
| `veg_perdida` | dual y ΔHV ≤ −3 | Posible pérdida de vegetación |
| `veg_aumento` | dual y ΔHV ≥ +3 | Posible aumento de vegetación |
| `aumento` | resto con ΔHH ≥ +3 | Aumento de retorno |
| `disminucion` | resto con ΔHH ≤ −3 | Disminución de retorno |

7. Área por píxel en km²: `(res_lon·111,320·cos(lat)) · (res_lat·110,574)`, por fila.
8. **Confianza de la comparación**: `alta` si la correlación HH entre fechas ≥ 0,85 y la fracción de píxeles concordantes del ajuste ≥ 0,80; `media` si la correlación ≥ 0,70; `baja` en otro caso (cambió gran parte de la escena o los estiramientos difieren demasiado: la normalización relativa deja de ser fiable).

Lo que mide el método es el cambio **relativo al conjunto de la escena**: una variación que afecte por igual a todo el cuadro (por ejemplo, humedad general tras lluvias) queda absorbida por la normalización. Toda etiqueta es una hipótesis («posible»), nunca un evento confirmado.

**Modos de adquisición.** Dentro de una pila la caja geográfica es fija, pero el modo puede cambiar entre fechas (por ejemplo `2005_QPDH` y `4005_DHDH`, tomados del nombre del granule), con otro tamaño en píxeles y con franjas sin señal en polarización cuádruple. Solo se comparan fechas del mismo modo; mezclar modos produce franjas falsas (comprobado en la pila `091_D_076`).

## Endpoints

Errores: `422` entrada inválida, `404` sin datos, `502` servicio externo caído; cuerpo `{"detail": "mensaje en español"}`.

### `GET /api/health`
`{"status":"ok","version":"0.2.0","nasa_key":true}`

### `GET /api/stacks?lon=&lat=`
Pilas GCOV que cubren un punto, ordenadas por número de fechas analizables.
```json
{"point":[-74.75,8.55],"stacks":[Stack]}
```
`Stack`:
```json
{"id":"011_D_084","track":11,"frame":84,"direction":"DESCENDING","polarizations":["HH","HV"],
 "footprint":{"type":"Polygon","coordinates":[[[lon,lat],…]]},
 "first":"2025-10-29","last":"2026-10-24","analyzable_count":10,"scenes":[Scene]}
```
`Scene` (una por fecha, orden ascendente):
```json
{"id":"G4407663326-ASF","granule":"NISAR_L2_PR_GCOV_…","date":"2026-10-24","datetime":"2026-10-24T23:28:04Z",
 "cycle":34,"mode":"4005_DHDH","collection":"NISAR_L2_GCOV_V1","quality":"validated","analyzable":true,
 "thumbnail":"/api/image?url=…&w=100","browse_url":"https://nisar.asf…_LATLON.png","download_url":"https://…h5"}
```
`quality` ∈ `validated | provisional | beta`. `mode` sale del nombre del granule (posiciones 8 y 9 al separar por `_`); el frontend solo deja comparar dos fechas con el mismo `mode`.

### `GET /api/stack/{stack_id}`
Un `Stack` por identificador (sin punto). `404` si no existe.

### `GET /api/change?stack=&before=AAAA-MM-DD&after=AAAA-MM-DD[&aoi=w,s,e,n]`
Calcula (o lee de caché) el cambio. `before < after`; ambas fechas deben ser analizables y del mismo `mode` (si no, `422`). Con `aoi`, capas y estadísticas se recortan a esa ventana (ajustada a la cuadrícula); sin `aoi`, cuadro completo.
```json
{"id":"a1b2c3d4e5f60718","stack":"011_D_084","before":Scene,"after":Scene,"days_between":120,
 "dual_pol":true,"georef":"kml",
 "bounds":[w,s,e,n],"coordinates":[[w,n],[e,n],[e,s],[w,s]],"size":[ancho,alto],
 "layers":{"before":"/derived/ID/before.png","after":"/derived/ID/after.png","change_hh":"/derived/ID/change_hh.png",
           "change_hv":"/derived/ID/change_hv.png","classes":"/derived/ID/classes.png","composite":"/derived/ID/composite.png"},
 "stats":{"valid_km2":41234.5,"changed_km2":1840.2,"changed_pct":4.5,"correlation":0.947,
          "confidence":{"level":"alta","reasons":[]},
          "classes":[{"key":"agua_nueva","label":"Posible agua abierta nueva","km2":312.4,"pct":0.76,"color":"#38bdf8"}],
          "hh":{"gain":0.99,"bias":0.061,"inliers":0.94,"range":[0.061,1.0],"p5":-1.4,"p95":1.3,"hist":{"edges":[-10,-9.5,…,10],"counts":[…]}},
          "hv":{…}},
 "method":{"version":3,"formula":"Δ ≈ 10·log10((q₂ + c)/(α·q₁ + β + c)), con q = ((ND − 1)/254)²","c":0.03,"threshold_db":3,"filter":"media 5×5",
           "note":"Derivado de imágenes browse oficiales GCOV con normalización relativa entre fechas; dB aproximados, no γ⁰ calibrado."},
 "limitations":["…"]}
```
`georef` ∈ `kml | stack-kml | footprint`. `change_hv` y `stats.hv` son `null` en polarización simple. `coordinates` va en el orden que exige una fuente `image` de MapLibre (NO, NE, SE, SO). `classes[].pct` es sobre el área válida. Todas las capas son PNG RGBA del mismo tamaño:
- `before`, `after`: RGB oficial, alfa 0 donde no hay dato.
- `change_hh`, `change_hv`: divergente; disminución en azules (`#7dd3fc` → `#0284c7`), aumento en naranjas (`#fdba74` → `#ea580c`), saturación en ±8 dB; alfa = `clamp((|Δ|−1)/2, 0, 1)·0,92` para que lo estable sea transparente.
- `classes`: color de clase con alfa 0,9; estable transparente.
- `composite`: R = HH después, G = B = HH antes; alfa 0 sin dato.

Colores de clase: `agua_nueva #38bdf8`, `agua_retirada #fbbf24`, `veg_inundada #e879f9`, `veg_perdida #f87171`, `veg_aumento #4ade80`, `aumento #fb923c`, `disminucion #60a5fa`.

### `GET /api/probe?change=ID&lon=&lat=`
Valor en un punto de un cambio ya calculado.
```json
{"lon":-74.6,"lat":8.9,"valid":true,"class":"agua_nueva","label":"Posible agua abierta nueva",
 "hh":{"before_db":-3.1,"after_db":-10.4,"delta_db":-7.3},"hv":{"before_db":-5.2,"after_db":-9.0,"delta_db":-3.8}}
```
`before_db` y `after_db` son `10·log10(q + c)` en la escala común (dB relativos a la escena, no γ⁰). Fuera del cuadro o sin dato: `{"valid":false}`.

### `GET /api/series?stack=&lon=&lat=[&max=12][&radius=4][&aoi=w,s,e,n]`
Serie temporal en un punto (media de `q` en una ventana de `(2·radius+1)²` píxeles) y cuadros para la animación. Solo entran fechas del modo más frecuente de la pila. Cada fecha se normaliza contra la más reciente con el mismo ajuste del método (paso 3) y se informa `10·log10(q' + c)`. Si hay más de `max` fechas analizables, muestrea de forma uniforme conservando la primera y la última. Descarga con concurrencia máxima 4 y caché en disco.
```json
{"stack":"011_D_084","point":[-74.6,8.9],"dual_pol":true,
 "series":[{"date":"2026-06-26","granule":"…","quality":"provisional","hh_db":-9.2,"hv_db":-15.1}],
 "bounds":[w,s,e,n],"coordinates":[[w,n],[e,n],[e,s],[w,s]],
 "frames":[{"date":"2026-06-26","url":"/derived/series/HASH/2026-06-26.webp"}]}
```
`hh_db` es `null` si el punto no tiene dato en esa fecha. Los cuadros son WebP con alfa, máximo 1024 px de lado mayor, recortados a `aoi` si se indica.

### `GET /api/image?url=&w=`
Proxy con caché y redimensionado de una imagen browse. Solo acepta `https://nisar.asf.earthdatacloud.nasa.gov/…` terminado en `.png`; cualquier otra cosa → `422`. `w` entre 64 y 2048.

### `GET /api/urgent?limit=30`
Últimas adquisiciones de respuesta urgente (`NISAR_UR_L2`).
```json
{"scenes":[{"granule":"NISAR_L2_UR_GCOV_…","product":"GCOV","datetime":"2026-11-11T12:34:55Z","stack":"091_D_077",
            "footprint":{…},"center":[lon,lat],"thumbnail":"/api/image?url=…&w=100","browse_url":"https://…"}]}
```

### `GET /api/interferograms?lon=&lat=[&limit=8]`
Interferogramas GUNW más recientes sobre un punto, listos para superponer.
```json
{"items":[{"granule":"NISAR_L2_PR_GUNW_…","reference_date":"2026-10-05","secondary_date":"2026-10-17","track":72,"frame":79,
           "direction":"DESCENDING","image":"/api/image?url=…&w=1400","coordinates":[[w,n],[e,n],[e,s],[w,s]],
           "georef":"footprint","footprint":{…}}]}
```

### `GET /api/stories`
Contenido de `data/stories.json`: `{"stories":[Story]}`.
```json
{"id":"mojana","title":"…","kicker":"…","lens":"agua","place":"La Mojana","country":"Colombia",
 "center":[-74.6,8.9],"zoom":9,"aoi":[w,s,e,n],"stack":"011_D_084","before":"2026-06-26","after":"2026-10-24",
 "summary":"…","steps":[{"title":"…","text":"…"}],"sources":[{"label":"…","url":"…"}]}
```

### `GET /api/events?days=30` (módulo `backend/extras.py`)
Eventos naturales de EONET, normalizados; caché en memoria de 15 minutos.
```json
{"events":[{"id":"EONET_26159","title":"Tropical Cyclone 03S","category":"severeStorms","category_label":"Tormentas severas",
            "date":"2026-11-08T00:00:00Z","lon":52.6,"lat":-13.5,"closed":false,"link":"https://eonet…","source_url":"https://…"}],
 "source":"NASA EONET v3"}
```
Se usa la geometría más reciente; los polígonos se reducen a su centroide.

### `GET /api/earth-today` y `GET /api/earth-today/image` (módulo `backend/extras.py`)
`{"date":"2026-11-09","caption":"…","image":"/api/earth-today/image","source":"NASA EPIC / DSCOVR"}`. La imagen es el JPEG de EPIC guardado en `data/cache/epic/`. Sin clave configurada: `503` con mensaje claro.

### Archivos estáticos
`/derived/…` sirve `data/cache/derived/`. `/` sirve `dist/` si existe.

## Lupa calibrada: producto GCOV completo (requiere `EARTHDATA_TOKEN`)

**Hechos verificados (12 de noviembre de 2026, `scripts/proto/proto_gcov_remoto.py`).** Con un token de Earthdata Login en la cabecera `Authorization: Bearer …`, la URL `.h5` del granule responde 303 hacia una URL firmada de CloudFront que acepta peticiones por rangos sin más credenciales. El archivo (≈6 GB) es HDF5 con `science/LSAR/GCOV/grids/frequencyA/{HHHH,HVHV}`: `float32`, γ⁰ en potencia lineal, 33.120 × 33.768 px a **10 m**, bloques de 512×512 con gzip, `_FillValue` NaN; además `xCoordinates`, `yCoordinates` (UTM, paso 10 y −10) y `projection` (atributo `epsg_code`, p. ej. 32618). Abrir y leer metadatos: ~12 s y 8 MB. Una ventana de 1024×1024 px: ~16 s y 13 MB con lecturas secuenciales de 2 MB (≈4,6 MB por megapíxel). El archivo `…_QA_STATS.h5` (73 KB) confirma en los metadatos de cada producto el estiramiento del browse: percentiles `[5, 95]`, gamma `0,5`, unidades lineales.

Se probó y **se descartó** calibrar el browse con el histograma de `QA_STATS`: el histograma es del dato sin promediar y el browse se recorta sobre el dato promediado 17×17, así que los percentiles no coinciden (la gamma efectiva salía entre 0,28 y 0,78 según la escena).

### `GET /api/health`
Añade `"earthdata": true|false` (hay token configurado).

### `GET /api/zoom?stack=&before=AAAA-MM-DD&after=AAAA-MM-DD&lon=&lat=[&size_km=15]`
Cambio con γ⁰ calibrado en una ventana cuadrada centrada en el punto (`size_km` entre 5 y 30). Sin token → `503` con mensaje claro. Mismas reglas de fechas y de `mode` que `/api/change`. La respuesta tiene **la misma forma que `/api/change`** (para que el frontend la trate igual), con estas diferencias:

- `"source": "gcov"` (en `/api/change` es `"browse"`), `"resolution_m"` (p. ej. 30) y `"georef": "product"`.
- `coordinates` son las cuatro esquinas (NO, NE, SE, SO) de la ventana UTM convertidas a lon/lat: un cuadrilátero levemente girado, que la fuente `image` de MapLibre admite tal cual. `bounds` es su caja envolvente.
- `method`: `{"version":"gcov-1","formula":"Δ dB = 10·log10(γ⁰₂/γ⁰₁)","threshold_db":3,"filter":"promedio N×N en potencia y media 3×3 antes del cociente","dark_db":-18,"note":"γ⁰ calibrado leído del producto GCOV de NISAR."}`.
- `stats.hh` y `stats.hv`: `{"median_before_db","median_after_db","p5","p95","hist"}` (sin `gain`, `bias`, `inliers` ni `range`: no hay normalización relativa). `stats.confidence.level` es `alta` salvo que menos de la mitad de la ventana tenga dato.
- Método: promedio N×N en potencia lineal (N ≥ 3, y el necesario para que el lado no pase de 1500 px), `Δ = 10·log10(P₂/P₁)`, mismas siete clases con umbral de 3 dB y «oscuro» = γ⁰ HH ≤ −18 dB, mediana 3×3.
- Capas: `before` y `after` se pintan con un estiramiento **físico fijo** (R = B = HH de −25 a 0 dB, G = HV de −32 a −7 dB), así que sí son comparables entre fechas; `change_*`, `classes` y `composite` como en `/api/change`.
- `/api/probe?change=ID` funciona igual; aquí `before_db` y `after_db` son γ⁰ en dB reales.

## Historias: campos adicionales

- `kind`: `"change"` (por defecto: usa `stack`, `before`, `after`, `aoi`) o `"interferogram"` (usa `point: [lon, lat]` y `limit`; se alimenta de `/api/interferograms` y muestra la imagen oficial GUNW sin procesar, con selector entre los pares de fechas devueltos).
- `lupa` (opcional, solo en historias `change`): `{"lon", "lat", "size_km"}`, la ventana de la lupa calibrada de esa historia.
- `zoom` (opcional): zoom de cámara. Si falta, las historias `change` encuadran su `aoi`.
- `steps[].layer` admite además `"zoom"` (pide `/api/zoom` con la `lupa` de la historia y muestra su capa de cambio; el paso solo aparece si `/api/health` informa `earthdata: true`) e `"interferogram"`.
- `lens` puede valer `"deformacion"` en historias de interferogramas: no hay clases ni leyenda de clases.

## Capas de contexto (NASA GIBS, sin clave; las usa el frontend directo)

Verificadas el 12 de noviembre de 2026 contra `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities`. Base: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best`.

| Capa | URL de teselas | Zoom máx. | Para qué |
|---|---|---|---|
| Agua superficial vista por Sentinel-1 (OPERA DSWx-S1, banda C) | `/OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1/default/{AAAA-MM-DD}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png` | 12 | Contraste independiente: otro radar, otra frecuencia. Es diaria y solo trae las pasadas de ese día (Sentinel-1 vuelve cada 6 a 12 días), así que muchas fechas salen vacías: ofrecer avanzar y retroceder días alrededor de la fecha «después». |
| Cobertura del suelo (MODIS IGBP, anual) | `/MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual/default/2024-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png` | 8 | Qué hay en el terreno: bosque, cultivo, humedal, ciudad. |
| Densidad de población (GPW 2020) | `/GPW_Population_Density_2020/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png` | 7 | A quién afecta el cambio. |

Atribución: NASA EOSDIS GIBS; OPERA (JPL); MODIS (NASA LP DAAC); GPW v4 (NASA SEDAC, CIESIN).

En las historias, `steps[].layer` admite también `"change_hv"`.
