// Capas de contexto de NASA GIBS (sin clave; el navegador pide las teselas directo).
// Fuente de las URLs, zooms y atribución: docs/contrato-api.md, «Capas de contexto».
// Las leyendas salen de los mapas de color oficiales de GIBS (gibs.earthdata.nasa.gov/colormaps/v1.3)
// y se comprobaron contra los píxeles de las teselas.
import type { Lang } from '../types';

export type ContextId = 'agua' | 'suelo' | 'poblacion';

export const CONTEXT_IDS: ContextId[] = ['agua', 'suelo', 'poblacion'];

/** Opacidad (0 a 1) de cada capa encendida; las apagadas no aparecen. */
export type ContextLayers = Partial<Record<ContextId, number>>;

export const GIBS_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

/** Primera fecha con datos de Sentinel-1 en GIBS (OPERA DSWx-S1). */
export const S1_FIRST_DATE = '2023-12-15';
/** Fecha de la cobertura del suelo MODIS (producto anual). */
export const LAND_COVER_DATE = '2024-01-01';

export const MIN_OPACITY = 0.2;
export const DEFAULT_OPACITY: Record<ContextId, number> = { agua: 0.75, suelo: 0.6, poblacion: 0.6 };

export interface ContextDef {
  id: ContextId;
  /** Letra que identifica la capa en el hash. */
  code: 'a' | 'c' | 'p';
  maxzoom: number;
  /** Página de la capa, para quien quiera ir a la fuente. */
  link: string;
}

export const CONTEXT: Record<ContextId, ContextDef> = {
  agua: {
    id: 'agua',
    code: 'a',
    maxzoom: 12,
    link: 'https://worldview.earthdata.nasa.gov/?l=OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1',
  },
  suelo: {
    id: 'suelo',
    code: 'c',
    maxzoom: 8,
    link: 'https://worldview.earthdata.nasa.gov/?l=MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual',
  },
  poblacion: {
    id: 'poblacion',
    code: 'p',
    maxzoom: 7,
    link: 'https://worldview.earthdata.nasa.gov/?l=GPW_Population_Density_2020',
  },
};

/** Plantilla de teselas de una capa. `date` solo cuenta para la de Sentinel-1. */
export function contextTiles(id: ContextId, date: string): string[] {
  switch (id) {
    case 'agua':
      return [
        `${GIBS_BASE}/OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1/default/${date}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png`,
      ];
    case 'suelo':
      return [
        `${GIBS_BASE}/MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual/default/${LAND_COVER_DATE}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
      ];
    case 'poblacion':
      return [`${GIBS_BASE}/GPW_Population_Density_2020/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`];
  }
}

// ---------------------------------------------------------------------------------------------
// Fecha de la capa de Sentinel-1: la fecha «después» de la comparación, más o menos algunos días.

const DAY_MS = 86_400_000;

function shift(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function baseDate(after: string | null, now: Date): string {
  return after ?? shift(todayIso(now), -1);
}

/** Fecha de Sentinel-1 que se pide: `after` + `offset` días, dentro de lo que GIBS publica. */
export function contextDate(after: string | null, offset: number, now: Date = new Date()): string {
  const wanted = shift(baseDate(after, now), offset);
  const last = todayIso(now);
  if (wanted > last) return last;
  if (wanted < S1_FIRST_DATE) return S1_FIRST_DATE;
  return wanted;
}

/** Nuevo desfase tras avanzar o retroceder `delta` días; nunca sale del rango publicado. */
export function stepOffset(after: string | null, offset: number, delta: number, now: Date = new Date()): number {
  const base = baseDate(after, now);
  const target = contextDate(after, offset + delta, now);
  return Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${base}T00:00:00Z`)) / DAY_MS);
}

export function canStep(after: string | null, offset: number, delta: number, now: Date = new Date()): boolean {
  return stepOffset(after, offset, delta, now) !== offset;
}

// ---------------------------------------------------------------------------------------------
// Hash: `cx=a75,c60,p60` (letra de la capa y opacidad en %) y `cd=-2` (desfase de días de Sentinel-1).

const CODE_TO_ID: Record<string, ContextId> = { a: 'agua', c: 'suelo', p: 'poblacion' };

export function parseContext(value: string | null): ContextLayers {
  const layers: ContextLayers = {};
  if (!value) return layers;
  for (const part of value.split(',')) {
    const match = /^([acp])(\d{1,3})$/.exec(part.trim());
    if (!match) continue;
    const percent = Math.min(100, Math.max(Math.round(MIN_OPACITY * 100), Number(match[2])));
    layers[CODE_TO_ID[match[1]!]!] = percent / 100;
  }
  return layers;
}

export function stringifyContext(layers: ContextLayers): string {
  return CONTEXT_IDS.filter((id) => layers[id] !== undefined)
    .map((id) => `${CONTEXT[id].code}${Math.round((layers[id] ?? 0) * 100)}`)
    .join(',');
}

export function parseDays(value: string | null): number {
  const days = value === null ? 0 : Number.parseInt(value, 10);
  return Number.isInteger(days) && Math.abs(days) <= 800 ? days : 0;
}

export function activeContext(layers: ContextLayers): ContextId[] {
  return CONTEXT_IDS.filter((id) => layers[id] !== undefined);
}

// ---------------------------------------------------------------------------------------------
// Leyendas: colores de los mapas de color oficiales de GIBS.

export interface LegendItem {
  colors: string[];
  label: Record<Lang, string>;
}

export const LEGEND: Record<'agua' | 'suelo', LegendItem[]> = {
  agua: [
    { colors: ['rgb(0,0,255)'], label: { es: 'Agua abierta', en: 'Open water' } },
    { colors: ['rgb(0,255,0)'], label: { es: 'Vegetación inundada', en: 'Inundated vegetation' } },
    { colors: ['rgb(255,255,255)'], label: { es: 'Sin agua', en: 'Not water' } },
    {
      colors: ['rgb(200,200,200)', 'rgb(128,128,128)'],
      label: { es: 'Sin analizar (relieve o sombra del radar)', en: 'Not analyzed (terrain or radar shadow)' },
    },
  ],
  suelo: [
    {
      colors: ['rgb(33,138,33)', 'rgb(49,204,49)', 'rgb(152,204,49)', 'rgb(150,250,150)', 'rgb(141,186,141)'],
      label: { es: 'Bosques', en: 'Forests' },
    },
    {
      colors: ['rgb(186,141,141)', 'rgb(245,222,179)', 'rgb(218,235,157)', 'rgb(255,213,0)'],
      label: { es: 'Matorrales y sabanas', en: 'Shrublands and savannas' },
    },
    { colors: ['rgb(240,185,103)'], label: { es: 'Pastizales', en: 'Grasslands' } },
    { colors: ['rgb(250,239,115)', 'rgb(153,147,86)'], label: { es: 'Cultivos', en: 'Croplands' } },
    { colors: ['rgb(71,131,181)'], label: { es: 'Humedales permanentes', en: 'Permanent wetlands' } },
    { colors: ['rgb(255,0,0)'], label: { es: 'Zonas urbanas', en: 'Urban and built-up' } },
    { colors: ['rgb(134,202,227)'], label: { es: 'Agua', en: 'Water' } },
    {
      colors: ['rgb(255,255,255)', 'rgb(191,191,189)'],
      label: { es: 'Nieve, hielo y suelo desnudo', en: 'Snow, ice and bare ground' },
    },
  ],
};

/** Degradado de la densidad de población: de menos de 1 a 1.000 o más personas por km². */
export const POPULATION_RAMP =
  'linear-gradient(90deg, rgb(255,242,209), rgb(254,213,154) 22%, rgb(251,165,74) 45%, rgb(240,59,32) 75%, rgb(189,0,38))';
