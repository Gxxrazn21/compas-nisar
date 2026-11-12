import { describe, expect, it } from 'vitest';
import type { ChangeResult } from '../types';
import { buildReport } from './report';

function change(overrides: Partial<ChangeResult> = {}): ChangeResult {
  const scene = (date: string) => ({
    id: date,
    granule: `NISAR_${date}`,
    date,
    datetime: `${date}T00:00:00Z`,
    cycle: 1,
    mode: '4005_DHDH',
    collection: 'NISAR_L2_GCOV_V1',
    quality: 'validated' as const,
    analyzable: true,
    thumbnail: '',
    browse_url: '',
    download_url: '',
  });
  return {
    id: 'abc',
    stack: '011_D_084',
    before: scene('2026-06-26'),
    after: scene('2026-10-24'),
    days_between: 120,
    dual_pol: true,
    georef: 'kml',
    bounds: [-75, 8, -74, 9],
    coordinates: [[-75, 9], [-74, 9], [-74, 8], [-75, 8]],
    size: [10, 10],
    layers: {
      before: '/derived/abc/before.png',
      after: '/derived/abc/after.png',
      change_hh: '/derived/abc/change_hh.png',
      change_hv: null,
      classes: '/derived/abc/classes.png',
      composite: '/derived/abc/composite.png',
    },
    stats: {
      valid_km2: 100,
      changed_km2: 10,
      changed_pct: 10,
      correlation: 0.9,
      confidence: { level: 'alta', reasons: [] },
      classes: [
        { key: 'agua_nueva', label: 'x', km2: 6, pct: 6, color: '#38bdf8' },
        { key: 'aumento', label: 'y', km2: 0, pct: 0, color: '#fb923c' },
      ],
      hh: { gain: 1, bias: 0.1, inliers: 0.9, p5: -1, p95: 1, hist: { edges: [], counts: [] } },
      hv: null,
    },
    method: { version: 3, formula: 'f', c: 0.03, threshold_db: 3, filter: 'media 5×5', note: 'n' },
    limitations: [],
    ...overrides,
  };
}

const options = {
  lang: 'es' as const,
  lens: 'agua',
  stack: null,
  link: 'http://x/#s=mojana',
  origin: 'http://localhost:5173',
  limits: ['uno'],
  generatedAt: '2026-11-12T00:00:00Z',
};

describe('informe exportable', () => {
  it('reúne fechas, método, estadísticas, procedencia y límites', () => {
    const report = buildReport(change(), options);
    expect(report.fechas).toEqual({ antes: '2026-06-26', despues: '2026-10-24', dias_entre_pasadas: 120 });
    expect(report.fuente).toContain('browse');
    expect(report.metodo.version).toBe(3);
    expect(report.escenas).toHaveLength(2);
    expect(report.escenas[0]?.buscador_asf).toContain('NISAR_2026-06-26');
    expect(report.limites).toEqual(['uno']);
    expect(report.enlace).toBe('http://x/#s=mojana');
  });
  it('nombra las clases según el lente y omite las de 0 km²', () => {
    const report = buildReport(change(), options);
    expect(report.estadisticas.clases).toEqual([
      { clave: 'agua_nueva', nombre: 'Posible agua abierta nueva', km2: 6, pct: 6 },
    ]);
  });
  it('las capas son enlaces completos y se omiten las nulas', () => {
    const report = buildReport(change(), options);
    expect(report.capas.before).toBe('http://localhost:5173/derived/abc/before.png');
    expect(report.capas).not.toHaveProperty('change_hv');
  });
  it('la lupa calibrada informa medianas en dB reales, no ganancia ni sesgo', () => {
    const base = change();
    const calibrated = change({
      source: 'gcov',
      resolution_m: 30,
      stats: {
        ...base.stats,
        hh: { median_before_db: -5, median_after_db: -16.4, p5: 0, p95: 0, hist: { edges: [], counts: [] } },
      },
    });
    const report = buildReport(calibrated, options);
    expect(report.unidades).toContain('reales');
    expect(report.estadisticas.hh).toEqual({ mediana_antes_db: -5, mediana_despues_db: -16.4 });
    expect(report.estadisticas.resumen).toEqual(['El retorno HH pasó de −5,0 a −16,4 dB.']);
    expect(report.area.resolucion_m).toBe(30);
  });
});
