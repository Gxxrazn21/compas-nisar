import { describe, expect, it } from 'vitest';
import { browseLegend } from './browseLegend';

describe('leyenda según el modo de la adquisición mostrada', () => {
  it.each([
    ['4005_DHDH', 'hh-hv'],
    ['2005_SHSH', 'hh'],
    ['0005_NASV', 'vv'],
    ['0005_NADV', 'vv-vh'],
    ['2005_QPDH', 'quad'],
    ['4000_DHNA', 'hh-hv'],
  ] as const)('interpreta %s sin atribuirle canales ausentes', (mode, expected) => {
    expect(browseLegend(`NISAR_L2_PR_GCOV_034_066_D_079_${mode}_A_20261028T000000`)).toBe(expected);
  });
  it('no inventa una composición cuando falta el modo o no se reconoce', () => {
    expect(browseLegend(undefined)).toBe('unknown');
    expect(browseLegend('NISAR_2026-10-28')).toBe('unknown');
    expect(browseLegend('4005_RHNA')).toBe('unknown');
  });
});
