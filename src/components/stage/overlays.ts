// Capas vectoriales del escenario (GeoJSON de MapLibre): huella de la pila, eventos naturales,
// adquisiciones urgentes y la imagen superpuesta de un interferograma. Son capas del mapa, no
// marcadores del DOM: los eventos pueden pasar de 500.
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { RasterTileSource } from 'maplibre-gl';
import type { Corners, LonLat } from '../../types';
import { CONTEXT, CONTEXT_IDS, contextTiles } from '../../lib/context';
import type { ContextId, ContextLayers } from '../../lib/context';
import type { FeatureCollection } from '../../lib/events';

export const FOOTPRINT = 'huella';
export const EVENTS = 'eventos';
export const URGENT = 'urgentes';
export const OVERLAY = 'superpuesta';
/** Círculos que agrupan eventos cercanos; al acercarse (zoom mayor que `CLUSTER_MAX_ZOOM`) se separan. */
export const CLUSTERS = `${EVENTS}-grupos`;
export const CLUSTER_MAX_ZOOM = 4;

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
  CLUSTERS,
  `${EVENTS}-sel`,
];

const SINGLE = ['!', ['has', 'point_count']] as const;

const contextId = (id: ContextId) => `contexto-${id}`;

/**
 * Capas de contexto de GIBS: rásteres apagados que quedan debajo de las imágenes de NISAR
 * (que se añaden después) y de las capas vectoriales.
 */
function installContext(map: MapLibreMap) {
  for (const id of CONTEXT_IDS) {
    if (map.getLayer(contextId(id))) continue;
    map.addSource(contextId(id), {
      type: 'raster',
      tiles: contextTiles(id, '2000-01-01'),
      tileSize: 256,
      maxzoom: CONTEXT[id].maxzoom,
    });
    map.addLayer({
      id: contextId(id),
      type: 'raster',
      source: contextId(id),
      layout: { visibility: 'none' },
      paint: { 'raster-opacity': 0.7, 'raster-fade-duration': 200 },
    });
  }
}

/** Enciende, apaga y gradúa las capas de contexto; la de Sentinel-1 pide la fecha indicada. */
export function setContext(map: MapLibreMap, layers: ContextLayers, s1Date: string) {
  for (const id of CONTEXT_IDS) {
    const name = contextId(id);
    if (!map.getLayer(name)) continue;
    const opacity = layers[id];
    if (opacity === undefined) {
      if (map.getLayoutProperty(name, 'visibility') !== 'none') map.setLayoutProperty(name, 'visibility', 'none');
      continue;
    }
    if (id === 'agua') {
      const source = map.getSource(name) as RasterTileSource | undefined;
      const wanted = contextTiles('agua', s1Date)[0];
      if (source && wanted && source.tiles?.[0] !== wanted) source.setTiles([wanted]);
    }
    map.setLayoutProperty(name, 'visibility', 'visible');
    map.setPaintProperty(name, 'raster-opacity', opacity);
  }
}

export function installOverlays(map: MapLibreMap) {
  installContext(map);
  installClusterImages(map);
  for (const id of [FOOTPRINT, EVENTS, URGENT]) {
    if (map.getSource(id)) continue;
    map.addSource(
      id,
      id === EVENTS
        ? { type: 'geojson', data: EMPTY as never, cluster: true, clusterMaxZoom: CLUSTER_MAX_ZOOM, clusterRadius: 46 }
        : { type: 'geojson', data: EMPTY as never },
    );
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
    filter: SINGLE as never,
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.5, 4, 5, 8, 8],
      'circle-opacity': ['case', ['get', 'closed'], 0.5, 0.92],
      'circle-stroke-color': NOCHE,
      'circle-stroke-width': 1,
    },
  });
  // El conteo de cada grupo es una imagen que se dibuja al pedirla: el estilo no tiene tipografías vectoriales.
  map.addLayer({
    id: CLUSTERS,
    type: 'symbol',
    source: EVENTS,
    filter: ['has', 'point_count'],
    layout: {
      'icon-image': ['concat', 'grupo-', ['to-string', ['get', 'point_count']]],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  });
  map.addLayer({
    id: `${EVENTS}-sel`,
    type: 'circle',
    source: EVENTS,
    filter: ['all', SINGLE, ['==', ['get', 'id'], '']] as never,
    paint: {
      'circle-color': 'rgba(0,0,0,0)',
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 9, 8, 14],
      'circle-stroke-color': ORO,
      'circle-stroke-width': 3,
    },
  });
}

const PAINTED = new WeakSet<MapLibreMap>();

/** Dibuja la insignia de un grupo: círculo azul noche con borde papel y el número de eventos. */
export function clusterBadge(count: number): { width: number; height: number; data: Uint8ClampedArray } | null {
  const ratio = 2;
  const size = Math.round(26 + Math.min(18, Math.log10(Math.max(count, 1)) * 9));
  const canvas = document.createElement('canvas');
  canvas.width = size * ratio;
  canvas.height = size * ratio;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.scale(ratio, ratio);
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  context.fillStyle = 'rgba(24, 48, 77, 0.96)';
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = '#f2efe6';
  context.stroke();
  context.fillStyle = '#f2efe6';
  context.font = '600 13px "IBM Plex Sans", system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(count), size / 2, size / 2 + 0.5);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return { width: image.width, height: image.height, data: image.data };
}

/** Atiende las imágenes de grupo que el mapa pide por primera vez (`grupo-<n>`). */
export function installClusterImages(map: MapLibreMap) {
  if (PAINTED.has(map)) return;
  PAINTED.add(map);
  map.on('styleimagemissing', (event) => {
    const match = /^grupo-(\d+)$/.exec(event.id);
    if (!match || map.hasImage(event.id)) return;
    const badge = clusterBadge(Number(match[1]));
    if (badge) map.addImage(event.id, badge, { pixelRatio: 2 });
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
  if (map.getLayer(`${EVENTS}-sel`)) {
    map.setFilter(`${EVENTS}-sel`, ['all', SINGLE, ['==', ['get', 'id'], selected ?? '']] as never);
  }
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

/** Acerca el mapa hasta que el grupo se separe en sus eventos. */
export async function expandCluster(map: MapLibreMap, clusterId: number, center: [number, number]) {
  const source = map.getSource(EVENTS) as GeoJSONSource | undefined;
  if (!source) return;
  const zoom = await source.getClusterExpansionZoom(clusterId);
  map.easeTo({ center, zoom: Math.min(zoom + 0.5, 9), duration: 500 });
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
