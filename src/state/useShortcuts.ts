// Atajos de teclado globales. Son pocos y de una sola tecla; nunca actúan mientras se escribe
// en un campo ni mientras hay un diálogo abierto, y dejan en paz las teclas que ya usa el
// control que tiene el foco (el mapa, la cortina, las notas, un botón).
import { useEffect, useRef } from 'react';

export type ShortcutId =
  | 'stories'
  | 'explore'
  | 'live'
  | 'prev'
  | 'next'
  | 'playPause'
  | 'dance'
  | 'borders'
  | 'names'
  | 'sound'
  | 'zoomIn'
  | 'zoomOut'
  | 'recenter'
  | 'help';

/** Lista para la ayuda: teclas tal como se rotulan y la acción que disparan. */
export const SHORTCUTS: Array<{ id: ShortcutId; keys: string[] }> = [
  { id: 'stories', keys: ['1'] },
  { id: 'explore', keys: ['2'] },
  { id: 'live', keys: ['3'] },
  { id: 'prev', keys: ['←'] },
  { id: 'next', keys: ['→'] },
  { id: 'dance', keys: ['D'] },
  { id: 'playPause', keys: ['space'] },
  { id: 'sound', keys: ['M'] },
  { id: 'borders', keys: ['B'] },
  { id: 'names', keys: ['N'] },
  { id: 'zoomIn', keys: ['+'] },
  { id: 'zoomOut', keys: ['−'] },
  { id: 'recenter', keys: ['0'] },
  { id: 'help', keys: ['?'] },
];

const BY_KEY: Record<string, ShortcutId> = {
  '1': 'stories',
  '2': 'explore',
  '3': 'live',
  ArrowLeft: 'prev',
  ArrowRight: 'next',
  ' ': 'playPause',
  d: 'dance',
  b: 'borders',
  n: 'names',
  m: 'sound',
  '+': 'zoomIn',
  '=': 'zoomIn',
  '-': 'zoomOut',
  '0': 'recenter',
  '?': 'help',
};

/** Teclas que un control enfocado ya usa para lo suyo: ahí el atajo global cede. */
const OWN_KEYS: ShortcutId[] = ['prev', 'next', 'playPause'];

/** Qué atajo corresponde a una tecla, según dónde está el foco; `null` si no debe actuar. */
export function shortcutFor(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>,
  target: { tag: string; editable: boolean; interactive: boolean },
): ShortcutId | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (target.editable || target.tag === 'INPUT' || target.tag === 'TEXTAREA' || target.tag === 'SELECT') return null;
  const id = BY_KEY[event.key.length === 1 ? event.key.toLowerCase() : event.key];
  if (!id) return null;
  if (target.interactive && OWN_KEYS.includes(id)) return null;
  return id;
}

/** Devuelve `true` si atendió el atajo (se cancela entonces la acción por omisión del navegador). */
export type ShortcutHandler = (id: ShortcutId) => boolean;

export function useShortcuts(handler: ShortcutHandler) {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (document.querySelector('dialog[open]')) return;
      const element = event.target instanceof Element ? event.target : null;
      const id = shortcutFor(event, {
        tag: element?.tagName ?? '',
        editable: element instanceof HTMLElement && element.isContentEditable,
        interactive: Boolean(
          element?.closest('button, a[href], summary, [role="button"], [role="slider"], .maplibregl-canvas'),
        ),
      });
      if (id && latest.current(id)) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
