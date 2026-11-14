// «La danza»: serie de pasadas sobre un punto, cuadros precargados y reproducción.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api, isAbort } from '../api';
import type { Bounds, LonLat, SeriesResult } from '../types';
import { prefersReducedMotion, useElapsed } from './useElapsed';
import { playableSeries, preloadImages, targetKey } from '../lib/dance';
import type { SeriesChannel } from '../lib/dance';

export const FRAME_MS = 700;

export type DancePhase = 'idle' | 'series' | 'preload' | 'ready' | 'error';

export interface DanceTarget {
  stack: string;
  point: LonLat;
  aoi: Bounds | null;
  pointKind?: 'center' | 'selected';
}

export interface Dance {
  phase: DancePhase;
  /** Hay pila y punto para pedir la serie: sin esto, empezar la danza no haría nada. */
  available: boolean;
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
  channel: SeriesChannel;
  setChannel: (channel: SeriesChannel) => void;
  point: LonLat | null;
  pointKind: 'center' | 'selected';
  failedDates: string[];
  totalFrames: number;
  retry: () => void;
  start: () => void;
  cancel: () => void;
  stop: () => void;
  toggle: () => void;
  toggleLoop: () => void;
  step: (delta: number) => void;
}

export function useDance(target: DanceTarget | null, preparedSeries: SeriesResult | null = null): Dance {
  const [phase, setPhase] = useState<DancePhase>('idle');
  const [series, setSeries] = useState<SeriesResult | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [loaded, setLoaded] = useState(0);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [channel, setChannelState] = useState<SeriesChannel>('hh');
  const [failedDates, setFailedDates] = useState<string[]>([]);
  const [totalFrames, setTotalFrames] = useState(0);
  const source = useRef<SeriesResult | null>(null);
  const abort = useRef<AbortController | null>(null);
  const manualOnly = prefersReducedMotion();
  const elapsed = useElapsed(phase === 'series');

  const key = targetKey(target);

  // Otra pila u otra ventana: se descarta todo lo anterior.
  useEffect(() => {
    abort.current?.abort();
    setPhase('idle');
    setSeries(null);
    setPlaying(false);
    setIndex(0);
    setErrorDetail(null);
    setFailedDates([]);
    setTotalFrames(0);
    setChannelState('hh');
    source.current = null;
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

  const startChannel = useCallback((selectedChannel: SeriesChannel) => {
    if (!target) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setErrorDetail(null);
    setLoaded(0);
    setIndex(0);
    setPlaying(false);
    setFailedDates([]);
    setPhase('series');
    const prepared = preparedSeries?.stack === target.stack &&
      preparedSeries.point[0] === target.point[0] && preparedSeries.point[1] === target.point[1] ? preparedSeries : null;
    const request = source.current ?? prepared;
    (request ? Promise.resolve(request) : api
      .series({ stack: target.stack, lon: target.point[0], lat: target.point[1], max: 12, aoi: target.aoi }, controller.signal))
      .then(async (result) => {
        if (controller.signal.aborted) return;
        source.current = result;
        setSeries(result);
        setTotalFrames(result.frames.length);
        setPhase('preload');
        const loadedFrames = await preloadImages(result.frames.map((frame) => selectedChannel === 'hv' ? (frame.hv_url ?? '') : frame.url), setLoaded, controller.signal);
        if (controller.signal.aborted) return;
        const playable = playableSeries(result, selectedChannel, loadedFrames);
        setFailedDates(result.frames.filter((_, i) => !loadedFrames[i]).map(frame => frame.date));
        setSeries(playable);
        if (!playable.frames.length) {
          setPhase('error');
          return;
        }
        setPhase('ready');
        setPlaying(!prefersReducedMotion() && playable.frames.length > 1);
      })
      .catch((error: unknown) => {
        if (isAbort(error) || controller.signal.aborted) return;
        setErrorDetail(error instanceof ApiError && error.detail ? error.detail : null);
        setPhase('error');
      });
  }, [target, preparedSeries]);

  const start = useCallback(() => startChannel(channel), [startChannel, channel]);
  const setChannel = useCallback((value: SeriesChannel) => {
    setChannelState(value);
    if (phase !== 'idle') startChannel(value);
  }, [phase, startChannel]);

  const cancel = useCallback(() => {
    abort.current?.abort();
    setPhase('idle');
    setPlaying(false);
    setSeries(null);
  }, []);

  const stop = useCallback(() => {
    abort.current?.abort();
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
    available: target !== null,
    series,
    active: phase === 'ready',
    index,
    playing,
    loop,
    loaded,
    elapsed,
    errorDetail,
    manualOnly,
    channel,
    setChannel,
    point: target?.point ?? null,
    pointKind: target?.pointKind ?? 'center',
    failedDates,
    totalFrames,
    retry: start,
    start,
    cancel,
    stop,
    toggle: () => { if (phase === 'ready' && !manualOnly) setPlaying((value) => !value); },
    toggleLoop: () => setLoop((value) => !value),
    step,
  };
}
