import type { Bounds, LonLat, SeriesResult } from '../types';

export type SeriesChannel = 'hh' | 'hv';

export function targetKey(target: { stack: string; point: LonLat; aoi: Bounds | null } | null): string {
  return target ? `${target.stack}|${target.point.join(',')}|${target.aoi?.join(',') ?? ''}` : '';
}

/** Los fallos son explícitos; abortar nunca completa ni publica progreso pendiente. */
export function preloadImages(urls: string[], onProgress: (n: number) => void, signal: AbortSignal, timeoutMs = 20_000): Promise<boolean[]> {
  return new Promise((resolve, reject) => {
    const images: HTMLImageElement[] = [];
    const results = new Array<boolean>(urls.length).fill(false);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let done = 0;
    let settled = false;
    const cleanup = () => {
      signal.removeEventListener('abort', cancel);
      timers.forEach(clearTimeout);
      for (const image of images) { image.onload = null; image.onerror = null; }
    };
    const cancel = () => {
      settled = true;
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal.aborted) { cancel(); return; }
    if (!urls.length) { resolve([]); return; }
    signal.addEventListener('abort', cancel, { once: true });
    urls.forEach((url, index) => {
      const image = new Image();
      images.push(image);
      let finished = false;
      const finish = (success: boolean) => {
        if (settled || finished) return;
        finished = true;
        results[index] = success;
        done += 1;
        onProgress(done);
        if (done === urls.length) { settled = true; cleanup(); resolve(results); }
      };
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      if (!url) finish(false);
      else {
        timers.push(setTimeout(() => finish(false), timeoutMs));
        image.src = url;
      }
    });
  });
}

export function playableSeries(source: SeriesResult, channel: SeriesChannel, loaded: boolean[]): SeriesResult {
  return {
    ...source,
    frames: source.frames.flatMap((frame, index) => {
      const url = channel === 'hv' ? frame.hv_url : frame.url;
      return loaded[index] && url ? [{ ...frame, url }] : [];
    }),
  };
}
