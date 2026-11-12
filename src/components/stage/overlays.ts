// Capas vectoriales del escenario (GeoJSON de MapLibre): huella de la pila, eventos naturales,
// adquisiciones urgentes y la imagen superpuesta de un interferograma. Son capas del mapa, no
// marcadores del DOM: los eventos pueden pasar de 500.
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { Corners, LonLat } from '../../types';
import type { FeatureCollection } from '../../lib/events';

export const FOOTPRINT = 'huella';
export const EVENTS = 'eventos';
export const URGENT = 'urgentes';
export const OVERLAY = 'superpuesta';

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
const ORO = '#e8b84a';
const NOCHE = '#0a1626';
const URGENT_COLOR = '#d8a7ff';

/** Capas que siempre deben quedar por encima de las imágenes de datos. */
const TOP_LAYERS = [
  `${FOOTPRINT}-relleno`,
  `${FOOTPRINT}-linea`,
  `${URGENT}-relleno`,
  `${URGENT}-linea`,
  `${URGENT}-sel`,
  EVENTS,
  `${EVENTS}-sel`,
];

export function installOverlays(map: MapLibreMap) {
  for (const id of [FOOTPRINT, EVENTS, URGENT]) {
    if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: EMPTY as never });
  }
  if (map.getLayer(`${FOOTPRINT}-linea`)) return;
  map.addLayer({
    id: `${FOOTPRINT}-relleno`,
    type: 'fill',
    source: FOOTPRINT,
    paint: { 'fill-color': ORO, 'fill-opacity': 0.06 },
  });
  map.addLayer({
    id: `${FOOTPRINT}-linea`,
    type: 'line',
    source: FOOTPRINT,
    paint: { 'line-color': ORO, 'line-width': 2, 'line-dasharray': [3, 2] },
  });
  map.addLayer({
    id: `${URGENT}-relleno`,
    type: 'fill',
    source: URGENT,
    paint: { 'fill-color': URGENT_COLOR, 'fill-opacity': 0.14 },
  });
  map.addLayer({
    id: `${URGENT}-linea`,
    type: 'line',
    source: URGENT,
    paint: { 'line-color': URGENT_COLOR, 'line-width': 1.6 },
  });
  map.addLayer({
    id: `${URGENT}-sel`,
    type: 'line',
    source: URGENT,
    filter: ['==', ['get', 'id'], ''],
    paint: { 'line-color': ORO, 'line-width': 3.2 },
  });
  map.addLayer({
    id: EVENTS,
    type: 'circle',
    source: EVENTS,
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.5, 4, 5, 8, 8],
      'circle-opacity': ['case', ['get', 'closed'], 0.5, 0.92],
      'circle-stroke-color': NOCHE,
      'circle-stroke-width': 1,
    },
  });
  map.addLayer({
    id: `${EVENTS}-sel`,
    type: 'circle',
    source: EVENTS,
    filter: ['==', ['get', 'id'], ''],
    paint: {
      'circle-color': 'rgba(0,0,0,0)',
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 9, 8, 14],
      'circle-stroke-color': ORO,
      'circle-stroke-width': 3,
    },
  });
}

/** Sube las capas vectoriales por encima de las imágenes recién instaladas. */
export function raiseOverlays(map: MapLibreMap) {
  for (const id of TOP_LAYERS) if (map.getLayer(id)) map.moveLayer(id);
}

function setData(map: MapLibreMap, id: string, data: FeatureCollection) {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data as never);
}

export function setFootprint(map: MapLibreMap, ring: LonLat[] | null) {
  setData(
    map,
    FOOTPRINT,
    ring
      ? {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }],
        }
      : EMPTY,
  );
}

export function setEvents(map: MapLibreMap, data: FeatureCollection | null, selected: string | null) {
  setData(map, EVENTS, data ?? EMPTY);
  if (map.getLayer(`${EVENTS}-sel`)) map.setFilter(`${EVENTS}-sel`, ['==', ['get', 'id'], selected ?? '']);
}

export function setUrgent(map: MapLibreMap, data: FeatureCollection | null, selected: string | null) {
  setData(map, URGENT, data ?? EMPTY);
  if (map.getLayer(`${URGENT}-sel`)) map.setFilter(`${URGENT}-sel`, ['==', ['get', 'id'], selected ?? '']);
}

/** Imagen superpuesta (interferograma). `null` la quita. */
export function setOverlayImage(map: MapLibreMap, image: { url: string; coordinates: Corners } | null, opacity: number) {
  if (map.getLayer(OVERLAY)) map.removeLayer(OVERLAY);
  if (map.getSource(OVERLAY)) map.removeSource(OVERLAY);
  if (!image) return;
  map.addSource(OVERLAY, { type: 'image', url: image.url, coordinates: image.coordinates });
  map.addLayer({
    id: OVERLAY,
    type: 'raster',
    source: OVERLAY,
    paint: { 'raster-opacity': opacity, 'raster-fade-duration': 300 },
  });
  raiseOverlays(map);
}

export function setOverlayOpacity(map: MapLibreMap, opacity: number) {
  if (map.getLayer(OVERLAY)) map.setPaintProperty(OVERLAY, 'raster-opacity', opacity);
}

/** Entidades de las capas interactivas bajo un punto de la pantalla. */
export function featureAt(map: MapLibreMap, point: { x: number; y: number }, layers: string[]) {
  const present = layers.filter((id) => map.getLayer(id));
  if (!present.length) return null;
  const radius = 6;
  const features = map.queryRenderedFeatures(
    [
      [point.x - radius, point.y - radius],
      [point.x + radius, point.y + radius],
    ],
    { layers: present },
  );
  return features[0] ?? null;
}
