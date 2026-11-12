// Estado esencial en el hash de la URL: abrir una vista concreta y reproducir capturas.
// Cubre historias, exploración libre (punto, pila, fechas, lente, área, capa) y En vivo.
import type { Bounds, Lang, LonLat, MapLayer, ZoomWindow } from '../types';
import { parseContext, parseDays, stringifyContext } from './context';
import type { ContextLayers } from './context';

export type Mode = 'stories' | 'explore' | 'live';

export interface HashState {
  /** Sección principal. Ausente en enlaces antiguos: se deduce de `story` y `stack`. */
  mode: Mode | null;
  story: string | null;
  stack: string | null;
  before: string | null;
  after: string | null;
  layer: MapLayer | null;
  step: number | null;
  lang: Lang | null;
  /** Punto elegido en Explorar. */
  point: LonLat | null;
  /** Lente de lectura de la exploración. */
  lens: string | null;
  /** Área de análisis (cuadro recortado) de la exploración. */
  aoi: Bounds | null;
  /** Ventana de la lupa calibrada, si estaba abierta. */
  lupa: ZoomWindow | null;
  /** Mapa base: satélite (por defecto) u óptico del día. */
  basemap: 'sat' | 'optico';
  /** Índice del interferograma elegido. */
  pair: number | null;
  /** Capas de contexto de NASA GIBS encendidas, con su opacidad. */
  context: ContextLayers;
  /** Días de desfase de la capa de Sentinel-1 respecto de la fecha «después». */
  contextDays: number;
  /** Para depuración y capturas: `mercator` evita el globo en navegadores sin WebGL potente. */
  proj: 'globe' | 'mercator';
}

const LAYERS: MapLayer[] = [
  'before',
  'after',
  'swipe',
  'change_hh',
  'change_hv',
  'classes',
  'composite',
  'dance',
];
const MODES: Record<string, Mode> = { h: 'stories', e: 'explore', v: 'live' };
const MODE_CODE: Record<Mode, string> = { stories: 'h', explore: 'e', live: 'v' };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[\w.-]{1,64}$/;

function clean(value: string | null, pattern: RegExp): string | null {
  return value && pattern.test(value) ? value : null;
}

function numbers(value: string | null, count: number): number[] | null {
  if (!value) return null;
  const parts = value.split(',').map((part) => Number(part));
  return parts.length === count && parts.every((part) => Number.isFinite(part)) ? parts : null;
}

function point(value: string | null): LonLat | null {
  const parts = numbers(value, 2);
  if (!parts) return null;
  const [lon, lat] = parts as [number, number];
  return Math.abs(lon) <= 180 && Math.abs(lat) <= 90 ? [lon, lat] : null;
}

function bounds(value: string | null): Bounds | null {
  const parts = numbers(value, 4);
  if (!parts) return null;
  const [w, s, e, n] = parts as [number, number, number, number];
  return w < e && s < n ? [w, s, e, n] : null;
}

function lupa(value: string | null): ZoomWindow | null {
  const parts = numbers(value, 3);
  if (!parts) return null;
  const [lon, lat, size] = parts as [number, number, number];
  return Math.abs(lon) <= 180 && Math.abs(lat) <= 90 && size >= 5 && size <= 30
    ? { lon, lat, size_km: size }
    : null;
}

const round = (value: number, digits = 4) => Number(value.toFixed(digits));

export function parseHash(hash: string): HashState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const layer = params.get('l') as MapLayer | null;
  const rawStep = params.get('p');
  const step = rawStep === null ? Number.NaN : Number.parseInt(rawStep, 10);
  const rawPair = params.get('g');
  const pair = rawPair === null ? Number.NaN : Number.parseInt(rawPair, 10);
  const lang = params.get('lang');
  return {
    mode: MODES[params.get('m') ?? ''] ?? null,
    story: clean(params.get('s'), ID),
    stack: clean(params.get('k'), ID),
    before: clean(params.get('b'), DATE),
    after: clean(params.get('a'), DATE),
    layer: layer && LAYERS.includes(layer) ? layer : null,
    step: Number.isInteger(step) && step >= 0 ? step : null,
    lang: lang === 'es' || lang === 'en' ? lang : null,
    point: point(params.get('pt')),
    lens: clean(params.get('lens'), ID),
    aoi: bounds(params.get('o')),
    lupa: lupa(params.get('u')),
    basemap: params.get('bm') === 'optico' ? 'optico' : 'sat',
    pair: Number.isInteger(pair) && pair >= 0 ? pair : null,
    context: parseContext(params.get('cx')),
    contextDays: parseDays(params.get('cd')),
    proj: params.get('proj') === 'mercator' ? 'mercator' : 'globe',
  };
}

export function buildHash(state: Partial<HashState>): string {
  const params = new URLSearchParams();
  const put = (key: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && value !== '') params.set(key, String(value));
  };
  if (state.mode && state.mode !== 'stories') put('m', MODE_CODE[state.mode]);
  put('s', state.story);
  put('k', state.story ? null : state.stack);
  put('pt', state.point ? state.point.map((value) => round(value)).join(',') : null);
  put('b', state.before);
  put('a', state.after);
  put('l', state.layer);
  put('p', state.step);
  put('lens', state.story ? null : state.lens);
  put('o', state.aoi ? state.aoi.map((value) => round(value)).join(',') : null);
  put(
    'u',
    state.lupa ? [round(state.lupa.lon), round(state.lupa.lat), round(state.lupa.size_km, 1)].join(',') : null,
  );
  if (state.basemap === 'optico') put('bm', 'optico');
  put('g', state.pair);
  const context = stringifyContext(state.context ?? {});
  put('cx', context);
  if (context.includes('a') && state.contextDays) put('cd', state.contextDays);
  put('lang', state.lang);
  if (state.proj === 'mercator') put('proj', 'mercator');
  const text = params.toString();
  return text ? `#${text}` : '';
}
