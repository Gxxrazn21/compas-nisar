// NISAR dibujado a escala: una unidad del SVG es un metro. Las medidas son las que publican
// NASA/JPL (antena de 12 m, brazo de 9 m, cuerpo de 5,5 m, dos paneles solares de 5,5 × 2,2 m).
// La disposición es un alzado esquemático: guarda las proporciones, no la actitud exacta en vuelo.
// El ancho del cuerpo y el fondo del aro de la antena no están publicados: son aproximados.

export const PARTS = ['reflector', 'boom', 'radar', 'solar', 'bus', 'antenna'] as const;
export type Part = (typeof PARTS)[number];

/** Medidas publicadas, en metros. */
export const SIZE = {
  reflector: 12,
  boom: 9,
  body: 5.5,
  solarLength: 5.5,
  solarWidth: 2.2,
  antenna: 0.7,
  person: 1.75,
} as const;

/** Caja del dibujo en metros: el origen (0, 0) es el centro del cuerpo, donde el bus se une al radar. */
export const BOX = { x: -8.5, y: -13.6, width: 17, height: 17 } as const;
/** Con cotas hace falta sitio debajo para la persona de referencia y los rótulos. */
const BOX_DIMENSIONS = { x: -9.4, y: -14.9, width: 18.8, height: 20.6 } as const;

// Geometría (metros; x hacia la derecha, y hacia abajo)
const BUS = { half: 1, top: 0, bottom: 2.3 };
const RADAR = { half: 1.2, top: -3.2, bottom: 0, chamfer: 0.45 };
const PANEL = SIZE.solarLength / 3;
const YOKE = 0.4;
const SOLAR_TOP = 0.05;
const DISH = { cx: -1.6, cy: -9.6, tilt: -14, rx: SIZE.reflector / 2, ry: 1.7, depth: 1.3 };
const BOOM: Array<[number, number]> = [
  [0.95, RADAR.top],
  [3.6, -6.4],
  [4.22, -11.05],
];

export interface ModelLabels {
  reflector: string;
  boom: string;
  body: string;
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
        .map((cell) => `<path class="detalle" d="M${n(x + (cell * PANEL) / 4)} ${SOLAR_TOP}v${SIZE.solarWidth}"/>`)
        .join('');
      return (
        `<rect class="celda" x="${n(x)}" y="${SOLAR_TOP}" width="${n(PANEL)}" height="${SIZE.solarWidth}"/>` +
        cells +
        `<path class="detalle" d="M${n(x)} ${n(SOLAR_TOP + SIZE.solarWidth / 2)}h${n(PANEL)}"/>`
      );
    })
    .join('');
  const mid = SOLAR_TOP + SIZE.solarWidth / 2;
  return `<path d="M${side * BUS.half} ${mid - 0.5}L${n(inner)} ${mid}L${side * BUS.half} ${mid + 0.5}"/>${panels}`;
}

function reflector(): string {
  const { rx, ry, depth } = DISH;
  const back = -depth / 2;
  const front = depth / 2;
  // Celosía del aro: un zigzag entre los dos bordes por la mitad que queda a la vista.
  const zigzag = Array.from({ length: 13 }, (_, index) => {
    const angle = Math.PI - (index * Math.PI) / 12;
    const y = index % 2 === 0 ? back : front;
    return `${index === 0 ? 'M' : 'L'}${n(rx * Math.cos(angle))} ${n(y + ry * Math.sin(angle))}`;
  }).join('');
  const mesh = [0.35, 0.7]
    .map((share) => `<ellipse class="detalle" cx="0" cy="${front}" rx="${n(rx * share)}" ry="${n(ry * share)}"/>`)
    .join('');
  const ribs = [-0.5, 0, 0.5]
    .map((share) => `<path class="detalle" d="M${n(rx * share)} ${n(front - ry * Math.sqrt(1 - share * share))}V${n(front + ry * Math.sqrt(1 - share * share))}"/>`)
    .join('');
  return (
    `<g transform="translate(${DISH.cx} ${DISH.cy}) rotate(${DISH.tilt})">` +
    `<ellipse class="aro" cx="0" cy="${back}" rx="${rx}" ry="${ry}"/>` +
    `<ellipse class="malla" cx="0" cy="${front}" rx="${rx}" ry="${ry}"/>` +
    mesh +
    ribs +
    `<path class="detalle" d="${zigzag}"/>` +
    `<path d="M${-rx} ${back}V${front}M${rx} ${back}V${front}"/>` +
    '</g>'
  );
}

function radar(): string {
  const { half, top, bottom, chamfer } = RADAR;
  const body =
    `M${-half + chamfer} ${top}H${half - chamfer}L${half} ${top + chamfer}V${bottom - chamfer}` +
    `L${half - chamfer} ${bottom}H${-half + chamfer}L${-half} ${bottom - chamfer}V${top + chamfer}Z`;
  // Alimentador: la placa que mira hacia la antena, con una fila de la banda L y otra de la banda S.
  const feed =
    `<g transform="translate(-0.25 ${top - 0.42}) rotate(-12)">` +
    '<rect class="alimentador" x="-1.05" y="-0.24" width="2.1" height="0.48"/>' +
    '<path class="detalle" d="M-1.05 0h2.1M-0.53 -0.24v0.48M0 -0.24v0.48M0.53 -0.24v0.48"/>' +
    '</g>';
  return (
    `<path class="cuerpo" d="${body}"/>` +
    `<path class="detalle" d="M${-half} ${top + 1.1}H${half}M${-half} ${top + 2.1}H${half}"/>` +
    `<path d="M-0.9 ${top}L-0.75 ${top - 0.3}M0.35 ${top}L0.4 ${top - 0.42}"/>` +
    feed
  );
}

function boom(): string {
  const path = BOOM.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join('');
  const joints = BOOM.map(([x, y]) => `<circle class="nudo" cx="${x}" cy="${y}" r="0.24"/>`).join('');
  return `<path class="brazo" d="${path}"/>${joints}`;
}

function bus(): string {
  return (
    `<rect class="cuerpo" x="${-BUS.half}" y="${BUS.top}" width="${BUS.half * 2}" height="${BUS.bottom - BUS.top}"/>` +
    `<path class="detalle" d="M${-BUS.half} 0.75H${BUS.half}M${-BUS.half} 1.55H${BUS.half}M0 0.75V1.55"/>`
  );
}

function antenna(): string {
  const half = SIZE.antenna / 2;
  return (
    `<path d="M0.45 ${BUS.bottom}V${BUS.bottom + 0.28}"/>` +
    `<path class="cuerpo" d="M${n(0.45 - half)} ${BUS.bottom + 0.28}Q0.45 ${BUS.bottom + 0.95} ${n(0.45 + half)} ${BUS.bottom + 0.28}Z"/>`
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
  const tilt = (DISH.tilt * Math.PI) / 180;
  // La cota de la antena corre paralela a ella, por encima del aro.
  const lift = DISH.ry + DISH.depth / 2 + 0.9;
  const end = (sign: number): [number, number] => [
    DISH.cx + sign * DISH.rx * Math.cos(tilt) + lift * Math.sin(tilt),
    DISH.cy + sign * DISH.rx * Math.sin(tilt) - lift * Math.cos(tilt),
  ];
  const [ax, ay] = end(-1);
  const [bx, by] = end(1);
  const solarY = SOLAR_TOP + SIZE.solarWidth + 0.75;
  const left = -(BUS.half + YOKE);
  const ground = BUS.bottom + 3.1;
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
    dimension(ax, ay, bx, by, labels.reflector, (ax + bx) / 2 - 0.25, (ay + by) / 2 - 0.55) +
    dimension(BOOM[0]![0] + 1.5, BOOM[0]![1] - 0.2, BOOM[2]![0] + 1.4, BOOM[2]![1] + 0.3, labels.boom, 6.1, -6.6, 'start') +
    dimension(-2.2, RADAR.top, -2.2, BUS.bottom, labels.body, -2.55, -1.6, 'end') +
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
 */
export function modelSize(metersPerPixel: number, minPx: number): { px: number; magnification: number } {
  const real = metersPerPixel > 0 && Number.isFinite(metersPerPixel) ? MODEL_SPAN_M / metersPerPixel : 0;
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
