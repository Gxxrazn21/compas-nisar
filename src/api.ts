// Cliente tipado de la API (docs/contrato-api.md). Todas las rutas son relativas:
// en desarrollo Vite las pasa al backend y en producción el backend sirve la app.
import type {
  Bounds,
  ChangeResult,
  EarthToday,
  Health,
  Interferogram,
  NaturalEvent,
  Place,
  ProbeResult,
  SatelliteTle,
  SeriesResult,
  Stack,
  StacksResult,
  Story,
  UrgentScene,
} from './types';

/** Error de la API con su código HTTP. `status` 0 = no hubo respuesta (red caída). */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

type Params = Record<string, string | number | undefined>;

export function buildUrl(path: string, params: Params = {}): string {
  const query = Object.entries(params)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return query ? `${path}?${query}` : path;
}

export function aoiParam(aoi: Bounds | null | undefined): string | undefined {
  return aoi ? aoi.map((value) => Number(value.toFixed(5))).join(',') : undefined;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    // El backend redacta los mensajes de error en el idioma de la interfaz (inglés si no se indica).
    const lang = typeof document !== 'undefined' && document.documentElement.lang === 'es' ? 'es' : 'en';
    response = await fetch(url, { signal, headers: { Accept: 'application/json', 'Accept-Language': lang } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, '');
  }
  if (!response.ok) {
    let detail = '';
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
        detail = body.detail;
      }
    } catch {
      // Cuerpo sin JSON: basta con el código.
    }
    throw new ApiError(response.status, detail);
  }
  return (await response.json()) as T;
}

// Caché de respuestas en memoria: volver a una historia o a un par de fechas es instantáneo.
// Solo se guardan las respuestas correctas; una petición abortada no deja rastro.
const memory = new Map<string, Promise<unknown>>();
const ttlMemory = new Map<string, { expires: number; promise: Promise<unknown> }>();

function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Abortado', 'AbortError'));
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

function cached<T>(url: string, signal?: AbortSignal): Promise<T> {
  const hit = memory.get(url);
  if (hit) return withAbort(hit as Promise<T>, signal);
  // La petición compartida no se ata a la señal de un solo componente.
  const promise = getJson<T>(url);
  memory.set(url, promise);
  promise.catch(() => memory.delete(url));
  return withAbort(promise, signal);
}

function cachedTtl<T>(url: string, ttlMs: number, signal?: AbortSignal): Promise<T> {
  const now = Date.now();
  const hit = ttlMemory.get(url);
  if (hit && hit.expires > now) return withAbort(hit.promise as Promise<T>, signal);
  const promise = getJson<T>(url);
  ttlMemory.set(url, { expires: now + ttlMs, promise });
  promise.catch(() => {
    if (ttlMemory.get(url)?.promise === promise) ttlMemory.delete(url);
  });
  return withAbort(promise, signal);
}

export const api = {
  stories: (signal?: AbortSignal) =>
    cached<{ stories: Story[] }>('/api/stories', signal).then((body) => body.stories),

  stack: (id: string, signal?: AbortSignal) =>
    cached<Stack>(`/api/stack/${encodeURIComponent(id)}`, signal),

  change: (
    query: { stack: string; before: string; after: string; aoi?: Bounds | null },
    signal?: AbortSignal,
  ) =>
    cached<ChangeResult>(
      buildUrl('/api/change', {
        stack: query.stack,
        before: query.before,
        after: query.after,
        aoi: aoiParam(query.aoi),
      }),
      signal,
    ),

  health: (signal?: AbortSignal) => cached<Health>('/api/health', signal),

  stacks: (lon: number, lat: number, signal?: AbortSignal) =>
    cached<StacksResult>(buildUrl('/api/stacks', { lon: lon.toFixed(4), lat: lat.toFixed(4) }), signal),

  /** Lupa calibrada: misma forma que `change`, con `source: "gcov"`. La primera vez tarda 20 a 40 s. */
  zoom: (
    query: { stack: string; before: string; after: string; lon: number; lat: number; size_km: number },
    signal?: AbortSignal,
  ) =>
    cached<ChangeResult>(
      buildUrl('/api/zoom', {
        stack: query.stack,
        before: query.before,
        after: query.after,
        lon: query.lon.toFixed(4),
        lat: query.lat.toFixed(4),
        size_km: query.size_km,
      }),
      signal,
    ),

  /** Buscador de lugares por nombre o dirección. */
  places: (query: string, lang: string, signal?: AbortSignal) =>
    cached<{ places: Place[]; source: string }>(buildUrl('/api/places', { q: query, lang }), signal).then(
      (body) => body.places,
    ),

  events: (days = 20, signal?: AbortSignal) =>
    cachedTtl<{ events: NaturalEvent[]; source: string; stale?: boolean }>(buildUrl('/api/events', { days }), 120_000, signal),

  urgent: (limit = 30, signal?: AbortSignal) =>
    cachedTtl<{ scenes: UrgentScene[] }>(buildUrl('/api/urgent', { limit }), 120_000, signal).then((body) => body.scenes),

  interferograms: (lon: number, lat: number, limit: number, signal?: AbortSignal) =>
    cached<{ items: Interferogram[] }>(
      buildUrl('/api/interferograms', { lon: lon.toFixed(4), lat: lat.toFixed(4), limit }),
      signal,
    ).then((body) => body.items),

  probe: (change: string, lon: number, lat: number, signal?: AbortSignal) =>
    cached<ProbeResult>(
      buildUrl('/api/probe', { change, lon: lon.toFixed(5), lat: lat.toFixed(5) }),
      signal,
    ),

  series: (
    query: { stack: string; lon: number; lat: number; max?: number; aoi?: Bounds | null },
    signal?: AbortSignal,
  ) =>
    cached<SeriesResult>(
      buildUrl('/api/series', {
        stack: query.stack,
        lon: query.lon.toFixed(4),
        lat: query.lat.toFixed(4),
        max: query.max ?? 12,
        aoi: aoiParam(query.aoi),
      }),
      signal,
    ),

  earthToday: (signal?: AbortSignal) => cached<EarthToday>('/api/earth-today', signal),

  /** Elementos orbitales de NISAR: con ellos el navegador calcula dónde está el satélite. */
  satellite: (signal?: AbortSignal) => cachedTtl<SatelliteTle>('/api/satellite', 600_000, signal),
};

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
