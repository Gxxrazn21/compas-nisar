import { describe, expect, it } from 'vitest';
import {
  LOOK,
  centralAngleDeg,
  groundKm,
  groundTrack,
  makeOrbit,
  periodMinutes,
  stateAt,
  swathAt,
  swathRibbon,
  tleAgeHours,
  unwrapLon,
} from './orbit';
import type { LonLat } from '../types';

// TLE real de NISAR (CelesTrak, época 14 de noviembre de 2026).
const LINE1 = '1 65053U 25163A   26318.33841497  .00000208  00000+0  76025-4 0  9998';
const LINE2 = '2 65053  98.4060 143.8397 0001241  89.6085 270.5247 14.42502322 68036';
const EPOCH = Date.parse('2026-11-14T08:07:19Z');

describe('órbita de NISAR', () => {
  const orbit = makeOrbit(LINE1, LINE2);
  if (!orbit) throw new Error('El TLE de prueba no es válido');

  it('rechaza renglones que no son un TLE', () => {
    expect(makeOrbit('hola', 'mundo')).toBeNull();
  });

  it('da una vuelta cada 100 minutos, a unos 747 km y 7,5 km/s', () => {
    expect(periodMinutes(orbit)).toBeCloseTo(99.8, 0);
    const state = stateAt(orbit, new Date(EPOCH));
    expect(state).not.toBeNull();
    expect(state!.altitudeKm).toBeGreaterThan(735);
    expect(state!.altitudeKm).toBeLessThan(775);
    expect(state!.speedKmS).toBeCloseTo(7.48, 1);
  });

  it('recorre casi de polo a polo (inclinación de 98,4°)', () => {
    const period = periodMinutes(orbit) * 60_000;
    const latitudes = groundTrack(orbit, EPOCH, EPOCH + period, 20_000).flat().map((point) => point[1]);
    expect(Math.max(...latitudes)).toBeGreaterThan(81);
    expect(Math.max(...latitudes)).toBeLessThan(82.5);
    expect(Math.min(...latitudes)).toBeLessThan(-81);
  });

  it('distingue el tramo ascendente del descendente', () => {
    const period = periodMinutes(orbit) * 60_000;
    const a = stateAt(orbit, new Date(EPOCH + period * 0.02))!;
    const b = stateAt(orbit, new Date(EPOCH + period * 0.03))!;
    expect(a.ascending).toBe(b.lat > a.lat);
  });

  it('parte la traza en el antimeridiano sin saltos de longitud', () => {
    const period = periodMinutes(orbit) * 60_000;
    const segments = groundTrack(orbit, EPOCH, EPOCH + 2 * period);
    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments) {
      for (let i = 1; i < segment.length; i += 1) {
        expect(Math.abs(segment[i]![0] - segment[i - 1]![0])).toBeLessThan(180);
      }
    }
    // Cada cruce termina en un borde y el tramo siguiente arranca en el opuesto, a la misma latitud.
    for (let i = 1; i < segments.length; i += 1) {
      const end = segments[i - 1]!.at(-1)!;
      const start = segments[i]![0]!;
      expect(Math.abs(end[0])).toBe(180);
      expect(start[0]).toBe(-end[0]);
      expect(start[1]).toBe(end[1]);
    }
  });

  it('mira a la izquierda con una franja de unos 240 km', () => {
    expect(groundKm(centralAngleDeg(LOOK.farIncidenceDeg, 747) - centralAngleDeg(LOOK.nearIncidenceDeg, 747))).toBeCloseTo(254, -1);
    const swath = swathAt(orbit, new Date(EPOCH))!;
    expect(swath.widthKm).toBeGreaterThan(235);
    expect(swath.widthKm).toBeLessThan(270);
    const state = stateAt(orbit, new Date(EPOCH))!;
    expect(swath.nadir[0]).toBeCloseTo(state.lon, 0);
    expect(swath.nadir[1]).toBeCloseTo(state.lat, 0);
  });

  it('la franja calculada cae sobre la huella real del cuadro 011_D_084 (La Mojana, 24 de octubre de 2026)', () => {
    // Esquinas de la huella publicada por ASF: la pasada empezó a las 23:28:04 UTC y duró 34 segundos.
    const start = swathAt(orbit, new Date('2026-10-24T23:28:04Z'))!;
    const end = swathAt(orbit, new Date('2026-10-24T23:28:38Z'))!;
    const near = (a: LonLat, b: LonLat) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    expect(near(start.near, [-76.107, 10.222])).toBeLessThan(0.35);
    expect(near(start.far, [-73.84, 9.691])).toBeLessThan(0.35);
    expect(near(end.near, [-76.591, 8.135])).toBeLessThan(0.35);
    expect(near(end.far, [-74.33, 7.611])).toBeLessThan(0.35);
  });

  it('la banda observada es un anillo cerrado y continuo aunque cruce el antimeridiano', () => {
    const period = periodMinutes(orbit) * 60_000;
    const ring = swathRibbon(orbit, EPOCH, EPOCH + period);
    expect(ring.length).toBeGreaterThan(100);
    expect(ring.at(-1)).toEqual(ring[0]);
    for (let i = 1; i < ring.length - 1; i += 1) {
      expect(Math.abs(ring[i]![0] - ring[i - 1]![0])).toBeLessThan(120);
    }
    expect(unwrapLon(-179, 178)).toBe(181);
    expect(unwrapLon(10, 20)).toBe(10);
  });

  it('mide la antigüedad del TLE en horas', () => {
    expect(tleAgeHours('2026-11-14T08:07:19Z', EPOCH + 6 * 3_600_000)).toBeCloseTo(6, 5);
  });
});
