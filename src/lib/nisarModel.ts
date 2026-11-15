// NISAR dibujado a escala: una unidad del SVG es un metro. Es la vista frontal del satélite real
// (la misma de las láminas de NASA/JPL): el reflector de 12 m arriba, el brazo que baja hasta el
// cuerpo, y las dos alas solares a los costados del bus. El radar queda de punta, delante del bus.
// Sirve de respaldo donde no hay WebGL y mientras carga el modelo en 3D (ver nisar3d.ts).
// Las medidas son las publicadas; el ancho del bus y el fondo del aro son aproximados.

export const PARTS = ['reflector', 'boom', 'radar', 'solar', 'bus', 'antenna'] as const;
export type Part = (typeof PARTS)[number];

/** Medidas publicadas, en metros. */
export const SIZE = {
  reflector: 12,
  boom: 9,
  /** Largo del bus con la estructura del radar. */
  body: 5.5,
  solarLength: 5.5,
  solarWidth: 2.2,
  antenna: 0.7,
  person: 1.75,
} as const;

/** Caja del dibujo en metros: el origen (0, 0) es el centro del bus. */
export const BOX = { x: -8.5, y: -13.6, width: 17, height: 17 } as const;
/** Con cotas hace falta sitio alrededor para los rótulos y la persona de referencia. */
const BOX_DIMENSIONS = { x: -9.4, y: -14.6, width: 18.8, height: 19.4 } as const;

// Geometría (metros; x hacia la derecha, y hacia abajo)
const BUS = { half: 0.95, top: -1, bottom: 1 };
const RADAR = { radius: 0.82, cy: -0.18 };
const PANEL = SIZE.solarLength / 3;
const YOKE = 0.7;
const SOLAR_TOP = -SIZE.solarWidth / 2;
/** El aro visto de frente: dos óvalos (borde de arriba y borde de abajo) separados por su fondo. */
const DISH = { cy: -10, rx: SIZE.reflector / 2, ry: 0.68, depth: 1.75 };
/** El brazo sube inclinado hacia atrás: de frente se ve recto y algo más corto que sus 9 m. */
const BOOM: Array<[number, number]> = [
  [0.12, BUS.top - 0.28],
  [0.12, -5.2],
  [0.12, DISH.cy + 0.25],
];

export interface ModelLabels {
  reflector: string;
  boom: string;
  solar: string;
  person: string;
}

const n = (value: number) => Number(value.toFixed(3));

function solarArray(side: -1 | 1): string {
  const inner = side * (BUS.half + YOKE);
  const panels = [0, 1, 2]
    .map((index) => {
      const x = side === 1 ? inner + index * PANEL : inner - (index + 1) * PANEL;
      const cells = [1, 2, 3]
        .map((cell) => `<path class="detalle" d="M${n(x + (cell * PANEL) / 4)} ${n(SOLAR_TOP)}v${SIZE.solarWidth}"/>`)
        .join('');
      return (
        `<rect class="celda" x="${n(x)}" y="${n(SOLAR_TOP)}" width="${n(PANEL)}" height="${SIZE.solarWidth}"/>` +
        cells +
        `<path class="detalle" d="M${n(x)} 0h${n(PANEL)}"/>`
      );
    })
    .join('');
  return `<path d="M${n(inner)} -0.7L${side * BUS.half} 0L${n(inner)} 0.7"/>${panels}`;
}

function reflector(): string {
  const { cy, rx, ry, depth } = DISH;
  const top = cy - depth / 2;
  const bottom = cy + depth / 2;
  // Celosía del aro: un zigzag entre los dos bordes por la mitad que queda a la vista.
  const zigzag = Array.from({ length: 13 }, (_, index) => {
    const angle = Math.PI - (index * Math.PI) / 12;
    const y = index % 2 === 0 ? top : bottom;
    return `${index === 0 ? 'M' : 'L'}${n(rx * Math.cos(angle))} ${n(y + ry * Math.sin(angle))}`;
  }).join('');
  const posts = [-0.75, -0.4, 0, 0.4, 0.75]
    .map((share) => {
      const drop = ry * Math.sqrt(1 - share * share);
      return `<path class="detalle" d="M${n(rx * share)} ${n(top + drop)}V${n(bottom + drop)}"/>`;
    })
    .join('');
  const mesh = [0.35, 0.7]
    .map((share) => `<ellipse class="detalle" cx="0" cy="${n(bottom)}" rx="${n(rx * share)}" ry="${n(ry * share)}"/>`)
    .join('');
  return (
    `<ellipse class="aro" cx="0" cy="${n(top)}" rx="${rx}" ry="${ry}"/>` +
    `<ellipse class="malla" cx="0" cy="${n(bottom)}" rx="${rx}" ry="${ry}"/>` +
    mesh +
    posts +
    `<path class="detalle" d="${zigzag}"/>` +
    `<path d="M${-rx} ${n(top)}V${n(bottom)}M${rx} ${n(top)}V${n(bottom)}"/>`
  );
}

/** El radar de punta: un octágono delante del bus, con la franja de alimentadores arriba. */
function radar(): string {
  const { radius, cy } = RADAR;
  const corners = Array.from({ length: 8 }, (_, index) => {
    const angle = Math.PI / 8 + (index * Math.PI) / 4;
    return `${index === 0 ? 'M' : 'L'}${n(radius * Math.cos(angle))} ${n(cy + radius * Math.sin(angle))}`;
  }).join('');
  const flat = radius * Math.cos(Math.PI / 8);
  const half = radius * Math.sin(Math.PI / 8);
  return (
    `<path class="cuerpo" d="${corners}Z"/>` +
    `<rect class="alimentador" x="${n(-half)}" y="${n(cy - flat - 0.1)}" width="${n(half * 2)}" height="0.2"/>` +
    `<path class="detalle" d="M${n(-flat)} ${n(cy)}H${n(flat)}M0 ${n(cy - flat)}V${n(cy + flat)}"/>`
  );
}

function boom(): string {
  const path = BOOM.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join('');
  const joints = BOOM.map(([x, y]) => `<circle class="nudo" cx="${x}" cy="${y}" r="0.24"/>`).join('');
  return `<path class="brazo" d="${path}"/>${joints}`;
}

function bus(): string {
  return `<rect class="cuerpo" x="${-BUS.half}" y="${BUS.top}" width="${BUS.half * 2}" height="${BUS.bottom - BUS.top}"/>`;
}

function antenna(): string {
  const half = SIZE.antenna / 2;
  return (
    `<path d="M0.1 ${BUS.bottom}V${BUS.bottom + 0.3}"/>` +
    `<path class="cuerpo" d="M${n(0.1 - half)} ${BUS.bottom + 0.62}Q0.1 ${BUS.bottom + 0.02} ${n(0.1 + half)} ${BUS.bottom + 0.62}Z"/>`
  );
}

function dimension(x1: number, y1: number, x2: number, y2: number, text: string, tx: number, ty: number, anchor = 'middle'): string {
  // Línea de cota con un remate corto en cada extremo, perpendicular a la línea.
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const px = (-(y2 - y1) / length) * 0.3;
  const py = ((x2 - x1) / length) * 0.3;
  const tick = (x: number, y: number) => `M${n(x - px)} ${n(y - py)}L${n(x + px)} ${n(y + py)}`;
  return (
    `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}${tick(x1, y1)}${tick(x2, y2)}"/>` +
    `<text x="${n(tx)}" y="${n(ty)}" text-anchor="${anchor}">${text}</text>`
  );
}

function dimensions(labels: ModelLabels): string {
  const above = DISH.cy - DISH.depth / 2 - DISH.ry - 0.9;
  const solarY = SIZE.solarWidth / 2 + 0.75;
  const left = -(BUS.half + YOKE);
  const ground = BUS.bottom + 2.9;
  const personX = 4.6;
  const head = ground - SIZE.person + 0.14;
  const person =
    `<circle cx="${personX}" cy="${n(head)}" r="0.14"/>` +
    `<path d="M${personX} ${n(head + 0.14)}V${n(ground - 0.75)}M${personX} ${n(ground - 0.75)}L${personX - 0.24} ${ground}` +
    `M${personX} ${n(ground - 0.75)}L${personX + 0.24} ${ground}M${personX - 0.32} ${n(head + 0.75)}L${personX} ${n(head + 0.32)}L${personX + 0.32} ${n(head + 0.75)}"/>` +
    `<path class="suelo" d="M${personX - 1.2} ${ground}H${personX + 1.2}"/>` +
    `<text x="${personX + 0.55}" y="${n(ground - 0.6)}" text-anchor="start">${labels.person}</text>`;
  return (
    '<g class="cotas">' +
    dimension(-DISH.rx, above, DISH.rx, above, labels.reflector, 0, above - 0.5) +
    dimension(1.3, BOOM[0]![1], 1.3, BOOM[2]![1], labels.boom, 1.75, -5.4, 'start') +
    dimension(left - SIZE.solarLength, solarY, left, solarY, labels.solar, left - SIZE.solarLength / 2, solarY + 1.05) +
    person +
    '</g>'
  );
}

/**
 * SVG del modelo. Cada parte va en un grupo con `data-part`, para poder resaltarla desde CSS.
 * Con `labels` se añaden las cotas con las medidas reales y una persona de referencia.
 */
export function nisarSvg(labels?: ModelLabels): string {
  const box = labels ? BOX_DIMENSIONS : BOX;
  const part = (id: Part, body: string) => `<g data-part="${id}">${body}</g>`;
  return (
    `<svg class="nisar-modelo" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" aria-hidden="true" focusable="false">` +
    part('solar', solarArray(-1) + solarArray(1)) +
    part('antenna', antenna()) +
    part('bus', bus()) +
    part('boom', boom()) +
    part('radar', radar()) +
    part('reflector', reflector()) +
    (labels ? dimensions(labels) : '') +
    '</svg>'
  );
}

/** Metros que mide el dibujo sin cotas de lado a lado: con eso se pasa de metros a píxeles en el mapa. */
export const MODEL_SPAN_M = BOX.width;

/**
 * Tamaño del modelo en pantalla. A escala del mapa NISAR mide mucho menos de un píxel salvo con el
 * zoom al máximo: se dibuja ampliado hasta `minPx` y se devuelve cuántas veces, para decirlo.
 * `spanM` son los metros que abarca la imagen de lado a lado.
 */
export function modelSize(metersPerPixel: number, minPx: number, spanM: number = MODEL_SPAN_M): { px: number; magnification: number } {
  const real = metersPerPixel > 0 && Number.isFinite(metersPerPixel) ? spanM / metersPerPixel : 0;
  if (real >= minPx) return { px: real, magnification: 1 };
  return { px: minPx, magnification: real > 0 ? minPx / real : Infinity };
}

/** Redondea la ampliación a dos cifras significativas: «ampliado 98.000 veces», no «98.412,7». */
export function roundMagnification(value: number): number {
  if (!Number.isFinite(value) || value <= 1) return 1;
  const digits = Math.floor(Math.log10(value));
  const unit = 10 ** Math.max(digits - 1, 0);
  return Math.round(value / unit) * unit;
}
