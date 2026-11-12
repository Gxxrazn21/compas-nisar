// Eventos naturales (EONET) y adquisiciones urgentes de NISAR: categorías, filtros y GeoJSON.
import type { NaturalEvent, UrgentScene } from '../types';

/** Orden de la leyenda y color de cada categoría de EONET (color de dato, no de interfaz). */
export const EVENT_CATEGORIES = [
  { key: 'wildfires', color: '#ff8a3d' },
  { key: 'floods', color: '#3aa0ff' },
  { key: 'severeStorms', color: '#b79cff' },
  { key: 'volcanoes', color: '#ff5252' },
  { key: 'earthquakes', color: '#f5d742' },
  { key: 'landslides', color: '#c08a5a' },
  { key: 'drought', color: '#d9b36c' },
  { key: 'dustHaze', color: '#c9b8a0' },
  { key: 'seaLakeIce', color: '#8fe3ff' },
  { key: 'snow', color: '#ffffff' },
  { key: 'tempExtremes', color: '#ff6bb0' },
  { key: 'waterColor', color: '#3ddcc0' },
  { key: 'manmade', color: '#a0a8b5' },
] as const;

const COLORS: Record<string, string> = Object.fromEntries(EVENT_CATEGORIES.map((c) => [c.key, c.color]));
export const FALLBACK_COLOR = '#a0a8b5';

export function categoryColor(key: string): string {
  return COLORS[key] ?? FALLBACK_COLOR;
}

/** Eventos de las categorías visibles, del más reciente al más antiguo. */
export function filterEvents(events: NaturalEvent[], hidden: ReadonlySet<string>): NaturalEvent[] {
  return events
    .filter((event) => !hidden.has(event.category))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Cuántos eventos hay por categoría. */
export function countByCategory(events: NaturalEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) counts[event.category] = (counts[event.category] ?? 0) + 1;
  return counts;
}

/** Categorías presentes en los datos, en el orden de la leyenda (las desconocidas, al final). */
export function presentCategories(events: NaturalEvent[]): string[] {
  const counts = countByCategory(events);
  const known: string[] = EVENT_CATEGORIES.map((c) => c.key).filter((key) => counts[key]);
  const extra = Object.keys(counts).filter((key) => !COLORS[key]);
  return [...known, ...extra];
}

export interface UrgentGroup extends UrgentScene {
  /** Productos publicados para la misma pasada (GCOV, GSLC…). */
  products: string[];
}

export function urgentId(group: { stack: string; datetime: string }): string {
  return `${group.stack}|${group.datetime}`;
}

/** El backend devuelve un granule por producto con la misma huella: se agrupan por pila y hora. */
export function groupUrgent(scenes: UrgentScene[]): UrgentGroup[] {
  const groups = new Map<string, UrgentGroup>();
  for (const scene of scenes) {
    const key = urgentId(scene);
    const found = groups.get(key);
    if (!found) {
      groups.set(key, { ...scene, products: [scene.product] });
      continue;
    }
    if (!found.products.includes(scene.product)) found.products.push(scene.product);
    // La vista previa de GCOV es la más legible.
    if (scene.product === 'GCOV') {
      Object.assign(found, { thumbnail: scene.thumbnail, browse_url: scene.browse_url, granule: scene.granule });
    }
  }
  return [...groups.values()].sort((a, b) => b.datetime.localeCompare(a.datetime));
}

interface Feature {
  type: 'Feature';
  properties: Record<string, string | number | boolean>;
  geometry: { type: 'Point'; coordinates: number[] } | { type: 'Polygon'; coordinates: number[][][] };
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

export function eventsGeoJSON(events: NaturalEvent[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: events.map((event) => ({
      type: 'Feature',
      properties: {
        id: event.id,
        category: event.category,
        color: categoryColor(event.category),
        closed: event.closed,
      },
      geometry: { type: 'Point', coordinates: [event.lon, event.lat] },
    })),
  };
}

export function urgentGeoJSON(groups: UrgentGroup[]): FeatureCollection {
  const features: Feature[] = [];
  for (const group of groups) {
    if (!group.footprint) continue;
    features.push({
      type: 'Feature',
      properties: { id: urgentId(group) },
      geometry: { type: 'Polygon', coordinates: group.footprint.coordinates },
    });
  }
  return { type: 'FeatureCollection', features };
}
