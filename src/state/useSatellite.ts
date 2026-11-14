// Órbita de NISAR para mostrar dónde está ahora: el servidor da el TLE y aquí se prepara el modelo.
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api, isAbort } from '../api';
import { makeOrbit } from '../lib/orbit';
import type { Orbit } from '../lib/orbit';
import type { SatelliteTle } from '../types';

/** Los elementos orbitales cambian varias veces al día: se vuelven a pedir cada tres horas. */
const REFRESH_MS = 3 * 60 * 60 * 1000;

export type SatelliteLoad =
  | { status: 'loading' }
  | { status: 'error'; detail: string }
  | { status: 'ready'; orbit: Orbit; tle: SatelliteTle };

export interface Satellite {
  state: SatelliteLoad;
  reload: () => void;
}

export function useSatellite(enabled: boolean): Satellite {
  const [state, setState] = useState<SatelliteLoad>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    api
      .satellite(controller.signal)
      .then((tle) => {
        const orbit = makeOrbit(tle.line1, tle.line2);
        setState(orbit ? { status: 'ready', orbit, tle } : { status: 'error', detail: '' });
      })
      .catch((error: unknown) => {
        if (isAbort(error)) return;
        // Una actualización fallida no borra la órbita que ya se está mostrando.
        setState((current) =>
          current.status === 'ready' ? current : { status: 'error', detail: error instanceof ApiError ? error.detail : '' },
        );
      });
    const timer = window.setInterval(() => setAttempt((value) => value + 1), REFRESH_MS);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [enabled, attempt]);

  const reload = useCallback(() => {
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    setAttempt((value) => value + 1);
  }, []);

  return { state, reload };
}

/** Reloj que avanza cada segundo mientras `running`: mueve las cifras de la ficha del satélite. */
export function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return now;
}
