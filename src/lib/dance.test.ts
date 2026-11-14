import { afterEach, describe, expect, it, vi } from 'vitest';
import { preloadImages, playableSeries, targetKey } from './dance';
import type { SeriesResult } from '../types';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('precarga de cuadros', () => {
  it('termina la precarga cuando una imagen nunca responde', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('Image', class { set src(_value: string) {} });
    const pending = preloadImages(['stalled'], () => {}, new AbortController().signal, 100);
    await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toEqual([false]);
  });
  it('distingue cuadros cargados y fallidos', async () => {
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) { queueMicrotask(() => value === 'ok' ? this.onload?.() : this.onerror?.()); }
    });
    expect(await preloadImages(['ok', 'bad'], () => {}, new AbortController().signal)).toEqual([true, false]);
  });
  it('cancelar rechaza y no convierte cuadros pendientes en éxito', async () => {
    vi.stubGlobal('Image', class { set src(_value: string) {} });
    const controller = new AbortController();
    const pending = preloadImages(['pending'], () => {}, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('filtra las fechas fallidas sin cambiar fecha ni nota de las restantes', () => {
    const source = {
      frames: [{ date: '2026-01-01', url: 'a' }, { date: '2026-01-13', url: 'b' }, { date: '2026-02-06', url: 'c' }],
      series: [{ date: '2026-01-01', hh_db: -2 }, { date: '2026-01-13', hh_db: -6 }, { date: '2026-02-06', hh_db: -8 }],
    } as SeriesResult;
    const result = playableSeries(source, 'hh', [true, false, true]);
    expect(result.frames).toEqual([{ date: '2026-01-01', url: 'a' }, { date: '2026-02-06', url: 'c' }]);
    expect(result.series.find(point => point.date === result.frames[1]?.date)?.hh_db).toBe(-8);
    expect(playableSeries(source, 'hh', [false, false, false]).frames).toEqual([]);
  });
  it('invalida la serie al cambiar el punto aunque no cambie el área', () => {
    expect(targetKey({ stack: 'x', aoi: null, point: [1, 2] })).not.toBe(targetKey({ stack: 'x', aoi: null, point: [1, 3] }));
  });
});
