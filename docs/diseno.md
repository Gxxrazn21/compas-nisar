# Compás: dirección de diseño

Guía para quien construya o retoque la interfaz. Las decisiones de aquí ya están tomadas; lo que no esté escrito queda a criterio de quien implementa, siempre que respete los principios.

## La idea

El reto se llama «Dancing with the SARs». NISAR pasa sobre cada lugar cada 12 días: ese es el compás de la danza. La aplicación se llama **Compás** (ritmo y, a la vez, instrumento para orientarse) y su pieza distintiva es la **partitura**: la línea de tiempo es un pentagrama donde cada pasada del radar es una nota y los dos momentos que se comparan quedan unidos por una ligadura.

Quién la usa: jurados del Space Apps (la verán proyectada, en pocos minutos), estudiantes y personas curiosas por su territorio. Su trabajo principal: mostrar, con datos reales de NISAR, qué cambió entre dos fechas en un lugar, y explicar con honestidad qué significa y qué no.

## Principios

1. **El planeta es el escenario.** El mapa ocupa toda la ventana; la interfaz flota encima en pocos paneles. Nada de tablero con cajas.
2. **La audacia va en un solo sitio: la partitura.** Todo lo demás es sobrio y callado.
3. **El dato tiene color; la interfaz no.** Los únicos colores saturados son los de los datos (cambio, clases) y el dorado de la selección.
4. **Evidencia antes que conclusiones.** Toda etiqueta de cambio dice «posible». La procedencia y los límites están a un clic, nunca escondidos.
5. **Se lee desde el fondo de un salón.** Ningún texto por debajo de 13 px; el cuerpo, 15–16 px.

## Color

El radar ve de noche y a través de las nubes: la interfaz vive en la hora azul, no en negro. El acento es el dorado de la antena de malla de NISAR.

| token | valor | uso |
|---|---|---|
| `--noche` | `#0a1626` | fondo de la app y del espacio alrededor del globo |
| `--panel` | `#11233a` | paneles flotantes (opacos al 92 %, sin desenfoque de vidrio) |
| `--relieve` | `#18304d` | controles, filas activas |
| `--linea` | `#27405f` | bordes y líneas del pentagrama |
| `--papel` | `#f2efe6` | texto principal |
| `--bruma` | `#9db0c6` | texto secundario |
| `--oro` | `#e8b84a` | selección, nota activa, acción principal |
| `--baja` | `#4cc9f0` | disminución de retorno |
| `--sube` | `#ff6b5e` | aumento de retorno |

Los colores de clase llegan del backend (`stats.classes[].color`) y se usan tal cual en mapa y leyenda. Contraste mínimo AA sobre `--panel`. El color nunca es el único canal: cada clase lleva su nombre.

## Tipografía

Dos familias, autoalojadas con Fontsource (sin depender de Google Fonts en la demo):

- **Bodoni Moda** (variable, con cursiva): la voz de la partitura. Titulares, nombres de lugares y las «indicaciones de tempo» (frases cortas en cursiva, como *cada 12 días*). Titulares de 40–72 px, interlineado 1,05.
- **IBM Plex Sans** (400, 500, 600): interfaz y lectura. Cifras con `font-variant-numeric: tabular-nums`. Para datos densos (identificadores, coordenadas), **IBM Plex Sans Condensed**, no monoespaciada.

Escala: 13 / 15 / 17 / 22 / 30 / 44 / 64. Texto alineado a la izquierda. Líneas de menos de 70 caracteres.

Qué no hacer: etiquetas en mayúsculas con espaciado, «antetítulos» decorativos sobre cada encabezado, cadenas de metadatos unidas por puntos medios, flechas pegadas al texto de los botones, una sola palabra del titular en cursiva o en color, numerar lo que no sea una secuencia.

## Estructura

```
┌───────────────────────────────────────────────────────────────────────┐
│ compás      Historias   Explorar   En vivo            ES | EN  Método │
│ ┌─────────────────┐                              ┌──────────────────┐ │
│ │ Panel izquierdo │                              │ Panel de lectura │ │
│ │ historia o      │       GLOBO / MAPA           │ frase resumen    │ │
│ │ exploración     │       a toda la ventana      │ clases = leyenda │ │
│ │ (380 px)        │   cortina antes | después    │ sonda del punto  │ │
│ └─────────────────┘                              │ procedencia      │ │
│              [ capas: Antes Después Cambio … ]   └──────────────────┘ │
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │ PARTITURA  pentagrama, un compás cada 12 días, notas = pasadas    │ │
│ └───────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

- **Portada.** El globo gira despacio. A la izquierda, un titular grande en Bodoni y debajo el **programa**: las historias listadas como un programa de concierto (título a la izquierda, lugar a la derecha, línea de puntos entre ambos), no como tarjetas. Elegir una hace volar el globo hasta el lugar.
- **Historia.** Panel izquierdo con los pasos (aquí sí hay secuencia: el lugar, antes y después, lo que cambió, la danza). Cada paso mueve el mapa y cambia la capa.
- **Panel de lectura.** Empieza con una frase completa («Entre el 26 de junio y el 24 de octubre de 2026 cambió 1.840 km² de los 41.234 km² observados»), no con una cifra gigante. La lista de clases es a la vez la leyenda del mapa: color, nombre, km², barra proporcional. Debajo: sonda (al hacer clic en el mapa), cómo leerlo, procedencia, límites.
- **Celular.** El mapa arriba; paneles como hoja inferior deslizable; la partitura se desplaza en horizontal.

## La partitura

SVG. Pentagrama de cinco líneas a lo ancho del panel inferior.

- Eje horizontal: tiempo. Una barra de compás cada 12 días (el ciclo de NISAR), contada desde la primera pasada de la pila. Meses rotulados debajo.
- Cada pasada analizable es una **nota**. Su altura refleja el retorno HH en el punto sondeado cuando la serie está cargada; si no, va en la línea central.
- Pasada no analizable (colección beta): nota hueca y tenue; el texto emergente explica que solo tiene vista previa.
- Las notas «antes» y «después» son doradas, con plica y rótulo de fecha; una **ligadura** las une. La primera pulsación elige «antes», la segunda «después».
- «Ver la danza» reproduce los cuadros de la serie; un cursor recorre el pentagrama y la nota del cuadro actual se enciende.
- Teclado: flechas para moverse entre notas, Enter o Espacio para elegir. Cada nota es un botón con nombre accesible («24 de octubre de 2026, validada»).

## Movimiento

Un solo momento orquestado: al abrir una historia el globo vuela al lugar y la capa de cambio se revela. El resto del movimiento responde a acciones (cortina, reproducción, paneles). Sin entradas con desvanecido en cada sección. Con `prefers-reduced-motion`, el vuelo es un salto y la danza avanza por pasos manuales.

## Voz

Español claro, frases completas, sin jerga cuando hay palabra común: «retorno del radar» antes que «retrodispersión» en la primera mención; el término técnico aparece en Método. Los botones dicen lo que hacen («Comparar estas fechas», «Ver la danza»). Los errores explican qué pasó y qué hacer. Cada texto existe en español e inglés.

## Lentes: la misma señal, distinta lectura

El backend entrega siete clases físicas (por su `key`). Lo que significan depende del terreno: una caída del retorno cruzado es vegetación perdida en una selva y nieve mojada en un glaciar. Por eso el nombre visible de cada clase lo pone el **lente** activo, no el backend. Cada historia trae su lente en `lens`; en la exploración libre el lente por defecto es `general` y la persona puede cambiarlo.

| clave | general | agua | vegetacion | hielo |
|---|---|---|---|---|
| `agua_nueva` | Caída fuerte hasta superficie oscura | Posible agua abierta nueva | Posible agua abierta nueva | Posible agua de deshielo o nieve muy húmeda |
| `agua_retirada` | Subida fuerte desde superficie oscura | Posible retiro de agua | Posible retiro de agua | Posible recongelamiento o superficie que emergió |
| `veg_inundada` | Sube HH con HV estable | Posible vegetación inundada | Posible vegetación inundada | Sube HH con HV estable |
| `veg_perdida` | Cae el retorno cruzado (HV) | Posible pérdida de vegetación | Posible pérdida de vegetación, cosecha o quema | Posible nieve húmeda |
| `veg_aumento` | Sube el retorno cruzado (HV) | Posible aumento de vegetación | Posible crecimiento de vegetación o cultivo | Posible superficie más rugosa o descubierta |
| `aumento` | Aumento de retorno | Aumento de retorno | Aumento de retorno | Aumento de retorno |
| `disminucion` | Disminución de retorno | Disminución de retorno | Disminución de retorno | Disminución de retorno |

En inglés, en el mismo orden de columnas:

| key | general | agua | vegetacion | hielo |
|---|---|---|---|---|
| `agua_nueva` | Sharp drop to a dark surface | Possible new open water | Possible new open water | Possible meltwater or very wet snow |
| `agua_retirada` | Sharp rise from a dark surface | Possible water retreat | Possible water retreat | Possible refreeze or newly exposed surface |
| `veg_inundada` | HH up, HV steady | Possible flooded vegetation | Possible flooded vegetation | HH up, HV steady |
| `veg_perdida` | Cross-pol return (HV) down | Possible vegetation loss | Possible vegetation loss, harvest or burn | Possible wet snow |
| `veg_aumento` | Cross-pol return (HV) up | Possible vegetation gain | Possible vegetation or crop growth | Possible rougher or newly bare surface |
| `aumento` | Return up | Return up | Return up | Return up |
| `disminucion` | Return down | Return down | Return down | Return down |

Nombres de los lentes: General / General; Agua y humedales / Water and wetlands; Bosques y cultivos / Forests and crops; Hielo y nieve / Ice and snow. Las clases con 0 km² no se listan.

### Ajuste del lente de vegetación

En zonas agrícolas, hablar de agua confunde: una parcela oscura suele ser suelo liso, no una laguna. En el lente `vegetacion` estas tres claves se nombran así (sustituyen a las de la tabla):

| clave | español | inglés |
|---|---|---|
| `agua_nueva` | Posible superficie lisa o inundada nueva | Possible newly smooth or flooded surface |
| `agua_retirada` | Posible superficie que dejó de ser lisa o de estar inundada | Possible surface no longer smooth or flooded |
| `veg_inundada` | Sube HH con HV estable: posible riego o labranza | HH up, HV steady: possible irrigation or tillage |
