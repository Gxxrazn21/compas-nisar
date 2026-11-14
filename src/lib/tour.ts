// Recorrido guiado: la lista de pasos y lo que cada uno pide a la aplicación. Aquí solo hay datos
// y funciones puras; quien mueve el mapa y los paneles es `useTourDirector`.
import type { Key } from '../i18n/es';
import type { MapLayer } from '../types';
import type { Part } from './nisarModel';

export const CHAPTERS = ['satellite', 'observe', 'app'] as const;
export type Chapter = (typeof CHAPTERS)[number];

/** Vista de la aplicación sobre la que ocurre el paso. */
export type Scene = 'satellite' | 'cover' | 'story' | 'explore' | 'live';

export interface TourStep {
  id: string;
  chapter: Chapter;
  scene: Scene;
  /** Zoom de globo con el que se sigue a NISAR en los pasos del satélite. */
  zoom?: number;
  /** El paso muestra el modelo a escala: solo, o con las cotas de sus medidas. */
  figure?: 'model' | 'dimensions';
  /** Parte del satélite que se resalta en el modelo. */
  part?: Part;
  /** Selector CSS de lo que el paso señala en pantalla. */
  target?: string;
  /** Capa del mapa que el paso enciende dentro de una historia. */
  layer?: MapLayer;
  /** El paso mide un punto del mapa o pone a sonar la danza. */
  probe?: boolean;
  dance?: boolean;
}

const MODEL = '.satelite-modelo';
const CLOSE = 3.4;

export const TOUR: TourStep[] = [
  { id: 'now', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, target: MODEL },
  { id: 'scale', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'dimensions', target: MODEL },
  { id: 'reflector', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'reflector' },
  { id: 'boom', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'boom' },
  { id: 'radar', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'radar' },
  { id: 'solar', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'solar' },
  { id: 'bus', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'bus' },
  { id: 'antenna', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'antenna' },
  { id: 'orbit', chapter: 'observe', scene: 'satellite', zoom: 1.7 },
  { id: 'swath', chapter: 'observe', scene: 'satellite', zoom: 5 },
  { id: 'echo', chapter: 'observe', scene: 'satellite', zoom: 5 },
  { id: 'stories', chapter: 'app', scene: 'cover', target: '.programa' },
  { id: 'story', chapter: 'app', scene: 'story', target: '.panel-izq.historia' },
  { id: 'layers', chapter: 'app', scene: 'story', layer: 'swipe', target: '.barra-mapa' },
  { id: 'reading', chapter: 'app', scene: 'story', layer: 'change_hh', target: '.panel-der' },
  { id: 'probe', chapter: 'app', scene: 'story', layer: 'change_hh', probe: true, target: '.sonda-marca' },
  { id: 'score', chapter: 'app', scene: 'story', target: '.partitura' },
  { id: 'dance', chapter: 'app', scene: 'story', dance: true, target: '.partitura' },
  { id: 'explore', chapter: 'app', scene: 'explore', target: '.panel-izq' },
  { id: 'live', chapter: 'app', scene: 'live', target: '.panel-izq' },
  { id: 'end', chapter: 'app', scene: 'cover' },
];

export const titleKey = (step: TourStep) => `tour.${step.id}.title` as Key;
export const textKey = (step: TourStep) => `tour.${step.id}.text` as Key;

/** Índice del primer paso de un capítulo. */
export function chapterStart(chapter: Chapter, steps: TourStep[] = TOUR): number {
  return Math.max(0, steps.findIndex((step) => step.chapter === chapter));
}

const MIN_MS = 8000;
const MAX_MS = 19000;
/** Lectura pausada (unas quince letras por segundo) más un respiro para mirar el mapa. */
const MS_PER_CHARACTER = 62;
const LOOK_MS = 3200;

/** Cuánto se queda un paso en pantalla antes de avanzar solo, según lo largo de su texto. */
export function stepDuration(text: string, extraMs = 0): number {
  return Math.min(MAX_MS, Math.max(MIN_MS, text.length * MS_PER_CHARACTER + LOOK_MS)) + extraMs;
}

/** La danza necesita cargar y sonar entera: ese paso se queda un poco más. */
export const DANCE_EXTRA_MS = 7000;

/** Paso al que se llega desde `index` moviéndose `delta`, sin salirse del recorrido. */
export function clampStep(index: number, delta: number, total: number = TOUR.length): number {
  return Math.max(0, Math.min(total - 1, index + delta));
}
