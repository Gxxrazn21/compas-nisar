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

/** Rango visual y musical fijo: dB relativos de browse, nunca potencia calibrada. */
export const COMMON_DB_RANGE: PitchRange = { min: -16, max: 1 };

export function noteFrequency(db: number | null | undefined): number | null {
  return db == null || !Number.isFinite(db) ? null : stepFrequency(staffStep(db, COMMON_DB_RANGE));
}

export function observationGap(dates: string[], index: number): number | null {
  return index > 0 && dates[index] && dates[index - 1]
    ? daysBetween(dates[index - 1]!, dates[index]!) : null;
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
  if (db === null || db === undefined || !Number.isFinite(db) || !range || range.max - range.min < 0.01) return centerY;
  const t = Math.max(0, Math.min(1, (db - range.min) / (range.max - range.min)));
  return centerY + (0.5 - t) * space * 5;
}

/** Notas por debajo de la línea central llevan la plica hacia arriba, como en una partitura. */
export function stemUp(y: number, centerY: number): boolean {
  return y >= centerY;
}

/**
 * Grado de una nota respecto de la línea central del pentagrama: cada medio espacio es un grado
 * de la escala (positivo, más agudo). Es la misma altura que dibuja `noteY`, redondeada a la
 * línea o al espacio más cercano, así que lo que suena es lo que se ve.
 */
export function staffStep(db: number | null | undefined, range: PitchRange | null): number {
  const step = Math.round(-noteY(db, range, 0, 1) * 2);
  return step === 0 ? 0 : step;
}

/** Semitonos de cada grado de la escala de do mayor, contados desde do. */
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
/** La línea central en clave de sol es el si de la cuarta octava (nota MIDI 71): el séptimo grado. */
const CENTER_DEGREE = 6;
const C4_MIDI = 60;

/** Frecuencia en hercios del grado `step` leído en clave de sol (0 = línea central, si4). */
export function stepFrequency(step: number): number {
  const degree = CENTER_DEGREE + Math.round(step);
  const octave = Math.floor(degree / 7);
  const midi = C4_MIDI + octave * 12 + (MAJOR_SCALE[((degree % 7) + 7) % 7] as number);
  return 440 * 2 ** ((midi - 69) / 12);
}

export interface NoteLabelPlacement {
  x: number;
  anchor: 'start' | 'end';
}

export interface NoteLabelLayout {
  before: NoteLabelPlacement | null;
  after: NoteLabelPlacement | null;
}

function singleNoteLabel(
  x: number,
  labelWidth: number,
  prefer: 'start' | 'end',
  width: number,
  margin: number,
): NoteLabelPlacement {
  const minRight = Math.min(width - margin, margin + labelWidth);
  const maxLeft = Math.max(margin, width - margin - labelWidth);
  if (prefer === 'end') {
    const right = Math.min(width - margin, x + 6);
    if (right - labelWidth >= margin) return { x: right, anchor: 'end' };
    return { x: Math.min(maxLeft, Math.max(margin, x - 6)), anchor: 'start' };
  }
  const left = Math.max(margin, x - 6);
  if (left + labelWidth <= width - margin) return { x: left, anchor: 'start' };
  return { x: Math.max(minRight, Math.min(width - margin, x + 6)), anchor: 'end' };
}

/**
 * Posiciona los rótulos «antes» y «después» bajo el pentagrama sin que salgan del lienzo
 * ni se superpongan entre sí, incluso cuando dos notas adyacentes caen cerca de un borde.
 */
export function noteLabelLayout(
  xBefore: number | null,
  xAfter: number | null,
  width: number,
  beforeWidth = 136,
  afterWidth = 152,
  gap = 18,
  margin = 10,
): NoteLabelLayout {
  if (xBefore === null && xAfter === null) return { before: null, after: null };
  if (xBefore !== null && xAfter === null) {
    return { before: singleNoteLabel(xBefore, beforeWidth, 'end', width, margin), after: null };
  }
  if (xBefore === null && xAfter !== null) {
    return { before: null, after: singleNoteLabel(xAfter, afterWidth, 'start', width, margin) };
  }

  const bX = xBefore as number;
  const aX = xAfter as number;
  const swapped = bX > aX;
  const leftNoteX = swapped ? aX : bX;
  const rightNoteX = swapped ? bX : aX;
  const leftW = swapped ? afterWidth : beforeWidth;
  const rightW = swapped ? beforeWidth : afterWidth;

  const leftPinnedStart = leftNoteX + 6 - leftW < margin;
  const rightPinnedEnd = rightNoteX - 6 + rightW > width - margin;

  let leftStart: number;
  let leftEnd: number;
  if (leftPinnedStart) {
    leftStart = Math.max(margin, Math.min(width - margin - leftW, leftNoteX - 6));
    leftEnd = leftStart + leftW;
  } else {
    leftEnd = Math.min(width - margin, Math.max(margin + leftW, leftNoteX + 6));
    leftStart = leftEnd - leftW;
  }

  let rightStart: number;
  let rightEnd: number;
  if (rightPinnedEnd) {
    rightEnd = Math.min(width - margin, Math.max(margin + rightW, rightNoteX + 6));
    rightStart = rightEnd - rightW;
  } else {
    rightStart = Math.max(margin, Math.min(width - margin - rightW, rightNoteX - 6));
    rightEnd = rightStart + rightW;
  }

  if (leftEnd + gap > rightStart) {
    const overlap = leftEnd + gap - rightStart;
    if (rightPinnedEnd && !leftPinnedStart) {
      const shiftL = Math.min(overlap, Math.max(0, leftStart - margin));
      leftStart -= shiftL;
      leftEnd -= shiftL;
      const rem = leftEnd + gap - rightStart;
      if (rem > 0) {
        const shiftR = Math.min(rem, Math.max(0, width - margin - rightEnd));
        rightStart += shiftR;
        rightEnd += shiftR;
      }
    } else if (leftPinnedStart && !rightPinnedEnd) {
      const shiftR = Math.min(overlap, Math.max(0, width - margin - rightEnd));
      rightStart += shiftR;
      rightEnd += shiftR;
      const rem = leftEnd + gap - rightStart;
      if (rem > 0) {
        const shiftL = Math.min(rem, Math.max(0, leftStart - margin));
        leftStart -= shiftL;
        leftEnd -= shiftL;
      }
    } else {
      let shiftL = Math.min(overlap / 2, Math.max(0, leftStart - margin));
      let shiftR = Math.min(overlap - shiftL, Math.max(0, width - margin - rightEnd));
      if (shiftL + shiftR < overlap) {
        shiftL = Math.min(overlap - shiftR, Math.max(0, leftStart - margin));
      }
      leftStart -= shiftL;
      leftEnd -= shiftL;
      rightStart += shiftR;
      rightEnd += shiftR;
    }
  }

  const leftPlacement: NoteLabelPlacement = leftPinnedStart
    ? { x: leftStart, anchor: 'start' }
    : { x: leftEnd, anchor: 'end' };
  const rightPlacement: NoteLabelPlacement = rightPinnedEnd
    ? { x: rightEnd, anchor: 'end' }
    : { x: rightStart, anchor: 'start' };

  return swapped
    ? { before: rightPlacement, after: leftPlacement }
    : { before: leftPlacement, after: rightPlacement };
}
