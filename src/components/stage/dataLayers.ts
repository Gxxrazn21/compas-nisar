// Capas de datos sobre el mapa: imágenes del cambio y cuadros de la danza.
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { ChangeResult, Corners, MapLayer, SeriesResult } from '../../types';
import { raiseOverlays } from './overlays';

export const DATA_KEYS = ['before', 'after', 'change_hh', 'change_hv', 'classes', 'composite'] as const;
export type DataKey = (typeof DATA_KEYS)[number];

const dataId = (key: string) => `dato-${key}`;
const frameId = (index: number) => `baile-${index}`;

function removeByPrefix(map: MapLibreMap, prefix: string) {
  const style = map.getStyle();
  for (const layer of style.layers ?? []) if (layer.id.startsWith(prefix)) map.removeLayer(layer.id);
  for (const id of Object.keys(style.sources ?? {})) if (id.startsWith(prefix)) map.removeSource(id);
}

function addImage(map: MapLibreMap, id: string, url: string, coordinates: Corners, fadeMs: number) {
  map.addSource(id, { type: 'image', url, coordinates });
  map.addLayer({
    id,
    type: 'raster',
    source: id,
    paint: {
      'raster-opacity': 0,
      'raster-opacity-transition': { duration: fadeMs, delay: 0 },
      'raster-fade-duration': 0,
    },
  });
}

/** Sustituye las capas del cambio anterior por las del nuevo, todas invisibles hasta mostrarlas. */
export function installChange(map: MapLibreMap, change: ChangeResult | null, only?: DataKey[]) {
  removeByPrefix(map, 'dato-');
  if (!change) return;
  for (const key of DATA_KEYS) {
    if (only && !only.includes(key)) continue;
    const url = change.layers[key];
    if (url) addImage(map, dataId(key), url, change.coordinates, 700);
  }
  raiseOverlays(map);
}

const CHANGE_KEYS: readonly string[] = ['change_hh', 'change_hv', 'classes'];

/**
 * Muestra la capa pedida con la opacidad dada; `swipe` deja la capa «después» en el mapa principal.
 * Con `radarBelow` (lupa calibrada), las capas de cambio se pintan sobre la imagen de radar
 * «después» en gris: a 30 m el detalle del radar es el contexto, no la foto óptica del mapa base.
 */
export function showLayer(
  map: MapLibreMap,
  layer: MapLayer,
  opacity: number,
  visible: boolean,
  radarBelow = false,
) {
  const underlay = radarBelow && CHANGE_KEYS.includes(layer);
  for (const key of DATA_KEYS) {
    const id = dataId(key);
    if (!map.getLayer(id)) continue;
    const wanted = key === layer || (layer === 'swipe' && key === 'after');
    const asUnderlay = underlay && key === 'after';
    map.setPaintProperty(id, 'raster-opacity', visible && (wanted || asUnderlay) ? (asUnderlay ? 1 : opacity) : 0);
    if (key === 'after') {
      map.setPaintProperty(id, 'raster-saturation', asUnderlay ? -1 : 0);
      map.setPaintProperty(id, 'raster-brightness-max', asUnderlay ? 0.62 : 1);
    }
  }
}

export function installFrames(map: MapLibreMap, series: SeriesResult | null) {
  removeByPrefix(map, 'baile-');
  if (!series) return;
  series.frames.forEach((frame, index) => addImage(map, frameId(index), frame.url, series.coordinates, 0));
  raiseOverlays(map);
}

export function showFrame(map: MapLibreMap, index: number | null, count: number, opacity: number) {
  for (let i = 0; i < count; i += 1) {
    const id = frameId(i);
    if (map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', i === index ? opacity : 0);
  }
}
