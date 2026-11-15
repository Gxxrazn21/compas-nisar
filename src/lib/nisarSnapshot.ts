// Foto del modelo en 3D para la marca del mapa. three.js se descarga y el modelo se dibuja una
// sola vez, cuando el navegador está libre; si no hay WebGL, la promesa falla y la marca se queda
// con el plano en 2D.
import type { Snapshot } from './nisar3d';

let cached: Promise<Snapshot> | null = null;

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => resolve(), { timeout: 1500 });
    else window.setTimeout(resolve, 200);
  });
}

export function nisarSnapshot(): Promise<Snapshot> {
  cached ??= whenIdle()
    .then(() => import('./nisar3d'))
    .then((module) => module.renderSnapshot(384));
  // Un fallo no se guarda: la próxima vez se vuelve a intentar.
  cached.catch(() => {
    cached = null;
  });
  return cached;
}
