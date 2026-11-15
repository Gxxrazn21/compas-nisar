// NISAR en vivo sobre el mapa: el modelo a escala que se mueve con el satélite, la traza de su
// recorrido y la franja del suelo que su radar alcanza a ver.
import maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { BOX, modelSize, nisarSvg, roundMagnification } from '../../lib/nisarModel';
import { nisarSnapshot } from '../../lib/nisarSnapshot';
import { groundTrack, periodMinutes, stateAt, swathAt, swathRibbon, unwrapLon } from '../../lib/orbit';
import type { Orbit } from '../../lib/orbit';
import type { LonLat } from '../../types';

const SOURCE = 'satelite-traza';
const SWATH = 'satelite-franja';
export const SATELLITE_LAYERS = [
  `${SWATH}-banda`,
  `${SOURCE}-pasada`,
  `${SOURCE}-futura`,
  `${SWATH}-mirada`,
  `${SWATH}-haz`,
];

/** Minutos de recorrido ya hecho que se dibujan detrás del satélite. */
export const PAST_MINUTES = 25;
/** La marca y el haz se mueven varias veces por segundo; la traza y la banda, cada diez segundos. */
const MOVE_MS = 200;
const TRACK_REFRESH_MS = 10000;
/** Lado mínimo del modelo en pantalla: por debajo, la antena y los paneles dejan de distinguirse. */
const MIN_MODEL_PX = 92;
/** La foto del modelo en 3D tiene más detalle y pide algo más de tamaño. */
const MIN_PHOTO_PX = 124;
/** Metros de un paso de 0,01° de latitud: con él se mide la escala del mapa donde está el satélite. */
const PROBE_DEG = 0.01;
const PROBE_M = 1111.95;

export interface SatelliteLabels {
  /** Nombre accesible de la marca. */
  marker: string;
  /** Texto bajo el nombre según la ampliación: `null` cuando el modelo va a tamaño real. */
  scale: (magnification: number | null) => string;
}

interface MarkerParts {
  element: HTMLElement;
  model: HTMLElement;
  scale: HTMLElement;
}

function markerElement(label: string): MarkerParts {
  const element = document.createElement('div');
  element.className = 'satelite-marca';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', label);
  element.innerHTML =
    '<span class="satelite-pulso"></span>' +
    `<span class="satelite-modelo">${nisarSvg()}</span>` +
    '<span class="satelite-rotulo"><span class="satelite-nombre">NISAR</span><span class="satelite-escala"></span></span>';
  return {
    element,
    model: element.querySelector<HTMLElement>('.satelite-modelo')!,
    scale: element.querySelector<HTMLElement>('.satelite-escala')!,
  };
}

function line(kind: string, coordinates: LonLat[]) {
  return { type: 'Feature' as const, properties: { kind }, geometry: { type: 'LineString' as const, coordinates } };
}

const EMPTY = { type: 'FeatureCollection' as const, features: [] };

function install(map: MapLibreMap) {
  if (map.getSource(SOURCE)) return;
  map.addSource(SOURCE, { type: 'geojson', data: EMPTY });
  map.addSource(SWATH, { type: 'geojson', data: EMPTY });
  map.addSource(`${SWATH}-ahora`, { type: 'geojson', data: EMPTY });
  // Banda que el radar alcanzó a ver en los últimos minutos: a escala real sobre el mapa.
  map.addLayer({
    id: `${SWATH}-banda`,
    type: 'fill',
    source: SWATH,
    paint: { 'fill-color': '#e8b84a', 'fill-opacity': 0.16, 'fill-antialias': false },
  });
  map.addLayer({
    id: `${SOURCE}-pasada`,
    type: 'line',
    source: SOURCE,
    filter: ['==', ['get', 'kind'], 'past'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#f2efe6', 'line-width': 2, 'line-opacity': 0.45 },
  });
  map.addLayer({
    id: `${SOURCE}-futura`,
    type: 'line',
    source: SOURCE,
    filter: ['==', ['get', 'kind'], 'future'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#e8b84a', 'line-width': 2.4, 'line-dasharray': [1.5, 2] },
  });
  // Del satélite al borde cercano de la franja: el radar mira de lado, no hacia abajo.
  map.addLayer({
    id: `${SWATH}-mirada`,
    type: 'line',
    source: `${SWATH}-ahora`,
    filter: ['==', ['get', 'kind'], 'look'],
    paint: { 'line-color': '#f2efe6', 'line-width': 1.2, 'line-opacity': 0.6, 'line-dasharray': [1, 2.5] },
  });
  // La línea del suelo que el radar ilumina en este instante.
  map.addLayer({
    id: `${SWATH}-haz`,
    type: 'line',
    source: `${SWATH}-ahora`,
    filter: ['==', ['get', 'kind'], 'beam'],
    layout: { 'line-cap': 'round' },
    paint: { 'line-color': '#e8b84a', 'line-width': 3.2 },
  });
}

function setData(map: MapLibreMap, source: string, features: unknown[]) {
  (map.getSource(source) as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features } as never);
}

/**
 * Pone a NISAR en el mapa y lo mantiene al día: el modelo y el haz varias veces por segundo; la traza
 * (los últimos 25 minutos y la próxima vuelta) y la banda observada cada dos segundos.
 * Devuelve la función que lo retira.
 */
export function trackSatellite(map: MapLibreMap, orbit: Orbit, labels: SatelliteLabels): () => void {
  install(map);
  const parts = markerElement(labels.marker);
  const marker = new maplibregl.Marker({ element: parts.element });
  let placed = false;
  let position: LonLat | null = null;
  let shownSize = 0;
  let shownScale = '';
  let removed = false;
  // Qué imagen lleva la marca: metros que abarca, proporción y dónde cae el centro del bus dentro de ella.
  let image = { spanM: BOX.width as number, aspect: BOX.height / BOX.width, originX: -BOX.x / BOX.width, originY: -BOX.y / BOX.height, minPx: MIN_MODEL_PX };

  // El modelo se dibuja a la escala del mapa en ese punto, ampliado solo lo necesario para verse.
  const resize = () => {
    if (!position) return;
    const here = map.project(position);
    const north = map.project([position[0], Math.min(position[1] + PROBE_DEG, 89.99)]);
    const pixels = Math.hypot(north.x - here.x, north.y - here.y);
    const { px, magnification } = modelSize(pixels > 0 ? PROBE_M / pixels : 0, image.minPx, image.spanM);
    const size = Math.round(Math.min(px, 4096));
    if (size !== shownSize) {
      shownSize = size;
      const tall = size * image.aspect;
      parts.model.style.width = `${size}px`;
      parts.model.style.height = `${tall}px`;
      parts.model.style.left = `${-image.originX * size}px`;
      parts.model.style.top = `${-image.originY * tall}px`;
      parts.element.style.setProperty('--pie', `${(1 - image.originY) * tall}px`);
      parts.element.classList.toggle('grande', size >= 220);
    }
    const text = labels.scale(magnification > 1 && Number.isFinite(magnification) ? roundMagnification(magnification) : null);
    if (text !== shownScale) {
      shownScale = text;
      parts.scale.textContent = text;
    }
  };

  const move = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const now = new Date();
    const state = stateAt(orbit, now);
    if (!state) return;
    position = [state.lon, state.lat];
    marker.setLngLat(position);
    if (!placed) {
      marker.addTo(map);
      placed = true;
    }
    resize();
    const swath = swathAt(orbit, now);
    if (!swath) return;
    const near: LonLat = [unwrapLon(swath.near[0], state.lon), swath.near[1]];
    const far: LonLat = [unwrapLon(swath.far[0], near[0]), swath.far[1]];
    setData(map, `${SWATH}-ahora`, [line('look', [position, near]), line('beam', [near, far])]);
  };

  const draw = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const now = Date.now();
    const from = now - PAST_MINUTES * 60_000;
    setData(map, SOURCE, [
      ...groundTrack(orbit, from, now).map((part) => line('past', part)),
      ...groundTrack(orbit, now, now + periodMinutes(orbit) * 60_000).map((part) => line('future', part)),
    ]);
    const ring = swathRibbon(orbit, from, now);
    setData(map, SWATH, ring.length ? [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }] : []);
  };

  // Cuando el modelo en 3D está listo, su foto reemplaza al plano.
  nisarSnapshot()
    .then((photo) => {
      if (removed) return;
      const picture = document.createElement('img');
      picture.src = photo.url;
      picture.alt = '';
      picture.draggable = false;
      picture.decoding = 'async';
      parts.model.replaceChildren(picture);
      parts.model.classList.add('foto');
      image = { spanM: photo.spanM, aspect: 1, originX: photo.anchor[0], originY: photo.anchor[1], minPx: MIN_PHOTO_PX };
      shownSize = 0;
      resize();
    })
    .catch(() => undefined);

  move();
  draw();
  map.on('zoom', resize);
  map.on('moveend', resize);
  const moving = window.setInterval(move, MOVE_MS);
  const drawing = window.setInterval(draw, TRACK_REFRESH_MS);
  return () => {
    removed = true;
    window.clearInterval(moving);
    window.clearInterval(drawing);
    map.off('zoom', resize);
    map.off('moveend', resize);
    marker.remove();
    if (map.getStyle()) {
      for (const source of [SOURCE, SWATH, `${SWATH}-ahora`]) setData(map, source, []);
    }
  };
}
