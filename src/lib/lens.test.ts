import { describe, expect, it } from 'vitest';
import type { ClassKey } from '../types';
import { LENS_IDS, LENS_LABEL, asLens, className } from './lens';

const KEYS: ClassKey[] = [
  'agua_nueva',
  'agua_retirada',
  'veg_inundada',
  'veg_perdida',
  'veg_aumento',
  'aumento',
  'disminucion',
];

describe('lentes', () => {
  it('la misma clase se lee distinto según el terreno', () => {
    expect(className('agua', 'veg_perdida', 'es')).toBe('Posible pérdida de vegetación');
    expect(className('hielo', 'veg_perdida', 'es')).toBe('Posible nieve húmeda');
    expect(className('hielo', 'veg_perdida', 'en')).toBe('Possible wet snow');
    expect(className('vegetacion', 'veg_aumento', 'en')).toBe('Possible vegetation or crop growth');
  });
  it('sobre un glaciar ninguna clase habla de pérdida de vegetación', () => {
    for (const key of KEYS) {
      expect(className('hielo', key, 'es').toLowerCase()).not.toContain('pérdida de vegetación');
      expect(className('hielo', key, 'en').toLowerCase()).not.toContain('vegetation loss');
    }
  });
  it('el lente general no afirma nada sobre el terreno', () => {
    expect(className('general', 'agua_nueva', 'es')).toBe('Caída fuerte hasta superficie oscura');
    expect(className('general', 'veg_perdida', 'en')).toBe('Cross-pol return (HV) down');
  });
  it('todo lente tiene nombre para las siete clases en ambos idiomas', () => {
    for (const lens of LENS_IDS) {
      for (const key of KEYS) {
        expect(className(lens, key, 'es').length).toBeGreaterThan(3);
        expect(className(lens, key, 'en').length).toBeGreaterThan(3);
      }
    }
  });
  it('un lente desconocido cae en el general', () => {
    expect(asLens('selva')).toBe('general');
    expect(asLens(undefined)).toBe('general');
    expect(className('selva', 'aumento', 'es')).toBe('Aumento de retorno');
  });
  it('los cuatro lentes tienen nombre visible', () => {
    expect(LENS_LABEL.es.hielo).toBe('Hielo y nieve');
    expect(LENS_LABEL.en.agua).toBe('Water and wetlands');
  });
});
