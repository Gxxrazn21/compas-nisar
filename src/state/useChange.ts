// Carga del cambio entre dos fechas con estados explícitos de carga y error.
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api, isAbort } from '../api';
import type { Bounds, ChangeResult, ZoomWindow } from '../types';
import { useElapsed } from './useElapsed';

export interface ChangeQuery {
  stack: string;
  before: string;
  after: string;
  aoi: Bounds | null;
}

export type ChangeStatus = 'idle' | 'loading' | 'ready' | 'error';

export type ChangeErrorKind = 'network' | 'notFound' | 'invalid' | 'upstream' | 'generic';

export interface ChangeError {
  kind: ChangeErrorKind;
  detail: string;
}

export function classifyError(error: unknown): ChangeError {
  if (!(error instanceof ApiError)) return { kind: 'generic', detail: '' };
  if (error.status === 0) return { kind: 'network', detail: '' };
  if (error.status === 404) return { kind: 'notFound', detail: error.detail };
  if (error.status === 422) return { kind: 'invalid', detail: error.detail };
  if (error.status === 502 || error.status === 503) return { kind: 'upstream', detail: error.detail };
  return { kind: 'generic', detail: error.detail };
}

export interface ChangeState {
  change: ChangeResult | null;
  status: ChangeStatus;
  error: ChangeError | null;
  elapsed: number;
  retry: () => void;
}

/** Carga genérica de un `ChangeResult`: sirve igual para el browse y para la lupa calibrada. */
function useLoad<Q extends { stack: string }>(
  query: Q | null,
  key: string,
  run: (query: Q, signal: AbortSignal) => Promise<ChangeResult>,
  keepWhileLoading: boolean,
): ChangeState {
  const [change, setChange] = useState<ChangeResult | null>(null);
  const [status, setStatus] = useState<ChangeStatus>('idle');
  const [error, setError] = useState<ChangeError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const elapsed = useElapsed(status === 'loading');

  useEffect(() => {
    if (!query) {
      setChange(null);
      setStatus('idle');
      setError(null);
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    setError(null);
    // Una pila distinta no debe dejar ver capas de otra; la misma pila conserva las suyas mientras carga.
    setChange((current) => (keepWhileLoading && current && current.stack === query.stack ? current : null));
    run(query, controller.signal)
      .then((result) => {
        setChange(result);
        setStatus('ready');
      })
      .catch((failure: unknown) => {
        if (isAbort(failure)) return;
        setError(classifyError(failure));
        setStatus('error');
      });
    return () => controller.abort();
    // `key` resume la consulta: evita reiniciar la petición por un objeto nuevo con los mismos valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { change, status, error, elapsed, retry };
}

export function useChange(query: ChangeQuery | null): ChangeState {
  const key = query ? `${query.stack}|${query.before}|${query.after}|${query.aoi?.join(',') ?? ''}` : '';
  return useLoad(query, key, (q, signal) => api.change(q, signal), true);
}

export interface ZoomQuery extends ZoomWindow {
  stack: string;
  before: string;
  after: string;
}

/** Lupa calibrada: γ⁰ en dB reales a 30 m en una ventana de 10 a 20 km. */
export function useZoom(query: ZoomQuery | null): ChangeState {
  const key = query ? `${query.stack}|${query.before}|${query.after}|${query.lon}|${query.lat}|${query.size_km}` : '';
  return useLoad(
    query,
    key,
    (q, signal) =>
      api.zoom(
        { stack: q.stack, before: q.before, after: q.after, lon: q.lon, lat: q.lat, size_km: q.size_km },
        signal,
      ),
    false,
  );
}
