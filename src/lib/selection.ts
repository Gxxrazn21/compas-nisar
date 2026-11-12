// Selección de «antes» y «después» en la partitura.
import type { Scene } from '../types';

export interface Selection {
  before: string | null;
  after: string | null;
  /** Qué elegirá la próxima pulsación. */
  awaiting: 'before' | 'after';
}

export type Blocked = 'not-analyzable' | 'other-mode' | 'same-date';

/** Solo se comparan pasadas analizables y del mismo modo de adquisición. */
export function blockReason(scene: Scene, selection: Selection, scenes: Scene[]): Blocked | null {
  if (!scene.analyzable) return 'not-analyzable';
  if (selection.awaiting === 'after' && selection.before) {
    const anchor = scenes.find((item) => item.date === selection.before);
    if (anchor && anchor.mode !== scene.mode) return 'other-mode';
    if (scene.date === selection.before) return 'same-date';
  }
  return null;
}

/**
 * La primera pulsación elige «antes»; la segunda, «después». Si la segunda cae antes que la
 * primera, se intercambian para que «antes» sea siempre la fecha más antigua.
 */
export function pick(selection: Selection, scene: Scene, scenes: Scene[]): Selection {
  if (blockReason(scene, selection, scenes)) return selection;
  if (selection.awaiting === 'before' || !selection.before) {
    return { before: scene.date, after: null, awaiting: 'after' };
  }
  const first = selection.before;
  return scene.date < first
    ? { before: scene.date, after: first, awaiting: 'before' }
    : { before: first, after: scene.date, awaiting: 'before' };
}

export function sameMode(a: Scene, b: Scene): boolean {
  return a.analyzable && b.analyzable && a.mode === b.mode;
}
