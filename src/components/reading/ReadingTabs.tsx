// Pestañas accesibles del panel de lectura: roles ARIA, flechas, Inicio y Fin del teclado.
import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
}

interface Props<Id extends string> {
  label: string;
  tabs: TabItem<Id>[];
  selected: Id;
  /** Prefijo de los identificadores: `{prefix}-tab-{id}` y `{prefix}-panel-{id}`. */
  prefix: string;
  onSelect: (id: Id) => void;
}

export function tabId(prefix: string, id: string) {
  return `${prefix}-tab-${id}`;
}

export function panelId(prefix: string, id: string) {
  return `${prefix}-panel-${id}`;
}

/** Posición a la que lleva una tecla de navegación, o `null` si no es de navegación. */
export function nextTabIndex(key: string, current: number, count: number): number | null {
  if (count === 0) return null;
  if (key === 'ArrowRight') return (current + 1) % count;
  if (key === 'ArrowLeft') return (current - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

export function ReadingTabs<Id extends string>({ label, tabs, selected, prefix, onSelect }: Props<Id>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(event.key, index, tabs.length);
    if (next === null) return;
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    onSelect(target.id);
    refs.current[next]?.focus();
  };

  return (
    <div className="pestanas-lectura" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => {
        const active = tab.id === selected;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={tabId(prefix, tab.id)}
            aria-selected={active}
            aria-controls={panelId(prefix, tab.id)}
            tabIndex={active ? 0 : -1}
            className="pestana-lectura"
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
