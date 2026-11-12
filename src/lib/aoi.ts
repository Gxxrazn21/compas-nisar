// Área de análisis de la exploración: la vista del mapa recortada a la huella de la pila.
import type { Bounds, LonLat } from '../types';

type Polygon = { coordinates: LonLat[][] } | null | undefined;

/** Caja envolvente de una huella poligonal. */
export function bboxOfPolygon(polygon: Polygon): Bounds | null {
  const ring = polygon?.coordinates?.[0];
  if (!ring || ring.length === 0) return null;
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [lon, lat] of ring) {
    w = Math.min(w, lon);
    e = Math.max(e, lon);
    s = Math.min(s, lat);
    n = Math.max(n, lat);
  }
  return Number.isFinite(w + s + e + n) ? [w, s, e, n] : null;
}

export function intersectBounds(a: Bounds, b: Bounds): Bounds | null {
  const w = Math.max(a[0], b[0]);
  const s = Math.max(a[1], b[1]);
  const e = Math.min(a[2], b[2]);
  const n = Math.min(a[3], b[3]);
  return w < e && s < n ? [w, s, e, n] : null;
}

const area = (b: Bounds) => (b[2] - b[0]) * (b[3] - b[1]);

export interface AoiChoice {
  /** `null` = cuadro completo. */
  aoi: Bounds | null;
  /** Por qué se usa el cuadro completo (o `view` si se recortó). */
  reason: 'full-mode' | 'view-covers' | 'no-view' | 'outside' | 'view';
}

/**
 * `aoi` de una comparación de Explorar: vista actual del mapa intersectada con la huella.
 * Devuelve el cuadro completo si se pidió así, si la vista cubre casi toda la huella (más del
 * 90 % de su área), si no hay vista válida (globo a zoom bajo, NaN) o si no se cruzan.
 */
export function aoiFromView(
  view: Bounds | null,
  footprint: Bounds | null,
  mode: 'view' | 'full' = 'view',
): AoiChoice {
  if (mode === 'full' || !footprint) return { aoi: null, reason: 'full-mode' };
  if (!view || view.some((value) => !Number.isFinite(value)) || view[2] <= view[0] || view[3] <= view[1]) {
    return { aoi: null, reason: 'no-view' };
  }
  // En un globo alejado la vista abarca medio mundo: no es una ventana de análisis.
  if (view[2] - view[0] > 90 || view[3] - view[1] > 90) return { aoi: null, reason: 'no-view' };
  const cut = intersectBounds(view, footprint);
  if (!cut) return { aoi: null, reason: 'outside' };
  if (area(cut) >= 0.9 * area(footprint)) return { aoi: null, reason: 'view-covers' };
  return { aoi: cut.map((value) => Number(value.toFixed(5))) as Bounds, reason: 'view' };
}
