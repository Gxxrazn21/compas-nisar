import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  formatArea,
  formatBetween,
  formatDate,
  formatDb,
  formatNumber,
} from './format';

describe('formatDate', () => {
  it('escribe la fecha larga en español', () => {
    expect(formatDate('2026-06-26', 'es')).toBe('26 de junio de 2026');
  });
  it('escribe la fecha larga en inglés', () => {
    expect(formatDate('2026-10-24', 'en')).toBe('October 24, 2026');
  });
  it('no corre el día por la zona horaria', () => {
    expect(formatDate('2026-01-01', 'es', false)).toBe('1 de enero');
  });
});

describe('formatBetween', () => {
  it('omite el año de la primera fecha si coincide', () => {
    expect(formatBetween('2026-06-26', '2026-10-24', 'es')).toBe(
      'Entre el 26 de junio y el 24 de octubre de 2026',
    );
    expect(formatBetween('2026-06-26', '2026-10-24', 'en')).toBe('Between June 26 and October 24, 2026');
  });
  it('conserva ambos años si difieren', () => {
    expect(formatBetween('2025-12-04', '2026-01-09', 'es')).toBe(
      'Entre el 4 de diciembre de 2025 y el 9 de enero de 2026',
    );
  });
});

describe('formatNumber y formatArea', () => {
  it('usa el separador de miles de cada idioma', () => {
    expect(formatNumber(41234.4, 'es')).toBe('41.234');
    expect(formatNumber(41234.4, 'en')).toBe('41,234');
  });
  it('usa coma decimal en español y punto en inglés', () => {
    expect(formatNumber(4.5, 'es', 1)).toBe('4,5');
    expect(formatNumber(4.5, 'en', 1)).toBe('4.5');
  });
  it('ajusta los decimales del área a su magnitud', () => {
    expect(formatArea(1840.2, 'es')).toBe('1.840 km²');
    expect(formatArea(99.66, 'es')).toBe('99,7 km²');
    expect(formatArea(0.4, 'en')).toBe('0.40 km²');
  });
  it('escribe los decibelios con signo', () => {
    expect(formatDb(-7.3, 'es', true)).toBe('−7,3 dB');
    expect(formatDb(3.2, 'en', true)).toBe('+3.2 dB');
  });
});

describe('daysBetween', () => {
  it('cuenta días de calendario', () => {
    expect(daysBetween('2026-06-26', '2026-10-24')).toBe(120);
  });
});
