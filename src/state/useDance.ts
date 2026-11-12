// «La danza»: serie de pasadas sobre un punto, cuadros precargados y reproducción.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api, isAbort } from '../api';
import type { Bounds, LonLat, SeriesResult } from '../types';
import { prefersReducedMotion, useElapsed } from './useElapsed';

export const FRAME_MS = 700;

export type DancePhase = 'idle' | 'series' | 'preload' | 'ready' | 'error';

export interface DanceTarget {
  stack: string;
  point: LonLat;
  aoi: Bounds | null;
}

export interface Dance {
  phase: DancePhase;
  /** La serie queda cargada tras salir de la danza: la partitura la usa para las alturas. */
  series: SeriesResult | null;
  active: boolean;
  index: number;
  playing: boolean;
  loop: boolean;
  loaded: number;
  elapsed: number;
  errorDetail: string | null;
  manualOnly: boolean;
  start: () => void;
  cancel: () => void;
  stop: () => void;
  toggle: () => void;
  toggleLoop: () => void;
  step: (delta: number) => void;
}

function preloadImages(urls: string[], onProgress: (n: number) => void, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    let done = 0;
    if (!urls.length) return resolve();
    const finish = () => {
      done += 1;
      onProgress(done);
      if (done >= urls.length) resolve();
    };
    signal.addEventListener('abort', () => resolve(), { once: true });
    for (const url of urls) {
      const image = new Image();
      image.onload = finish;
      image.onerror = finish;
      image.src = url;
    }
  });
}

export function useDance(target: DanceTarget | null): Dance {
  const [phase, setPhase] = useState<DancePhase>('idle');
  const [series, setSeries] = useState<SeriesResult | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [loaded, setLoaded] = useState(0);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const manualOnly = prefersReducedMotion();
  const elapsed = useElapsed(phase === 'series');

  const key = target ? `${target.stack}|${target.aoi?.join(',') ?? ''}` : '';

  // Otra pila u otra ventana: se descarta todo lo anterior.
  useEffect(() => {
    abort.current?.abort();
    setPhase('idle');
    setSeries(null);
    setPlaying(false);
    setIndex(0);
    setErrorDetail(null);
  }, [key]);

  useEffect(() => () => abort.current?.abort(), []);

  const frameCount = series?.frames.length ?? 0;

  useEffect(() => {
    if (phase !== 'ready' || !playing || frameCount < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current + 1 < frameCount) return current + 1;
        if (loop) return 0;
        setPlaying(false);
        return current;
      });
    }, FRAME_MS);
    return () => window.clearInterval(timer);
  }, [phase, playing, loop, frameCount]);

  const start = useCallback(() => {
    if (!target) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setErrorDetail(null);
    setLoaded(0);
    setIndex(0);
    setPhase('series');
    api
      .series({ stack: target.stack, lon: target.point[0], lat: target.point[1], max: 12, aoi: target.aoi }, controller.signal)
      .then(async (result) => {
        if (controller.signal.aborted) return;
        setSeries(result);
        setPhase('preload');
        await preloadImages(result.frames.map((frame) => frame.url), setLoaded, controller.signal);
        if (controller.signal.aborted) return;
        setPhase('ready');
        setPlaying(!prefersReducedMotion());
      })
      .catch((error: unknown) => {
        if (isAbort(error) || controller.signal.aborted) return;
        setErrorDetail(error instanceof ApiError && error.detail ? error.detail : null);
        setPhase('error');
      });
  }, [target]);

  const cancel = useCallback(() => {
    abort.current?.abort();
    setPhase('idle');
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
    setPhase('idle');
  }, []);

  const step = useCallback(
    (delta: number) => {
      setPlaying(false);
      setIndex((current) => (frameCount ? (current + delta + frameCount) % frameCount : 0));
    },
    [frameCount],
  );

  return {
    phase,
    series,
    active: phase === 'ready',
    index,
    playing,
    loop,
    loaded,
    elapsed,
    errorDetail,
    manualOnly,
    start,
    cancel,
    stop,
    toggle: () => setPlaying((value) => !value),
    toggleLoop: () => setLoop((value) => !value),
    step,
  };
}
