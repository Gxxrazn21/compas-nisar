// Encuadres de cámara: funciones puras para decidir centro y zoom sin tocar el mapa.
import type { Bounds, LonLat, Story } from '../types';

const MIN_ZOOM = 1;
const MAX_ZOOM = 14;

function mercatorY(lat: number): number {
  const clamped = Math.max(-85, Math.min(85, lat)) * (Math.PI / 180);
  return Math.log(Math.tan(Math.PI / 4 + clamped / 2));
}

export function centerOfBounds(bounds: Bounds): LonLat {
  return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
}

/** Zoom de MapLibre (teselas de 512 px) que deja `bounds` dentro de una vista de `width`×`height` px. */
export function zoomForBounds(bounds: Bounds, width = 900, height = 520, margin = 0.9): number {
  const lonSpan = Math.max(bounds[2] - bounds[0], 1e-6);
  const ySpan = Math.max(mercatorY(bounds[3]) - mercatorY(bounds[1]), 1e-6);
  const zoomX = Math.log2((width * margin * 360) / (512 * lonSpan));
  const zoomY = Math.log2((height * margin * 2 * Math.PI) / (512 * ySpan));
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(zoomX, zoomY)));
}

/** Zoom que deja una ventana cuadrada de `sizeKm` ocupando unos `px` píxeles en esa latitud. */
export function zoomForWindow(sizeKm: number, lat: number, px = 520): number {
  const metersPerPixel = (sizeKm * 1000) / px;
  const zoom = Math.log2((78271.517 * Math.cos((lat * Math.PI) / 180)) / metersPerPixel);
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export interface View {
  center: LonLat;
  zoom: number;
  /** Si se indica, el mapa calcula el zoom que encuadra estos límites en el espacio libre de paneles. */
  fit?: Bounds;
}

/**
 * Cámara de una historia. Si trae `zoom`, se usa tal cual; si no, las historias de cambio
 * encuadran su `aoi`.
 */
export function cameraFor(story: Story): View {
  if (typeof story.zoom === 'number') return { center: story.center, zoom: story.zoom };
  if (story.kind !== 'interferogram') {
    return { center: story.center, zoom: zoomForBounds(story.aoi, 760, 540, 1), fit: story.aoi };
  }
  return { center: story.center, zoom: 7 };
}
