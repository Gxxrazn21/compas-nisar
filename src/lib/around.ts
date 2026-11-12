// Pasadas alrededor de una fecha: la última anterior y la primera posterior, del mismo modo.
import type { Scene } from '../types';

export interface Around {
  before: string | null;
  after: string | null;
}

/**
 * Para un evento en `eventIso`, la última pasada analizable anterior y la primera posterior
 * del mismo modo de adquisición. Si el evento es posterior a la última pasada, solo hay
 * «antes»; si no hay ninguna anterior, solo «después» (o nada).
 */
export function datesAroundEvent(scenes: Scene[], eventIso: string): Around {
  const day = eventIso.slice(0, 10);
  const usable = scenes.filter((scene) => scene.analyzable).sort((a, b) => a.date.localeCompare(b.date));
  const befores = usable.filter((scene) => scene.date < day);
  const afters = usable.filter((scene) => scene.date > day);
  for (let i = befores.length - 1; i >= 0; i -= 1) {
    const before = befores[i] as Scene;
    const after = afters.find((scene) => scene.mode === before.mode);
    if (after) return { before: before.date, after: after.date };
  }
  const lastBefore = befores[befores.length - 1];
  const firstAfter = afters[0];
  if (!lastBefore && firstAfter) return { before: null, after: firstAfter.date };
  // Solo «antes» (evento posterior a la última pasada) o modos distintos a ambos lados.
  return { before: lastBefore?.date ?? null, after: null };
}

/** ¿Alguna pasada analizable queda a cada lado de la fecha, del mismo modo? */
export function hasPairAround(scenes: Scene[], eventIso: string): boolean {
  const around = datesAroundEvent(scenes, eventIso);
  return Boolean(around.before && around.after);
}
