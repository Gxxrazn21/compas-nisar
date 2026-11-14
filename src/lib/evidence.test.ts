import { describe, expect, it } from 'vitest';
import { evidenceReview, evidenceSummary, worldviewLink } from './evidence';

describe('revisión de evidencia independiente', () => {
  it('no convierte una capa consultada en corroboración automática', () => {
    const review = evidenceReview({ status: 'consistent', date: '2026-10-24', note: 'Coincide visualmente' }, '2026-10-24');
    expect(evidenceSummary(review, 'es')).toContain('visual');
    expect(evidenceSummary(review, 'es')).toContain('no confirma');
  });
  it('descarta estados y fechas inválidos y limita anotaciones', () => {
    expect(evidenceReview({ status: 'confirmed', date: '2026-02-30' }, '2026-10-24')).toEqual({ status: 'not_reviewed', date: '2026-10-24', note: '' });
    expect(evidenceReview({ note: 'x'.repeat(5000) }, '2026-10-24').note).toHaveLength(1000);
  });
  it('distingue sin datos de ausencia de cambio', () => {
    expect(evidenceSummary({ status: 'no_data', date: '2026-10-24', note: '' }, 'es')).toContain('sin datos');
    expect(evidenceSummary({ status: 'not_reviewed', date: '2026-10-24', note: '' }, 'en')).toContain('not reviewed');
  });
  it('abre el sensor independiente con fecha y área explícitas', () => {
    const url = new URL(worldviewLink([-75, 8, -74, 9], '2026-10-24'));
    expect(url.hostname).toBe('worldview.earthdata.nasa.gov');
    expect(url.searchParams.get('t')).toBe('2026-10-24');
    expect(url.searchParams.get('v')).toBe('-75,8,-74,9');
    expect(url.searchParams.get('l')).toContain('OPERA');
  });
});
