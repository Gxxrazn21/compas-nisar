// Posición de NISAR a partir de sus elementos orbitales (TLE), con el modelo SGP4.
// Todo se calcula en el navegador: el servidor solo entrega los dos renglones del TLE.
import { degreesLat, degreesLong, eciToGeodetic, gstime, propagate, twoline2satrec } from 'satellite.js';
import type { SatRec } from 'satellite.js';
import type { LonLat } from '../types';

export type Orbit = SatRec;

export interface SatelliteState {
  lon: number;
  lat: number;
  altitudeKm: number;
  speedKmS: number;
  /** Va hacia el norte (órbita ascendente) o hacia el sur. */
  ascending: boolean;
}

/** Prepara la órbita; `null` si los renglones no describen una órbita utilizable. */
export function makeOrbit(line1: string, line2: string): Orbit | null {
  try {
    const orbit = twoline2satrec(line1, line2);
    return orbit.error === 0 && Number.isFinite(orbit.no) && orbit.no > 0 ? orbit : null;
  } catch {
    return null;
  }
}

/** Minutos que tarda una vuelta completa a la Tierra. */
export function periodMinutes(orbit: Orbit): number {
  return (2 * Math.PI) / orbit.no;
}

/** Dónde está el satélite en `date`; `null` si el modelo no da una posición (TLE demasiado viejo). */
export function stateAt(orbit: Orbit, date: Date): SatelliteState | null {
  const { position, velocity } = propagate(orbit, date);
  if (typeof position !== 'object' || typeof velocity !== 'object') return null;
  const place = eciToGeodetic(position, gstime(date));
  const state: SatelliteState = {
    lon: degreesLong(place.longitude),
    lat: degreesLat(place.latitude),
    altitudeKm: place.height,
    speedKmS: Math.hypot(velocity.x, velocity.y, velocity.z),
    ascending: velocity.z > 0,
  };
  return Object.values(state).every((value) => typeof value === 'boolean' || Number.isFinite(value)) ? state : null;
}

/**
 * Traza sobre el suelo entre `fromMs` y `toMs`, en tramos que no cruzan el antimeridiano:
 * cada cruce cierra un tramo en ±180° y abre el siguiente en el lado opuesto.
 */
export function groundTrack(orbit: Orbit, fromMs: number, toMs: number, stepMs = 30_000): LonLat[][] {
  const segments: LonLat[][] = [];
  let current: LonLat[] = [];
  let previous: LonLat | null = null;
  for (let time = fromMs; time <= toMs; time += stepMs) {
    const state = stateAt(orbit, new Date(time));
    if (!state) continue;
    const point: LonLat = [state.lon, state.lat];
    if (previous && Math.abs(point[0] - previous[0]) > 180) {
      // Cruce: latitud interpolada en el meridiano 180.
      const edge = previous[0] > 0 ? 180 : -180;
      const unwrapped = point[0] + (previous[0] > 0 ? 360 : -360);
      const share = (edge - previous[0]) / (unwrapped - previous[0]);
      const lat = previous[1] + (point[1] - previous[1]) * share;
      current.push([edge, lat]);
      segments.push(current);
      current = [[-edge, lat]];
    }
    current.push(point);
    previous = point;
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Cómo mira el radar de NISAR: a la izquierda del rumbo, con un ángulo de incidencia en el suelo
 * de 33° a 47°. De ahí sale una franja de unos 240 km de ancho.
 */
export const LOOK = { nearIncidenceDeg: 33, farIncidenceDeg: 47 } as const;

/** Ángulo en el centro de la Tierra (grados) entre el punto bajo el satélite y el que se ve con esa incidencia. */
export function centralAngleDeg(incidenceDeg: number, altitudeKm: number): number {
  const incidence = (incidenceDeg * Math.PI) / 180;
  const look = Math.asin((EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm)) * Math.sin(incidence));
  return ((incidence - look) * 180) / Math.PI;
}

/** Kilómetros sobre el suelo que abarca un ángulo central. */
export function groundKm(angleDeg: number): number {
  return (angleDeg * Math.PI * EARTH_RADIUS_KM) / 180;
}

export interface Swath {
  /** Punto bajo el satélite. */
  nadir: LonLat;
  /** Borde de la franja más cercano a la traza y borde más lejano. */
  near: LonLat;
  far: LonLat;
  widthKm: number;
}

/**
 * Línea del suelo que el radar puede iluminar en `date`. La izquierda del rumbo es el producto
 * vectorial posición × velocidad; cada borde se obtiene girando el punto bajo el satélite hacia allá.
 */
export function swathAt(orbit: Orbit, date: Date): Swath | null {
  const { position, velocity } = propagate(orbit, date);
  if (typeof position !== 'object' || typeof velocity !== 'object') return null;
  const sidereal = gstime(date);
  const altitudeKm = eciToGeodetic(position, sidereal).height;
  const up = [position.x, position.y, position.z];
  const left = [
    position.y * velocity.z - position.z * velocity.y,
    position.z * velocity.x - position.x * velocity.z,
    position.x * velocity.y - position.y * velocity.x,
  ];
  const upLength = Math.hypot(...up);
  const leftLength = Math.hypot(...left);
  if (!(upLength > 0) || !(leftLength > 0) || !Number.isFinite(altitudeKm)) return null;

  const ground = (angleDeg: number): LonLat => {
    const angle = (angleDeg * Math.PI) / 180;
    const axis = (index: number) =>
      (Math.cos(angle) * up[index]!) / upLength + (Math.sin(angle) * left[index]!) / leftLength;
    const place = eciToGeodetic(
      { x: axis(0) * EARTH_RADIUS_KM, y: axis(1) * EARTH_RADIUS_KM, z: axis(2) * EARTH_RADIUS_KM },
      sidereal,
    );
    return [degreesLong(place.longitude), degreesLat(place.latitude)];
  };

  const nearAngle = centralAngleDeg(LOOK.nearIncidenceDeg, altitudeKm);
  const farAngle = centralAngleDeg(LOOK.farIncidenceDeg, altitudeKm);
  const swath: Swath = {
    nadir: ground(0),
    near: ground(nearAngle),
    far: ground(farAngle),
    widthKm: groundKm(farAngle - nearAngle),
  };
  const numbers = [...swath.nadir, ...swath.near, ...swath.far, swath.widthKm];
  return numbers.every(Number.isFinite) ? swath : null;
}

/** Lleva `lon` a la vuelta más cercana a `reference`, para que una línea no salte 360° en el antimeridiano. */
export function unwrapLon(lon: number, reference: number): number {
  return lon + Math.round((reference - lon) / 360) * 360;
}

/**
 * Banda del suelo que el radar alcanzó a ver entre `fromMs` y `toMs`, como un anillo de polígono.
 * Las longitudes van continuas (pueden pasar de ±180°): así la banda cruza el antimeridiano sin partirse.
 */
export function swathRibbon(orbit: Orbit, fromMs: number, toMs: number, stepMs = 20_000): LonLat[] {
  const near: LonLat[] = [];
  const far: LonLat[] = [];
  let reference: number | null = null;
  for (let time = fromMs; time <= toMs; time += stepMs) {
    const swath = swathAt(orbit, new Date(time));
    if (!swath) continue;
    const nearLon = unwrapLon(swath.near[0], reference ?? swath.near[0]);
    const farLon = unwrapLon(swath.far[0], nearLon);
    reference = nearLon;
    near.push([nearLon, swath.near[1]]);
    far.push([farLon, swath.far[1]]);
  }
  if (near.length < 2) return [];
  return [...near, ...far.reverse(), near[0]!];
}

/** Horas transcurridas desde la época del TLE: con los días, la posición calculada pierde precisión. */
export function tleAgeHours(epochIso: string, nowMs: number): number {
  return (nowMs - Date.parse(epochIso)) / 3_600_000;
}
