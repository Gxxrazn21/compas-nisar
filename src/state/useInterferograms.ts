// Historia de interferogramas: pares de fechas sobre un punto y el que se muestra.
import { useEffect, useState } from 'react';
import { ApiError, api, isAbort } from '../api';
import type { Interferogram, InterferogramStory } from '../types';

export type InterferogramsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; detail: string }
  | { status: 'ready'; items: Interferogram[] };

export function useInterferograms(story: InterferogramStory | null): InterferogramsState {
  const [state, setState] = useState<InterferogramsState>({ status: 'idle' });
  const id = story?.id ?? null;
  const lon = story?.point[0];
  const lat = story?.point[1];
  const limit = story?.limit ?? 4;

  useEffect(() => {
    if (!id || lon === undefined || lat === undefined) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading' });
    api
      .interferograms(lon, lat, limit, controller.signal)
      .then((items) => setState({ status: 'ready', items }))
      .catch((error: unknown) => {
        if (!isAbort(error)) setState({ status: 'error', detail: error instanceof ApiError ? error.detail : '' });
      });
    return () => controller.abort();
  }, [id, lon, lat, limit]);

  return state;
}
