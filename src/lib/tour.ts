// Recorrido guiado: la lista de pasos y lo que cada uno pide a la aplicación. Aquí solo hay datos
// y funciones puras; quien mueve el mapa y los paneles es `useTourDirector`.
import type { Key } from '../i18n/es';
import type { MapLayer } from '../types';
import type { ContextId } from './context';
import type { Part } from './nisarModel';

export const CHAPTERS = ['satellite', 'radar', 'data', 'app'] as const;
export type Chapter = (typeof CHAPTERS)[number];

/** Vista de la aplicación sobre la que ocurre el paso. */
export type Scene = 'satellite' | 'cover' | 'story' | 'explore' | 'live';

/** Esquemas del capítulo del radar (ver RadarDiagram.tsx). */
export type Diagram = 'orbit' | 'look' | 'echo' | 'surfaces' | 'polarization' | 'repeat';

export interface TourStep {
  id: string;
  chapter: Chapter;
  scene: Scene;
  /** Zoom de globo con el que se sigue a NISAR en los pasos del satélite. */
  zoom?: number;
  /** Lo que acompaña al texto: el modelo en 3D, el modelo con sus medidas o un esquema. */
  figure?: 'model' | 'dimensions' | Diagram;
  /** Parte del satélite que se resalta en el modelo. */
  part?: Part;
  /** Selector CSS de lo que el paso señala en pantalla. */
  target?: string;
  /** Capa del mapa que el paso enciende dentro de una historia. */
  layer?: MapLayer;
  /** Capa de contexto de la NASA que el paso enciende (las demás se apagan). */
  context?: ContextId;
  /** El paso mide un punto del mapa o pone a sonar la danza. */
  probe?: boolean;
  dance?: boolean;
}

const MODEL = '.satelite-modelo';
const CLOSE = 3.4;
const BAR = '.barra-mapa .capas';
/** Grupo de la barra de capas (1: imagen, 2: cambio, 3: lectura) y, dentro, un botón suelto. */
const group = (index: number) => `${BAR} .capas-grupo:nth-of-type(${index})`;
const button = (groupIndex: number, index: number) => `${group(groupIndex)} .capa:nth-of-type(${index})`;

export const TOUR: TourStep[] = [
  // El satélite, pieza por pieza
  { id: 'now', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', target: MODEL },
  { id: 'scale', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'dimensions', target: MODEL },
  { id: 'reflector', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'reflector' },
  { id: 'boom', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'boom' },
  { id: 'radar', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'radar' },
  { id: 'solar', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'solar' },
  { id: 'bus', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'bus' },
  { id: 'antenna', chapter: 'satellite', scene: 'satellite', zoom: CLOSE, figure: 'model', part: 'antenna' },
  // Cómo funciona el radar
  { id: 'orbit', chapter: 'radar', scene: 'satellite', zoom: 1.7, figure: 'orbit' },
  { id: 'swath', chapter: 'radar', scene: 'satellite', zoom: 5, figure: 'look' },
  { id: 'echo', chapter: 'radar', scene: 'satellite', zoom: 5, figure: 'echo' },
  { id: 'surfaces', chapter: 'radar', scene: 'satellite', zoom: 5, figure: 'surfaces' },
  { id: 'polarization', chapter: 'radar', scene: 'satellite', zoom: 5, figure: 'polarization' },
  { id: 'repeat', chapter: 'radar', scene: 'satellite', zoom: 1.7, figure: 'repeat' },
  // Leer los datos, sobre una historia real
  { id: 'story', chapter: 'data', scene: 'story', target: '.panel-izq.historia' },
  { id: 'images', chapter: 'data', scene: 'story', layer: 'after', target: group(1) },
  { id: 'swipe', chapter: 'data', scene: 'story', layer: 'swipe', target: '.cortina-asa' },
  { id: 'hh', chapter: 'data', scene: 'story', layer: 'change_hh', target: button(2, 1) },
  { id: 'hv', chapter: 'data', scene: 'story', layer: 'change_hv', target: button(2, 2) },
  { id: 'classes', chapter: 'data', scene: 'story', layer: 'classes', target: button(3, 1) },
  { id: 'composite', chapter: 'data', scene: 'story', layer: 'composite', target: button(3, 2) },
  { id: 'reading', chapter: 'data', scene: 'story', layer: 'change_hh', target: '.panel-der' },
  { id: 'probe', chapter: 'data', scene: 'story', layer: 'change_hh', probe: true, target: '.sonda-marca' },
  { id: 'ctxWater', chapter: 'data', scene: 'story', layer: 'change_hh', context: 'agua', target: '.contexto' },
  { id: 'ctxLand', chapter: 'data', scene: 'story', layer: 'change_hh', context: 'suelo', target: '.contexto' },
  { id: 'ctxPeople', chapter: 'data', scene: 'story', layer: 'change_hh', context: 'poblacion', target: '.contexto' },
  // Usar la aplicación
  { id: 'score', chapter: 'app', scene: 'story', layer: 'change_hh', target: '.partitura' },
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

const MIN_MS = 9000;
const MAX_MS = 22000;
/** Lectura tranquila (unas diecinueve letras por segundo) más un respiro para mirar el mapa o el esquema. */
const MS_PER_CHARACTER = 52;
const LOOK_MS = 3000;

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

/** Duración total del recorrido en minutos, para anunciarla sin mentir. */
export function totalMinutes(durationOf: (step: TourStep) => number, steps: TourStep[] = TOUR): number {
  return steps.slice(0, -1).reduce((sum, step) => sum + durationOf(step), 0) / 60_000;
}
