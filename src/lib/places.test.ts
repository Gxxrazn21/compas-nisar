import { describe, expect, it } from 'vitest';
import type { Place } from '../types';
import { isAtPlace, otherPlaces, placeQuery } from './places';

const monteria: Place = { name: 'Montería', label: 'Montería, Córdoba, Colombia', lon: -75.88, lat: 8.75, kind: 'city' };
const cali: Place = { name: 'Cali', label: 'Cali, Valle del Cauca, Colombia', lon: -76.53, lat: 3.45, kind: 'city' };

describe('consulta de lugar', () => {
  it('recorta y une los espacios', () => {
    expect(placeQuery('  Calle 30   # 5-20,  Montería ')).toBe('Calle 30 # 5-20, Montería');
  });
  it('rechaza textos de menos de dos letras', () => {
    expect(placeQuery('')).toBeNull();
    expect(placeQuery('  a ')).toBeNull();
  });
  it('limita la longitud a 120 caracteres', () => {
    expect(placeQuery('x'.repeat(300))).toHaveLength(120);
  });
});

describe('lugar mostrado', () => {
  it('reconoce el punto del lugar', () => {
    expect(isAtPlace([-75.88, 8.75], monteria)).toBe(true);
  });
  it('deja de coincidir si se eligió otro punto', () => {
    expect(isAtPlace([-75.5, 8.75], monteria)).toBe(false);
    expect(isAtPlace(null, monteria)).toBe(false);
    expect(isAtPlace([-75.88, 8.75], null)).toBe(false);
  });
  it('lista los demás resultados', () => {
    expect(otherPlaces([monteria, cali], monteria)).toEqual([cali]);
    expect(otherPlaces([monteria, cali], null)).toEqual([monteria, cali]);
  });
});
