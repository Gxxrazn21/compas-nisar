import { describe, expect, it } from 'vitest';
import {
  CONTEXT,
  CONTEXT_IDS,
  DEFAULT_OPACITY,
  LEGEND,
  S1_FIRST_DATE,
  activeContext,
  canStep,
  contextDate,
  contextTiles,
  parseContext,
  parseDays,
  stepOffset,
  stringifyContext,
} from './context';

const NOW = new Date('2026-11-12T15:00:00Z');

describe('teselas de contexto', () => {
  it('usan las URLs exactas del contrato de NASA GIBS', () => {
    const base = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
    expect(contextTiles('agua', '2026-10-25')).toEqual([
      `${base}/OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1/default/2026-10-25/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png`,
    ]);
    expect(contextTiles('suelo', '2026-10-25')).toEqual([
      `${base}/MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual/default/2024-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
    ]);
    expect(contextTiles('poblacion', '2026-10-25')).toEqual([
      `${base}/GPW_Population_Density_2020/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
    ]);
  });
  it('conocen su zoom máximo', () => {
    expect(CONTEXT.agua.maxzoom).toBe(12);
    expect(CONTEXT.suelo.maxzoom).toBe(8);
    expect(CONTEXT.poblacion.maxzoom).toBe(7);
  });
  it('cada capa tiene opacidad inicial y enlace a la fuente', () => {
    for (const id of CONTEXT_IDS) {
      expect(DEFAULT_OPACITY[id]).toBeGreaterThan(0);
      expect(CONTEXT[id].link.startsWith('https://')).toBe(true);
    }
  });
  it('las leyendas salen de los colores oficiales', () => {
    expect(LEGEND.agua[0]?.colors).toEqual(['rgb(0,0,255)']);
    expect(LEGEND.suelo.length).toBeGreaterThanOrEqual(6);
    for (const item of [...LEGEND.agua, ...LEGEND.suelo]) {
      expect(item.label.es.length).toBeGreaterThan(2);
      expect(item.label.en.length).toBeGreaterThan(2);
    }
  });
});

describe('fecha de Sentinel-1', () => {
  it('parte de la fecha «después» y avanza o retrocede de a un día', () => {
    expect(contextDate('2026-10-24', 0, NOW)).toBe('2026-10-24');
    expect(contextDate('2026-10-24', 1, NOW)).toBe('2026-10-25');
    expect(contextDate('2026-10-24', -1, NOW)).toBe('2026-10-23');
    expect(stepOffset('2026-10-24', 0, 1, NOW)).toBe(1);
    expect(stepOffset('2026-10-24', 1, -2, NOW)).toBe(-1);
  });
  it('cruza el cambio de mes y de año', () => {
    expect(contextDate('2026-10-31', 1, NOW)).toBe('2026-11-01');
    expect(contextDate('2026-01-01', -1, NOW)).toBe('2025-12-31');
  });
  it('no pasa de hoy ni de la primera fecha publicada', () => {
    expect(contextDate('2026-11-12', 5, NOW)).toBe('2026-11-12');
    expect(canStep('2026-11-12', 0, 1, NOW)).toBe(false);
    expect(canStep('2026-11-12', 0, -1, NOW)).toBe(true);
    expect(contextDate('2024-01-10', -100, NOW)).toBe(S1_FIRST_DATE);
    expect(stepOffset('2026-11-12', 0, 3, NOW)).toBe(0);
  });
  it('sin comparación usa ayer', () => {
    expect(contextDate(null, 0, NOW)).toBe('2026-11-11');
  });
});

describe('estado de las capas', () => {
  it('se escribe y se lee de vuelta', () => {
    const layers = { agua: 0.75, suelo: 0.6, poblacion: 0.4 };
    expect(stringifyContext(layers)).toBe('a75,c60,p40');
    expect(parseContext('a75,c60,p40')).toEqual(layers);
    expect(activeContext(layers)).toEqual(['agua', 'suelo', 'poblacion']);
  });
  it('acota la opacidad y descarta lo desconocido', () => {
    expect(parseContext('a5,c250,x40,p')).toEqual({ agua: 0.2, suelo: 1 });
    expect(parseContext(null)).toEqual({});
    expect(parseDays('-3')).toBe(-3);
    expect(parseDays('99999')).toBe(0);
  });
});
