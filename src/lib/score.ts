// Geometría de la partitura: de fechas y decibelios a coordenadas del SVG.
// Todo es función pura para poder probarla sin navegador.
import { daysBetween } from './format';

/** Ciclo de repetición de NISAR: un compás. */
export const CYCLE_DAYS = 12;
export const AXIS_LEFT = 68;
export const AXIS_RIGHT = 28;

export interface Axis {
  /** Fecha de la primera pasada (AAAA-MM-DD). */
  start: string;
  /** Días entre la primera y la última pasada. */
  days: number;
  left: number;
  right: number;
  width: number;
}

export function makeAxis(
  start: string,
  end: string,
  width: number,
  left = AXIS_LEFT,
  right = AXIS_RIGHT,
): Axis {
  return { start, days: Math.max(1, daysBetween(start, end)), left, right, width };
}

/** Ancho del SVG: llena el contenedor, pero no comprime los compases por debajo de un mínimo. */
export function scoreWidth(days: number, container: number, minPerDay = 3): number {
  return Math.max(container, Math.ceil(days * minPerDay) + AXIS_LEFT + AXIS_RIGHT);
}

/** Posición horizontal de un día contado desde la primera pasada. */
export function xOfDay(day: number, axis: Axis): number {
  const span = axis.width - axis.left - axis.right;
  return axis.left + (day / axis.days) * span;
}

/** Posición horizontal de una fecha. */
export function xOfDate(date: string, axis: Axis): number {
  return xOfDay(daysBetween(axis.start, date), axis);
}

/**
 * Días (desde la primera pasada) donde cae cada barra de compás, una cada 12 días.
 * Las pasadas ocurren cada ciclo, así que cada nota ocupa su compás: las barras caen a
 * medio ciclo, 6 días antes de cada pasada esperada, para que ninguna nota se monte
 * sobre una barra.
 */
export function barDays(totalDays: number): number[] {
  const bars: number[] = [];
  for (let day = -CYCLE_DAYS / 2; day <= totalDays + CYCLE_DAYS / 2; day += CYCLE_DAYS) {
    bars.push(day);
  }
  return bars;
}

export interface MonthTick {
  date: string;
  day: number;
}

/** Primer día de cada mes dentro del rango, para rotular el eje. */
export function monthTicks(start: string, totalDays: number): MonthTick[] {
  const ticks: MonthTick[] = [];
  const origin = new Date(`${start}T00:00:00Z`);
  let year = origin.getUTCFullYear();
  let month = origin.getUTCMonth(); // 0 a 11; el primer mes marcado es el siguiente
  for (let guard = 0; guard < 240; guard += 1) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    const date = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const day = daysBetween(start, date);
    if (day > totalDays) break;
    ticks.push({ date, day });
  }
  return ticks;
}

export interface PitchRange {
  min: number;
  max: number;
}

export function pitchRange(values: Array<number | null>): PitchRange | null {
  const real = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!real.length) return null;
  return { min: Math.min(...real), max: Math.max(...real) };
}

/**
 * Altura de una nota: más retorno, más agudo (más arriba). El rango completo recorre
 * cinco espacios del pentagrama, centrado en la línea del medio. Sin dato o sin rango,
 * la nota va en la línea central.
 */
export function noteY(
  db: number | null | undefined,
  range: PitchRange | null,
  centerY: number,
  space: number,
): number {
  if (db === null || db === undefined || !range || range.max - range.min < 0.01) return centerY;
  const t = (db - range.min) / (range.max - range.min);
  return centerY + (0.5 - t) * space * 5;
}

/** Notas por debajo de la línea central llevan la plica hacia arriba, como en una partitura. */
export function stemUp(y: number, centerY: number): boolean {
  return y >= centerY;
}
