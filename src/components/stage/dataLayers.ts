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

interface Installed {
  change: ChangeResult;
  only?: DataKey[];
  warm: AbortController;
}

const INSTALLED = new WeakMap<MapLibreMap, Installed>();
const WARM_DELAY_MS = 400;

/**
 * Trae al caché del navegador, sin prisa, las capas que aún no se ven: cambiar de capa después
 * es inmediato, y el mapa no decodifica ni sube a la tarjeta gráfica imágenes que nadie mira.
 */
function warm(entry: Installed) {
  const { signal } = entry.warm;
  const urls = DATA_KEYS.filter((key) => !entry.only || entry.only.includes(key))
    .map((key) => entry.change.layers[key])
    .filter((url): url is string => Boolean(url));
  const timer = setTimeout(async () => {
    for (const url of urls) {
      if (signal.aborted) return;
      try {
        await (await fetch(url, { signal })).blob();
      } catch {
        return; // Sin red o cancelada: la capa se pedirá cuando haga falta.
      }
    }
  }, WARM_DELAY_MS);
  signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
}

/**
 * Sustituye el cambio anterior por el nuevo. Las imágenes no se añaden aquí: cada capa entra al
 * mapa la primera vez que se muestra (ver `showLayer`), en lugar de cargar las seis a la vez.
 */
export function installChange(map: MapLibreMap, change: ChangeResult | null, only?: DataKey[]) {
  INSTALLED.get(map)?.warm.abort();
  INSTALLED.delete(map);
  removeByPrefix(map, 'dato-');
  if (!change) return;
  const entry: Installed = { change, only, warm: new AbortController() };
  INSTALLED.set(map, entry);
  warm(entry);
}

/** Añade la imagen de una capa si aún no está. */
function ensure(map: MapLibreMap, key: DataKey) {
  const id = dataId(key);
  if (map.getLayer(id)) return;
  const entry = INSTALLED.get(map);
  const url = entry?.change.layers[key];
  if (!entry || !url || (entry.only && !entry.only.includes(key))) return;
  addImage(map, id, url, entry.change.coordinates, 220);
  // El orden fijo importa: «después» debe quedar bajo las capas de cambio cuando hace de fondo.
  for (const other of DATA_KEYS) if (map.getLayer(dataId(other))) map.moveLayer(dataId(other));
  raiseOverlays(map);
}

const CHANGE_KEYS: readonly string[] = ['change_hh', 'change_hv', 'classes'];

/**
 * Muestra la capa pedida con la opacidad dada; `swipe` deja la capa «después» en el mapa principal.
 * Con `radarBelow` (lupa calibrada), las capas de cambio se pintan sobre la imagen de radar
 * «después» en gris: a 30 m el detalle del radar es el contexto, no la foto óptica del mapa base.
 * Con `visible` en falso (el mapa va volando) la capa se pide igual, para que llegue con el vuelo.
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
    const wanted = key === layer || (layer === 'swipe' && key === 'after');
    const asUnderlay = underlay && key === 'after';
    if (wanted || asUnderlay) ensure(map, key);
    if (!map.getLayer(id)) continue;
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
