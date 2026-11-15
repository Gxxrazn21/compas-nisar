import { describe, expect, it } from 'vitest';
import { BOX, MODEL_SPAN_M, PARTS, SIZE, modelSize, nisarSvg, roundMagnification } from './nisarModel';

describe('modelo a escala de NISAR', () => {
  it('dibuja todas las partes, cada una en su grupo', () => {
    const svg = nisarSvg();
    for (const part of PARTS) {
      expect(svg.split(`data-part="${part}"`).length - 1, part).toBe(1);
    }
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('class="cotas"');
  });

  it('guarda las medidas publicadas: la antena mide 12 m y cada panel solar 5,5 × 2,2 m', () => {
    const svg = nisarSvg();
    expect(svg).toContain(`rx="${SIZE.reflector / 2}"`);
    const cells = [...svg.matchAll(/class="celda" x="([-\d.]+)" y="[-\d.]+" width="([-\d.]+)" height="([-\d.]+)"/g)];
    expect(cells).toHaveLength(6);
    const total = cells.reduce((sum, cell) => sum + Number(cell[2]), 0);
    expect(total).toBeCloseTo(2 * SIZE.solarLength, 2);
    expect(Number(cells[0]![3])).toBe(SIZE.solarWidth);
  });

  it('el brazo, que sube inclinado, se ve de frente algo más corto que sus 9 m', () => {
    const path = /class="brazo" d="M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)"/.exec(nisarSvg())!;
    const [x0, y0, x1, y1, x2, y2] = path.slice(1).map(Number) as [number, number, number, number, number, number];
    const length = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1);
    expect(length).toBeGreaterThan(SIZE.boom - 1);
    expect(length).toBeLessThanOrEqual(SIZE.boom);
  });

  it('con rótulos añade las cotas y la persona de referencia', () => {
    const svg = nisarSvg({ reflector: '12 m', boom: '9 m', solar: '5,5 m', person: '1,75 m' });
    expect(svg).toContain('class="cotas"');
    expect(svg).toContain('>12 m<');
    expect(svg).toContain('>1,75 m<');
  });

  it('en el mapa se amplía hasta un tamaño visible y dice cuántas veces', () => {
    expect(MODEL_SPAN_M).toBe(BOX.width);
    // Globo completo: unos 20 km por píxel.
    const far = modelSize(20_000, 88);
    expect(far.px).toBe(88);
    expect(far.magnification).toBeCloseTo((88 * 20_000) / 17, 0);
    // Muy cerca: 10 cm por píxel, el modelo ya mide 170 px y va a tamaño real.
    expect(modelSize(0.1, 88)).toEqual({ px: 170, magnification: 1 });
    expect(modelSize(0, 88).px).toBe(88);
  });

  it('redondea la ampliación a dos cifras', () => {
    expect(roundMagnification(103_529)).toBe(100_000);
    expect(roundMagnification(98_412.7)).toBe(98_000);
    expect(roundMagnification(14.4)).toBe(14);
    expect(roundMagnification(0.5)).toBe(1);
  });
});
