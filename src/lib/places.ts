// Buscador de lugares de Explorar: utilidades puras.
import type { LonLat, Place } from '../types';

/** Texto listo para enviar al buscador, o null si es demasiado corto. */
export function placeQuery(text: string): string | null {
  const query = text.trim().replace(/\s+/g, ' ');
  return query.length >= 2 ? query.slice(0, 120) : null;
}

/** ¿El punto elegido en el mapa sigue siendo el de este lugar? */
export function isAtPlace(point: LonLat | null, place: Place | null): boolean {
  if (!point || !place) return false;
  return Math.abs(point[0] - place.lon) < 1e-4 && Math.abs(point[1] - place.lat) < 1e-4;
}

/** Los demás resultados de la búsqueda, sin el que ya se está mostrando. */
export function otherPlaces(places: Place[], current: Place | null): Place[] {
  return places.filter((place) => place !== current);
}
