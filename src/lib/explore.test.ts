import { describe, expect, it } from 'vitest';
import type { NaturalEvent, Scene, UrgentScene } from '../types';
import { aoiFromView, bboxOfPolygon, intersectBounds } from './aoi';
import { datesAroundEvent, hasPairAround } from './around';
import { cameraFor, zoomForBounds, zoomForWindow } from './camera';
import {
  countByCategory,
  eventsGeoJSON,
  filterEvents,
  groupUrgent,
  presentCategories,
} from './events';
import { zoomSummary } from './lupa';
import type { Story } from '../types';

function scene(date: string, mode = '4005_DHDH', analyzable = true): Scene {
  return {
    id: date,
    granule: `g-${date}`,
    date,
    datetime: `${date}T00:00:00Z`,
    cycle: 1,
    mode,
    collection: 'x',
    quality: 'validated',
    analyzable,
    thumbnail: '',
    browse_url: '',
    download_url: '',
  };
}

describe('pasadas alrededor de un evento', () => {
  const scenes = [
    scene('2026-09-01'),
    scene('2026-09-13'),
    scene('2026-09-25'),
    scene('2026-10-07', '2005_QPDH'),
    scene('2026-10-19'),
  ];
  it('elige la última anterior y la primera posterior del mismo modo', () => {
    expect(datesAroundEvent(scenes, '2026-09-20T00:00:00Z')).toEqual({ before: '2026-09-13', after: '2026-09-25' });
  });
  it('salta una posterior de otro modo y busca otra anterior', () => {
    // Antes más reciente 09-25 (modo A); la primera posterior es 10-07 (modo B): se usa 10-19.
    expect(datesAroundEvent(scenes, '2026-09-30T00:00:00Z')).toEqual({ before: '2026-09-25', after: '2026-10-19' });
  });
  it('un evento posterior a la última pasada deja solo «antes»', () => {
    expect(datesAroundEvent(scenes, '2026-11-08T12:00:00Z')).toEqual({ before: '2026-10-19', after: null });
    expect(hasPairAround(scenes, '2026-11-08T12:00:00Z')).toBe(false);
  });
  it('un evento anterior a todas deja solo «después»', () => {
    expect(datesAroundEvent(scenes, '2026-08-01')).toEqual({ before: null, after: '2026-09-01' });
  });
  it('ignora pasadas no analizables y no incluye la fecha del propio evento', () => {
    const mixed = [scene('2026-09-01', 'a', false), scene('2026-09-10'), scene('2026-09-20')];
    expect(datesAroundEvent(mixed, '2026-09-10')).toEqual({ before: null, after: '2026-09-20' });
  });
  it('sin pasadas devuelve vacío', () => {
    expect(datesAroundEvent([], '2026-09-10')).toEqual({ before: null, after: null });
  });
});

describe('área de análisis desde la vista', () => {
  const footprint = bboxOfPolygon({
    coordinates: [[[-76.1, 10.2], [-76.6, 8.1], [-74.3, 7.6], [-73.8, 9.7], [-76.1, 10.2]]],
  });
  it('la caja de la huella cubre todos sus vértices', () => {
    expect(footprint).toEqual([-76.6, 7.6, -73.8, 10.2]);
    expect(bboxOfPolygon(null)).toBeNull();
  });
  it('recorta la vista a la huella', () => {
    const choice = aoiFromView([-75.5, 8, -74.5, 9], footprint, 'view');
    expect(choice).toEqual({ aoi: [-75.5, 8, -74.5, 9], reason: 'view' });
    expect(aoiFromView([-77, 8, -74.5, 9], footprint).aoi).toEqual([-76.6, 8, -74.5, 9]);
  });
  it('con el cuadro completo no hay aoi', () => {
    expect(aoiFromView([-75.5, 8, -74.5, 9], footprint, 'full')).toEqual({ aoi: null, reason: 'full-mode' });
  });
  it('si la vista cubre casi toda la huella, usa el cuadro completo', () => {
    expect(aoiFromView([-80, 5, -70, 12], footprint)).toEqual({ aoi: null, reason: 'view-covers' });
  });
  it('si la vista queda fuera de la huella, usa el cuadro completo', () => {
    expect(aoiFromView([10, 10, 11, 11], footprint)).toEqual({ aoi: null, reason: 'outside' });
  });
  it('una vista de globo alejado o con NaN no es una ventana', () => {
    expect(aoiFromView([-180, -85, 180, 85], footprint).reason).toBe('no-view');
    expect(aoiFromView([Number.NaN, 8, -74, 9], footprint).reason).toBe('no-view');
    expect(aoiFromView(null, footprint).reason).toBe('no-view');
  });
  it('intersecta cajas y detecta las disjuntas', () => {
    expect(intersectBounds([0, 0, 2, 2], [1, 1, 3, 3])).toEqual([1, 1, 2, 2]);
    expect(intersectBounds([0, 0, 1, 1], [2, 2, 3, 3])).toBeNull();
  });
});

describe('cámara', () => {
  const base = {
    id: 'x',
    lens: 'agua',
    title: 't',
    place: 'p',
    country: 'c',
    summary: 's',
    steps: [],
    sources: [],
  };
  it('una historia de cambio sin zoom de cámara se encuadra por su aoi', () => {
    const story: Story = {
      ...base,
      kind: 'change',
      center: [-74.85, 8.8],
      lupa: { lon: -74.85, lat: 8.72, size_km: 15 },
      aoi: [-75.35, 8.15, -74.25, 9.45],
      stack: 's',
      before: '2026-01-01',
      after: '2026-02-01',
    };
    const view = cameraFor(story);
    expect(view.center).toEqual([-74.85, 8.8]);
    expect(view.zoom).toBeGreaterThan(6.5);
    expect(view.zoom).toBeLessThan(9.5);
  });
  it('un zoom numérico se respeta', () => {
    const story: Story = { ...base, kind: 'interferogram', center: [-155.5, 19.6], zoom: 7.4, point: [-155.28, 19.41], limit: 4 };
    expect(cameraFor(story)).toEqual({ center: [-155.5, 19.6], zoom: 7.4 });
  });
  it('mayor área, menor zoom; ventana más chica, más zoom', () => {
    expect(zoomForBounds([-20, 60, -10, 70])).toBeLessThan(zoomForBounds([-18, 64, -16, 65]));
    expect(zoomForWindow(10, 8.7)).toBeGreaterThan(zoomForWindow(20, 8.7));
    // 15 km en unos 520 px a 8,7° de latitud queda cerca del zoom 11,7.
    expect(zoomForWindow(15, 8.7)).toBeCloseTo(11.7, 0);
  });
});

describe('resumen de la lupa', () => {
  const stats = {
    hh: { median_before_db: -5.04, median_after_db: -16.4, p5: -3, p95: 3, hist: { edges: [], counts: [] } },
    hv: null,
  } as never;
  it('dice las medianas como frase en español e inglés', () => {
    expect(zoomSummary(stats, 'es')).toEqual(['El retorno HH pasó de −5,0 a −16,4 dB.']);
    expect(zoomSummary(stats, 'en')).toEqual(['The HH return went from −5.0 to −16.4 dB.']);
  });
  it('añade HV si existe y calla si faltan medianas', () => {
    const dual = {
      hh: { median_before_db: -8.14, median_after_db: -7.69, p5: 0, p95: 0, hist: { edges: [], counts: [] } },
      hv: { median_before_db: -14, median_after_db: -15.5, p5: 0, p95: 0, hist: { edges: [], counts: [] } },
    } as never;
    expect(zoomSummary(dual, 'es')).toHaveLength(2);
    const browse = { hh: { gain: 1, bias: 0, inliers: 1, p5: 0, p95: 0, hist: { edges: [], counts: [] } }, hv: null } as never;
    expect(zoomSummary(browse, 'es')).toEqual([]);
  });
});

function event(id: string, category: string, date: string): NaturalEvent {
  return { id, title: id, category, category_label: category, date, lon: 0, lat: 0, closed: false, link: '', source_url: '' };
}

describe('eventos', () => {
  const events = [
    event('a', 'wildfires', '2026-11-01T00:00:00Z'),
    event('b', 'floods', '2026-11-05T00:00:00Z'),
    event('c', 'wildfires', '2026-11-09T00:00:00Z'),
    event('d', 'raros', '2026-11-03T00:00:00Z'),
  ];
  it('ordena por fecha descendente y oculta categorías', () => {
    expect(filterEvents(events, new Set()).map((e) => e.id)).toEqual(['c', 'b', 'd', 'a']);
    expect(filterEvents(events, new Set(['wildfires'])).map((e) => e.id)).toEqual(['b', 'd']);
  });
  it('cuenta y ordena las categorías presentes', () => {
    expect(countByCategory(events)).toEqual({ wildfires: 2, floods: 1, raros: 1 });
    expect(presentCategories(events)).toEqual(['wildfires', 'floods', 'raros']);
  });
  it('el GeoJSON lleva color por categoría y un punto por evento', () => {
    const collection = eventsGeoJSON(events);
    expect(collection.features).toHaveLength(4);
    expect(collection.features[1]?.properties.color).toBe('#3aa0ff');
  });
  it('agrupa los productos urgentes de la misma pasada', () => {
    const base = { stack: '098_A_019', footprint: null, center: [0, 0] as [number, number], thumbnail: 't', browse_url: 'b' };
    const scenes: UrgentScene[] = [
      { ...base, granule: 'gslc', product: 'GSLC', datetime: '2026-11-11T23:40:59Z' },
      { ...base, granule: 'gcov', product: 'GCOV', datetime: '2026-11-11T23:40:59Z' },
      { ...base, stack: '091_D_077', granule: 'otra', product: 'GCOV', datetime: '2026-11-12T01:00:00Z' },
    ];
    const groups = groupUrgent(scenes);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.stack).toBe('091_D_077');
    expect(groups[1]?.products).toEqual(['GSLC', 'GCOV']);
    expect(groups[1]?.granule).toBe('gcov');
  });
});
