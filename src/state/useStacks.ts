// Pilas de NISAR que cubren un punto (modo Explorar).
import { useEffect, useState } from 'react';
import { ApiError, api, isAbort } from '../api';
import type { LonLat, Stack } from '../types';

export type StacksState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; detail: string }
  | { status: 'ready'; stacks: Stack[] };

export function useStacks(point: LonLat | null, enabled: boolean): StacksState {
  const [state, setState] = useState<StacksState>({ status: 'idle' });
  const lon = point?.[0];
  const lat = point?.[1];

  useEffect(() => {
    if (!enabled || lon === undefined || lat === undefined) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading' });
    api
      .stacks(lon, lat, controller.signal)
      .then((result) => setState({ status: 'ready', stacks: result.stacks }))
      .catch((error: unknown) => {
        if (isAbort(error)) return;
        // Un 404 también significa «sin datos»: se muestra el estado vacío.
        if (error instanceof ApiError && error.status === 404) setState({ status: 'ready', stacks: [] });
        else setState({ status: 'error', detail: error instanceof ApiError ? error.detail : '' });
      });
    return () => controller.abort();
  }, [lon, lat, enabled]);

  return state;
}
