// Hoja inferior del celular: sigue el dedo al arrastrar el asa y se acomoda en tres alturas.
// En pantallas anchas no genera caja (display: contents) y los paneles flotan sobre el mapa.
import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';

const HANDLE_PX = 64;
/** Fracciones de la altura de la ventana: cerrada (solo el asa), media y alta. */
const SNAPS = [0, 0.46, 0.84] as const;

function snapHeight(index: number): number {
  const fraction = SNAPS[index] ?? 0;
  return index === 0 ? HANDLE_PX : Math.round(window.innerHeight * fraction);
}

function nearest(height: number): number {
  let best = 0;
  let distance = Infinity;
  SNAPS.forEach((_, index) => {
    const gap = Math.abs(snapHeight(index) - height);
    if (gap < distance) {
      distance = gap;
      best = index;
    }
  });
  return best;
}

export function Sheet({ label, children }: { label: string; children: ReactNode }) {
  const [snap, setSnap] = useState(1);
  const [height, setHeight] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null);

  const onDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startHeight: height ?? snapHeight(snap), moved: false };
  };

  const onMove = (event: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state) return;
    const delta = state.startY - event.clientY;
    if (Math.abs(delta) > 6) state.moved = true;
    if (!state.moved) return;
    const max = Math.round(window.innerHeight * 0.9);
    setHeight(Math.min(max, Math.max(HANDLE_PX, state.startHeight + delta)));
  };

  const onUp = () => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    if (state.moved && height !== null) {
      setSnap(nearest(height));
    } else {
      // Un toque alterna entre cerrada y media.
      setSnap((current) => (current === 0 ? 1 : 0));
    }
    setHeight(null);
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSnap((current) => Math.min(SNAPS.length - 1, current + 1));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSnap((current) => Math.max(0, current - 1));
    }
  };

  return (
    <div
      className={`hoja snap-${snap}${height !== null ? ' arrastrando' : ''}`}
      data-cubre="hoja"
      style={{ height: height ?? snapHeight(snap) }}
    >
      <button
        type="button"
        className="hoja-asa"
        aria-expanded={snap > 0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
        onClick={(event) => {
          // Los toques del teclado (Enter, Espacio) llegan como clic sin puntero.
          if (event.detail === 0) setSnap((current) => (current === 0 ? 1 : 0));
        }}
      >
        <span className="hoja-barra" aria-hidden="true" />
        <span className="solo-lector">{label}</span>
      </button>
      {children}
    </div>
  );
}
