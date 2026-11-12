import { describe, expect, it } from 'vitest';
import {
  CYCLE_DAYS,
  barDays,
  makeAxis,
  monthTicks,
  noteY,
  pitchRange,
  scoreWidth,
  stemUp,
  xOfDate,
} from './score';

describe('eje de la partitura', () => {
  const axis = makeAxis('2026-06-26', '2026-10-24', 1000);

  it('la primera pasada cae en el margen izquierdo y la última en el derecho', () => {
    expect(xOfDate('2026-06-26', axis)).toBe(axis.left);
    expect(xOfDate('2026-10-24', axis)).toBe(axis.width - axis.right);
  });
  it('la posición crece de forma lineal con los días', () => {
    const mitad = xOfDate('2026-08-25', axis);
    expect(mitad).toBeCloseTo((axis.left + axis.width - axis.right) / 2, 5);
  });
  it('no comprime los compases por debajo del mínimo', () => {
    expect(scoreWidth(360, 400)).toBeGreaterThan(400);
    expect(scoreWidth(30, 1200)).toBe(1200);
  });
});

describe('barras de compás', () => {
  it('hay una cada 12 días', () => {
    const bars = barDays(120);
    for (let i = 1; i < bars.length; i += 1) {
      expect((bars[i] as number) - (bars[i - 1] as number)).toBe(CYCLE_DAYS);
    }
  });
  it('cubren todo el rango y dejan las pasadas a mitad de compás', () => {
    const bars = barDays(120);
    expect(bars[0]).toBeLessThan(0);
    expect(bars[bars.length - 1]).toBeGreaterThan(120);
    expect(bars.some((day) => day === 0 || day === 12)).toBe(false);
  });
});

describe('rótulos de mes', () => {
  it('marca el día uno de cada mes dentro del rango', () => {
    const ticks = monthTicks('2026-06-26', 120);
    expect(ticks.map((tick) => tick.date)).toEqual([
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
    ]);
    expect(ticks[0]?.day).toBe(5);
  });
  it('cruza el cambio de año', () => {
    const ticks = monthTicks('2025-12-04', 60);
    expect(ticks.map((tick) => tick.date)).toEqual(['2026-01-01', '2026-02-01']);
  });
});

describe('altura de las notas', () => {
  const range = pitchRange([-12, null, -4, -8]);
  it('el rango ignora los valores nulos', () => {
    expect(range).toEqual({ min: -12, max: -4 });
  });
  it('más retorno es más agudo (más arriba)', () => {
    const alta = noteY(-4, range, 60, 10);
    const baja = noteY(-12, range, 60, 10);
    expect(alta).toBeLessThan(baja);
    expect(alta).toBe(60 - 25);
    expect(baja).toBe(60 + 25);
  });
  it('sin dato o sin rango va en la línea central', () => {
    expect(noteY(null, range, 60, 10)).toBe(60);
    expect(noteY(-8, null, 60, 10)).toBe(60);
    expect(noteY(-8, { min: -8, max: -8 }, 60, 10)).toBe(60);
  });
  it('la plica sube en las notas bajas y baja en las altas', () => {
    expect(stemUp(80, 60)).toBe(true);
    expect(stemUp(40, 60)).toBe(false);
  });
});
