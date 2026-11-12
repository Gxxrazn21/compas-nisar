import { describe, expect, it } from 'vitest';
import type { Scene } from '../types';
import { blockReason, pick, sameMode } from './selection';
import type { Selection } from './selection';

function scene(date: string, mode = '4005_DHDH', analyzable = true): Scene {
  return {
    id: date,
    granule: `g-${date}`,
    date,
    datetime: `${date}T00:00:00Z`,
    cycle: 1,
    mode,
    collection: 'x',
    quality: analyzable ? 'validated' : 'beta',
    analyzable,
    thumbnail: '',
    browse_url: '',
    download_url: '',
  };
}

const scenes = [
  scene('2026-01-01', '4005_DHDH', false),
  scene('2026-02-01'),
  scene('2026-03-01', '2005_QPDH'),
  scene('2026-04-01'),
  scene('2026-05-01'),
];
const at = (index: number) => scenes[index] as Scene;
const empty: Selection = { before: null, after: null, awaiting: 'before' };

describe('compatibilidad de modos', () => {
  it('solo compara pasadas analizables del mismo modo', () => {
    expect(sameMode(at(1), at(3))).toBe(true);
    expect(sameMode(at(1), at(2))).toBe(false);
    expect(sameMode(at(0), at(1))).toBe(false);
  });
});

describe('selección de antes y después', () => {
  it('la primera pulsación elige «antes»', () => {
    expect(pick(empty, at(1), scenes)).toEqual({ before: '2026-02-01', after: null, awaiting: 'after' });
  });
  it('la segunda elige «después»', () => {
    const first = pick(empty, at(1), scenes);
    expect(pick(first, at(3), scenes)).toEqual({
      before: '2026-02-01',
      after: '2026-04-01',
      awaiting: 'before',
    });
  });
  it('si la segunda es más antigua, las intercambia', () => {
    const second = pick(pick(empty, at(4), scenes), at(1), scenes);
    expect(second.before).toBe('2026-02-01');
    expect(second.after).toBe('2026-05-01');
  });
  it('una nueva pulsación reinicia la elección', () => {
    const done: Selection = { before: '2026-02-01', after: '2026-04-01', awaiting: 'before' };
    expect(pick(done, at(4), scenes)).toEqual({ before: '2026-05-01', after: null, awaiting: 'after' });
  });
});

describe('notas bloqueadas', () => {
  const awaitingAfter: Selection = { before: '2026-02-01', after: null, awaiting: 'after' };
  it('la colección beta nunca se puede elegir', () => {
    expect(blockReason(at(0), empty, scenes)).toBe('not-analyzable');
  });
  it('otro modo de adquisición se atenúa al elegir «después»', () => {
    expect(blockReason(at(2), awaitingAfter, scenes)).toBe('other-mode');
    expect(blockReason(at(2), empty, scenes)).toBeNull();
  });
  it('no deja repetir la fecha de «antes»', () => {
    expect(blockReason(at(1), awaitingAfter, scenes)).toBe('same-date');
  });
  it('una pulsación bloqueada no cambia la selección', () => {
    expect(pick(awaitingAfter, at(2), scenes)).toBe(awaitingAfter);
  });
});
