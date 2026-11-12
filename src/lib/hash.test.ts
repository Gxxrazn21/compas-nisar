import { describe, expect, it } from 'vitest';
import { buildHash, parseHash } from './hash';

const EMPTY = {
  mode: null,
  story: null,
  stack: null,
  before: null,
  after: null,
  layer: null,
  step: null,
  lang: null,
  point: null,
  lens: null,
  aoi: null,
  lupa: null,
  basemap: 'sat',
  pair: null,
  proj: 'globe',
};

describe('enlace permanente', () => {
  it('escribe y lee el estado de una historia', () => {
    const hash = buildHash({
      mode: 'stories',
      story: 'mojana',
      stack: '011_D_084',
      before: '2026-06-26',
      after: '2026-10-24',
      layer: 'swipe',
      step: 1,
      lang: 'en',
    });
    expect(hash).toBe('#s=mojana&b=2026-06-26&a=2026-10-24&l=swipe&p=1&lang=en');
    expect(parseHash(hash)).toEqual({
      ...EMPTY,
      story: 'mojana',
      before: '2026-06-26',
      after: '2026-10-24',
      layer: 'swipe',
      step: 1,
      lang: 'en',
    });
  });
  it('una pila sin historia guarda la pila', () => {
    const hash = buildHash({ stack: '053_D_056', before: '2026-03-01', after: '2026-07-23' });
    expect(parseHash(hash).stack).toBe('053_D_056');
  });
  it('ignora valores inválidos en lugar de fallar', () => {
    const state = parseHash('#b=ayer&a=2026-06-01&l=otra&p=-3&lang=fr&s=a%20b&pt=999,3&o=1,2,0,1&u=1,2,99&m=z');
    expect(state).toEqual({ ...EMPTY, after: '2026-06-01' });
  });
  it('un hash vacío no escribe nada y conserva la proyección de prueba', () => {
    expect(buildHash({})).toBe('');
    expect(parseHash('#proj=mercator').proj).toBe('mercator');
    expect(buildHash({ proj: 'mercator' })).toBe('#proj=mercator');
  });
});

describe('enlace de exploración', () => {
  const state = {
    mode: 'explore' as const,
    stack: '011_D_084',
    point: [-74.75, 8.55] as [number, number],
    before: '2026-06-26',
    after: '2026-10-24',
    lens: 'agua',
    aoi: [-75.1, 8.3, -74.5, 8.9] as [number, number, number, number],
    layer: 'classes' as const,
    lupa: { lon: -74.85, lat: 8.72, size_km: 15 },
    basemap: 'optico' as const,
    lang: 'es' as const,
  };
  it('ida y vuelta con punto, pila, fechas, lente, área, capa, lupa y mapa base', () => {
    const hash = buildHash(state);
    expect(hash).toBe(
      '#m=e&k=011_D_084&pt=-74.75%2C8.55&b=2026-06-26&a=2026-10-24&l=classes&lens=agua&o=-75.1%2C8.3%2C-74.5%2C8.9&u=-74.85%2C8.72%2C15&bm=optico&lang=es',
    );
    expect(parseHash(hash)).toEqual({ ...EMPTY, ...state });
  });
  it('en una historia no escribe lente ni pila: los pone la historia', () => {
    const hash = buildHash({ mode: 'stories', story: 'mojana', stack: '011_D_084', lens: 'agua' });
    expect(hash).toBe('#s=mojana');
  });
  it('En vivo se identifica por m=v', () => {
    expect(buildHash({ mode: 'live' })).toBe('#m=v');
    expect(parseHash('#m=v').mode).toBe('live');
  });
  it('rechaza coordenadas fuera de rango o un área invertida', () => {
    const parsed = parseHash('#pt=-200,5&o=5,5,1,1&u=1,2,40');
    expect(parsed.point).toBeNull();
    expect(parsed.aoi).toBeNull();
    expect(parsed.lupa).toBeNull();
  });
});
