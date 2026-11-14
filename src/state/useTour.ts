// Recorrido guiado: en qué paso va, si avanza solo y cuánto le queda al paso actual.
import { useCallback, useEffect, useRef, useState } from 'react';
import { TOUR, chapterStart, clampStep } from '../lib/tour';
import type { Chapter, TourStep } from '../lib/tour';
import { prefersReducedMotion } from './useElapsed';

export interface Tour {
  active: boolean;
  index: number;
  step: TourStep | null;
  total: number;
  /** Avanza solo al terminar el tiempo de cada paso. */
  playing: boolean;
  /** Milisegundos que el paso actual se queda en pantalla. */
  duration: number;
  /** Cambia cada vez que el recorrido se abre: distingue una vuelta de la siguiente. */
  run: number;
  start: (chapter?: Chapter) => void;
  close: () => void;
  go: (index: number) => void;
  next: () => void;
  prev: () => void;
  toggle: () => void;
}

/** `durationOf` da el tiempo de cada paso (depende del texto en el idioma elegido). */
export function useTour(durationOf: (step: TourStep) => number): Tour {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0);
  /** Tiempo ya consumido del paso en pantalla, para que una pausa no lo reinicie. */
  const spent = useRef({ key: '', ms: 0 });

  const step = active ? (TOUR[index] ?? null) : null;
  const duration = step ? durationOf(step) : 0;
  const last = index >= TOUR.length - 1;

  const go = useCallback((target: number) => setIndex(clampStep(target, 0)), []);

  const start = useCallback((chapter?: Chapter) => {
    setIndex(chapter ? chapterStart(chapter) : 0);
    // Con «reducir movimiento» el recorrido no avanza solo: se pasa con los botones.
    setPlaying(!prefersReducedMotion());
    setRun((value) => value + 1);
    setActive(true);
  }, []);

  const close = useCallback(() => {
    setActive(false);
    setPlaying(false);
  }, []);

  const next = useCallback(() => setIndex((current) => clampStep(current, 1)), []);
  const prev = useCallback(() => setIndex((current) => clampStep(current, -1)), []);
  const toggle = useCallback(() => setPlaying((current) => !current), []);

  useEffect(() => {
    if (!active || !playing) return;
    if (last) {
      setPlaying(false);
      return;
    }
    const key = `${run}:${index}`;
    if (spent.current.key !== key) spent.current = { key, ms: 0 };
    const bucket = spent.current;
    const started = performance.now();
    const timer = window.setTimeout(next, Math.max(0, duration - bucket.ms));
    return () => {
      window.clearTimeout(timer);
      bucket.ms += performance.now() - started;
    };
  }, [active, playing, run, index, last, duration, next]);

  return { active, index, step, total: TOUR.length, playing, duration, run, start, close, go, next, prev, toggle };
}
