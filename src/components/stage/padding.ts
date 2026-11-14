// Margen de cámara: el área del mapa que no tapan los paneles flotantes.
import type { PaddingOptions } from 'maplibre-gl';

export const MOBILE_QUERY = '(max-width: 720px)';

/**
 * Lee del DOM los paneles marcados con `data-cubre` (left, right, top, bottom, hoja) y devuelve
 * cuánto espacio le quitan al mapa. En celular solo cuentan la hoja inferior y lo que se marque `top`.
 */
export function coverPadding(container: HTMLElement): PaddingOptions {
  const box = container.getBoundingClientRect();
  const mobile = window.matchMedia(MOBILE_QUERY).matches;
  const padding = { top: mobile ? 108 : 68, left: 0, right: 0, bottom: 0 };
  document.querySelectorAll<HTMLElement>('[data-cubre]').forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const side = element.dataset.cubre;
    if (side === 'top') padding.top = Math.max(padding.top, rect.bottom - box.top + 12);
    if (mobile) {
      if (side === 'hoja') {
        // La hoja anima su altura: se cuenta la altura a la que va (la de su estilo), no la de este instante.
        const target = Number.parseFloat(element.style.height);
        const top = Number.isFinite(target) ? rect.bottom - target : rect.top;
        padding.bottom = Math.max(padding.bottom, box.bottom - top + 8);
      }
      return;
    }
    if (side === 'left') padding.left = Math.max(padding.left, rect.right - box.left + 16);
    if (side === 'right') padding.right = Math.max(padding.right, box.right - rect.left + 16);
    if (side === 'bottom') padding.bottom = Math.max(padding.bottom, box.bottom - rect.top + 12);
  });
  return padding;
}

/** Zoom del globo de portada para que ocupe cerca del 85 % de la altura libre. */
export function coverZoom(container: HTMLElement, padding: PaddingOptions): number {
  const height = container.clientHeight - (padding.top ?? 0) - (padding.bottom ?? 0);
  const width = container.clientWidth - (padding.left ?? 0) - (padding.right ?? 0);
  const diameter = 0.88 * Math.min(height, width);
  const zoom = Math.log2((Math.max(diameter, 200) * Math.PI) / 512);
  return Math.min(3, Math.max(1, zoom));
}
