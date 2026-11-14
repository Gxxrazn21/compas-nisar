// Preferencias de la persona que se recuerdan entre visitas: fronteras y nombres sobre el
// mapa, sonido de la partitura y pistas de uso.
import { useCallback, useState } from 'react';

export interface Prefs {
  /** Fronteras de países y límites de departamentos o estados. */
  borders: boolean;
  /** Nombres de países, divisiones y ciudades. */
  names: boolean;
  /** Las notas de la partitura suenan. */
  sound: boolean;
  /** Pistas de uso sobre el mapa. */
  hints: boolean;
}

export const DEFAULT_PREFS: Prefs = { borders: true, names: true, sound: true, hints: true };
const STORAGE_KEY = 'compas.prefs';

/** Lee las preferencias guardadas; cualquier valor ausente o extraño vuelve al de fábrica. */
export function parsePrefs(text: string | null): Prefs {
  if (!text) return DEFAULT_PREFS;
  try {
    const stored: unknown = JSON.parse(text);
    if (!stored || typeof stored !== 'object') return DEFAULT_PREFS;
    const record = stored as Record<string, unknown>;
    const next = { ...DEFAULT_PREFS };
    for (const key of Object.keys(DEFAULT_PREFS) as Array<keyof Prefs>) {
      if (typeof record[key] === 'boolean') next[key] = record[key];
    }
    return next;
  } catch {
    return DEFAULT_PREFS;
  }
}

function read(): Prefs {
  try {
    return parsePrefs(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

export interface PrefsApi {
  prefs: Prefs;
  toggle: (key: keyof Prefs) => void;
}

/** `initial` permite que un enlace permanente fije algunas preferencias sin borrar las guardadas. */
export function usePrefs(initial: Partial<Prefs> | null = null): PrefsApi {
  const [prefs, setPrefs] = useState<Prefs>(() => ({ ...read(), ...(initial ?? {}) }));

  const toggle = useCallback((key: keyof Prefs) => {
    setPrefs((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Sin almacenamiento: la elección vale solo para esta sesión.
      }
      return next;
    });
  }, []);

  return { prefs, toggle };
}
