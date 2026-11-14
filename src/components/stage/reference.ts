// Referencia geográfica sobre el mapa: fronteras, límites internos y nombres con su punto.
// Los datos son de Natural Earth y viven en el proyecto (public/ref, ver scripts/build_reference.py):
// cargan al instante y no dependen de un servicio de teselas. Los rótulos se dibujan en un lienzo
// con las tipografías de la aplicación, porque el estilo del mapa no trae tipografías vectoriales.
import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl';
import type { Lang } from '../../types';

export interface Reference {
  borders: boolean;
  names: boolean;
}

const BORDERS = 'ref-fronteras';
const DIVISIONS = 'ref-divisiones';
const NAMES = 'ref-nombres';
/** Zoom desde el que se piden y dibujan los límites internos (el archivo pesa unos 3 MB). */
const DIVISIONS_MIN_ZOOM = 3;

const BORDER_LAYERS = ['ref-division', 'ref-frontera-sombra', 'ref-frontera', 'ref-frontera-disputa'];
const NAME_LAYERS = ['ref-ciudad', 'ref-division-nombre', 'ref-pais'];
/** De abajo arriba: van sobre las imágenes de datos y bajo la huella y los eventos. */
export const REFERENCE_LAYERS = [...BORDER_LAYERS, ...NAME_LAYERS];

const PAPEL = '#f2efe6';
const NOCHE = '#0a1626';
const LABEL = /^rot\|([pdc])\|(.+)$/s;
const RATIO = 2;

type Kind = 'p' | 'd' | 'c';

const LABEL_STYLE: Record<Kind, { font: string; size: number; dot: number; alpha: number }> = {
  p: { font: '600 SIZEpx "Bodoni Moda Variable", "Bodoni Moda", Didot, serif', size: 17, dot: 3.2, alpha: 1 },
  d: { font: '500 SIZEpx "IBM Plex Sans Condensed", "IBM Plex Sans", system-ui, sans-serif', size: 13, dot: 0, alpha: 0.86 },
  c: { font: '500 SIZEpx "IBM Plex Sans", system-ui, sans-serif', size: 13, dot: 2.4, alpha: 0.95 },
};

/** Separación entre el borde de la imagen y el centro del punto, en píxeles de pantalla. */
const DOT_INSET = 6;

/** Dibuja un rótulo (punto y nombre) con contorno azul noche para que se lea sobre cualquier imagen. */
export function labelImage(kind: Kind, text: string): { width: number; height: number; data: Uint8ClampedArray } | null {
  const style = LABEL_STYLE[kind];
  const font = style.font.replace('SIZE', String(style.size));
  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d');
  if (!measure) return null;
  measure.font = font;
  const textWidth = Math.ceil(measure.measureText(text).width);
  const textLeft = style.dot ? DOT_INSET * 2 + 2 : 4;
  const width = textLeft + textWidth + 5;
  const height = Math.ceil(style.size * 1.5);
  canvas.width = width * RATIO;
  canvas.height = height * RATIO;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.scale(RATIO, RATIO);
  context.font = font;
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.globalAlpha = style.alpha;
  if (style.dot) {
    context.beginPath();
    context.arc(DOT_INSET, height / 2, style.dot, 0, Math.PI * 2);
    context.fillStyle = PAPEL;
    context.fill();
    context.lineWidth = 1.6;
    context.strokeStyle = NOCHE;
    context.stroke();
  }
  context.lineWidth = 3.4;
  context.strokeStyle = 'rgba(10, 22, 38, 0.9)';
  context.strokeText(text, textLeft, height / 2 + 0.5);
  context.fillStyle = PAPEL;
  context.fillText(text, textLeft, height / 2 + 0.5);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return { width: image.width, height: image.height, data: image.data };
}

const READY = new WeakSet<MapLibreMap>();

/** Atiende los rótulos que el mapa pide por primera vez (`rot|<clase>|<nombre>`). */
function installLabelImages(map: MapLibreMap) {
  if (READY.has(map)) return;
  READY.add(map);
  map.on('styleimagemissing', (event) => {
    const match = LABEL.exec(event.id);
    if (!match || map.hasImage(event.id)) return;
    const image = labelImage(match[1] as Kind, match[2] as string);
    if (image) map.addImage(event.id, image, { pixelRatio: RATIO });
  });
}

/** Las tipografías deben estar cargadas antes de dibujar: un rótulo se pinta una sola vez. */
function fontsReady(): Promise<unknown> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  const wanted = (Object.keys(LABEL_STYLE) as Kind[]).map((kind) =>
    document.fonts.load(LABEL_STYLE[kind].font.replace('SIZE', String(LABEL_STYLE[kind].size))),
  );
  // Sin red para las tipografías, se dibuja con la de respaldo antes que no rotular.
  return Promise.race([Promise.all(wanted), new Promise((resolve) => setTimeout(resolve, 2500))]).catch(() => undefined);
}

function labelIcon(kind: Kind, lang: Lang): ExpressionSpecification {
  return ['concat', `rot|${kind}|`, ['get', lang]];
}

const visible = (on: boolean) => (on ? 'visible' : 'none');
const byZoom: ExpressionSpecification = ['<=', ['get', 'z'], ['zoom']];

function addBorders(map: MapLibreMap, state: Reference) {
  if (map.getSource(BORDERS)) return;
  map.addSource(BORDERS, { type: 'geojson', data: '/ref/fronteras.json', maxzoom: 9, tolerance: 0.5 });
  const layout = { visibility: visible(state.borders), 'line-join': 'round', 'line-cap': 'round' } as const;
  map.addLayer({
    id: 'ref-frontera-sombra',
    type: 'line',
    source: BORDERS,
    layout,
    paint: {
      'line-color': NOCHE,
      'line-opacity': 0.55,
      'line-width': ['interpolate', ['linear'], ['zoom'], 1, 2, 6, 3.4, 10, 4.4],
    },
  });
  map.addLayer({
    id: 'ref-frontera',
    type: 'line',
    source: BORDERS,
    filter: ['==', ['get', 'k'], 'p'],
    layout,
    paint: {
      'line-color': PAPEL,
      'line-opacity': 0.82,
      'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.7, 6, 1.4, 10, 2],
    },
  });
  map.addLayer({
    id: 'ref-frontera-disputa',
    type: 'line',
    source: BORDERS,
    filter: ['==', ['get', 'k'], 'x'],
    layout: { visibility: visible(state.borders) },
    paint: {
      'line-color': PAPEL,
      'line-opacity': 0.7,
      'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.7, 6, 1.3, 10, 1.8],
      'line-dasharray': [2.5, 2.5],
    },
  });
}

function addDivisions(map: MapLibreMap, state: Reference) {
  if (map.getSource(DIVISIONS)) return;
  map.addSource(DIVISIONS, { type: 'geojson', data: '/ref/divisiones.json', maxzoom: 9, tolerance: 0.6 });
  map.addLayer(
    {
      id: 'ref-division',
      type: 'line',
      source: DIVISIONS,
      minzoom: DIVISIONS_MIN_ZOOM,
      filter: byZoom,
      layout: { visibility: visible(state.borders) },
      paint: {
        'line-color': PAPEL,
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 6, 0.5],
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 7, 0.9, 10, 1.3],
        'line-dasharray': [3, 2],
      },
    },
    // Bajo las fronteras de país, que mandan.
    map.getLayer('ref-frontera-sombra') ? 'ref-frontera-sombra' : undefined,
  );
}

function addNames(map: MapLibreMap, state: Reference, lang: Lang) {
  if (map.getSource(NAMES)) return;
  map.addSource(NAMES, { type: 'geojson', data: '/ref/nombres.json', maxzoom: 8 });
  const symbol = (id: string, kind: Kind, extra: { minzoom?: number; maxzoom?: number; centered?: boolean; padding: number }) =>
    map.addLayer({
      id,
      type: 'symbol',
      source: NAMES,
      ...(extra.minzoom !== undefined ? { minzoom: extra.minzoom } : {}),
      ...(extra.maxzoom !== undefined ? { maxzoom: extra.maxzoom } : {}),
      filter: ['all', ['==', ['get', 'k'], kind], byZoom],
      layout: {
        visibility: visible(state.names),
        'icon-image': labelIcon(kind, lang),
        'icon-anchor': extra.centered ? 'center' : 'left',
        // El punto del rótulo, no su borde, cae sobre la coordenada.
        'icon-offset': extra.centered ? [0, 0] : [-DOT_INSET, 0],
        'icon-padding': extra.padding,
        'symbol-sort-key': ['get', 'r'],
      },
    });
  // El orden decide quién gana el sitio cuando chocan: primero países, luego divisiones y ciudades.
  symbol('ref-ciudad', 'c', { minzoom: 3, padding: 6 });
  symbol('ref-division-nombre', 'd', { minzoom: 3, centered: true, padding: 8 });
  symbol('ref-pais', 'p', { maxzoom: 8, padding: 10 });
}

interface Entry {
  state: Reference;
  lang: Lang;
  onZoom: (() => void) | null;
}

const ENTRIES = new WeakMap<MapLibreMap, Entry>();

/**
 * Enciende, apaga o cambia de idioma la referencia. Cada archivo se pide la primera vez que hace
 * falta: con todo apagado, el mapa no descarga nada.
 */
export function setReference(map: MapLibreMap, state: Reference, lang: Lang) {
  const previous = ENTRIES.get(map);
  const entry: Entry = { state, lang, onZoom: previous?.onZoom ?? null };
  ENTRIES.set(map, entry);

  if (state.borders) {
    addBorders(map, state);
    if (map.getZoom() >= DIVISIONS_MIN_ZOOM) addDivisions(map, state);
    else if (!map.getSource(DIVISIONS) && !entry.onZoom) {
      const onZoom = () => {
        const current = ENTRIES.get(map);
        if (!current?.state.borders || map.getZoom() < DIVISIONS_MIN_ZOOM || !map.getStyle()) return;
        map.off('zoom', onZoom);
        current.onZoom = null;
        addDivisions(map, current.state);
        raiseReference(map);
      };
      entry.onZoom = onZoom;
      map.on('zoom', onZoom);
    }
  }
  for (const id of BORDER_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible(state.borders));
  }

  if (state.names && !map.getSource(NAMES)) {
    installLabelImages(map);
    void fontsReady().then(() => {
      const current = ENTRIES.get(map);
      if (!current || !map.getStyle()) return;
      addNames(map, current.state, current.lang);
      raiseReference(map);
    });
  }
  const kinds: Kind[] = ['c', 'd', 'p'];
  NAME_LAYERS.forEach((id, index) => {
    if (!map.getLayer(id)) return;
    map.setLayoutProperty(id, 'visibility', visible(state.names));
    if (previous?.lang !== lang) map.setLayoutProperty(id, 'icon-image', labelIcon(kinds[index] as Kind, lang));
  });
}

/** Capas de referencia que ya existen, en el orden en que deben subir. */
function raiseReference(map: MapLibreMap) {
  const top = map.getLayer('huella-relleno') ? 'huella-relleno' : undefined;
  for (const id of REFERENCE_LAYERS) if (map.getLayer(id)) map.moveLayer(id, top);
}
