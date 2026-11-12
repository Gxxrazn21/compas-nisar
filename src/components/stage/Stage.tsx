// Escenario: el globo/mapa a toda la ventana, con las capas del cambio, la danza, la huella
// de la pila, los eventos en vivo y la imagen de un interferograma.
import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, Marker, RasterTileSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useI18n } from '../../i18n';
import type { ContextLayers } from '../../lib/context';
import type { FeatureCollection } from '../../lib/events';
import { zoomForBounds } from '../../lib/camera';
import { prefersReducedMotion } from '../../state/useElapsed';
import type { CameraTarget } from '../../state/useCompas';
import type { Bounds, ChangeResult, Corners, LonLat, MapLayer, SeriesResult } from '../../types';
import { installChange, installFrames, showFrame, showLayer } from './dataLayers';
import { baseStyle, gibsTiles } from './mapStyle';
import {
  CLUSTERS,
  EVENTS,
  URGENT,
  expandCluster,
  featureAt,
  installOverlays,
  setContext,
  setEvents,
  setFootprint,
  setOverlayImage,
  setOverlayOpacity,
  setUrgent,
} from './overlays';
import { coverPadding, coverZoom } from './padding';
import { SwipeOverlay } from './SwipeOverlay';

export interface StageApi {
  zoomIn: () => void;
  zoomOut: () => void;
  /** Centro del mapa visible (sin lo que tapan los paneles). */
  getCenter: () => LonLat | null;
  /** Caja visible del mapa, sin lo que tapan los paneles; `null` si no es una ventana válida. */
  getViewBounds: () => Bounds | null;
}

/** Datos de la sección En vivo. */
export interface LiveLayers {
  events: FeatureCollection | null;
  selectedEvent: string | null;
  urgent: FeatureCollection | null;
  selectedUrgent: string | null;
  onEvent: (id: string) => void;
  onUrgent: (id: string) => void;
}

interface Props {
  projection: 'globe' | 'mercator';
  camera: CameraTarget;
  change: ChangeResult | null;
  layer: MapLayer;
  opacity: number;
  series: SeriesResult | null;
  danceIndex: number | null;
  probePoint: LonLat | null;
  probing: boolean;
  onProbe: (lon: number, lat: number) => void;
  /** Explorar sin pila elegida: un clic elige el punto. */
  picking: boolean;
  onPick: (lon: number, lat: number) => void;
  explorePoint: LonLat | null;
  footprint: LonLat[] | null;
  live: LiveLayers | null;
  overlay: { url: string; coordinates: Corners } | null;
  /** Fecha del mapa óptico del día; `null` deja el satélite de siempre. */
  opticalDate: string | null;
  /** Capas de contexto de GIBS encendidas y fecha que pide la de Sentinel-1. */
  context: ContextLayers;
  contextDate: string;
  apiRef: RefObject<StageApi | null>;
}

const SPIN_DEGREES = 30;
const SPIN_MS = 14000;

function markerElement(label: string, className: string): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', label);
  return element;
}

export function Stage(props: Props) {
  const { projection, camera, change, layer, opacity, series, danceIndex, probePoint, probing } = props;
  const { t } = useI18n();
  const hostRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [flying, setFlying] = useState(false);
  const spinning = useRef(false);
  const markerRef = useRef<Marker | null>(null);
  const pointRef = useRef<Marker | null>(null);
  const live = useRef(props);
  live.current = props;
  const firstCamera = useRef(camera);
  const firstOptical = useRef(props.opticalDate);

  // Creación única del mapa.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const start = firstCamera.current;
    const padding = coverPadding(host);
    const instance = new maplibregl.Map({
      container: host,
      style: baseStyle(projection, firstOptical.current ?? undefined),
      center: start.kind === 'view' ? start.center : [-30, 14],
      zoom: start.kind === 'view' ? start.zoom : coverZoom(host, padding),
      attributionControl: false,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      canvasContextAttributes: { antialias: true },
    });
    instance.setPadding(padding);
    instance.touchZoomRotate.disableRotation();
    instance.keyboard.disableRotation();
    const stopSpin = () => {
      spinning.current = false;
    };
    instance.on('mousedown', stopSpin);
    instance.on('touchstart', stopSpin);
    instance.on('wheel', stopSpin);
    // El estilo basta para poner capas y mover la cámara: no hay que esperar a que lleguen todas las
    // teselas (con red lenta o teselas que fallan, `load` tarda y la interfaz se quedaba sin datos).
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      installOverlays(instance);
      setReady(true);
      setMap(instance);
    };
    instance.once('style.load', begin);
    instance.once('load', begin);
    instance.on('click', (event) => {
      const current = live.current;
      if (current.live) {
        const hit = featureAt(instance, event.point, [EVENTS, CLUSTERS, `${URGENT}-relleno`]);
        if (hit?.layer.id === CLUSTERS && hit.geometry.type === 'Point') {
          const clusterId = hit.properties?.cluster_id;
          if (typeof clusterId === 'number') {
            void expandCluster(instance, clusterId, hit.geometry.coordinates as [number, number]);
          }
          return;
        }
        const id = hit?.properties?.id;
        if (typeof id === 'string') {
          if (hit?.layer.id === EVENTS) current.live.onEvent(id);
          else current.live.onUrgent(id);
        }
        return;
      }
      if (current.picking) current.onPick(event.lngLat.lng, event.lngLat.lat);
      else if (current.probing) current.onProbe(event.lngLat.lng, event.lngLat.lat);
    });
    instance.on('mousemove', (event) => {
      if (!live.current.live) return;
      const hit = featureAt(instance, event.point, [EVENTS, CLUSTERS, `${URGENT}-relleno`]);
      instance.getCanvas().style.cursor = hit ? 'pointer' : '';
    });
    instance.on('error', (event) => {
      // Las teselas de contexto de GIBS fallan a veces (500 o fechas sin datos): no es un error de la aplicación.
      const sourceId = (event as { sourceId?: unknown }).sourceId;
      if (typeof sourceId === 'string' && sourceId.startsWith('contexto-')) return;
      console.error('mapa:', event.error?.message ?? event);
    });
    return () => {
      markerRef.current?.remove();
      pointRef.current?.remove();
      instance.remove();
      setMap(null);
      setReady(false);
    };
  }, [projection]);

  // Cámara: portada con giro lento, o vuelo al lugar de la historia.
  const handled = useRef(-1);
  useEffect(() => {
    const host = hostRef.current;
    if (!map || !host || handled.current === camera.nonce) return;
    const isFirst = handled.current === -1;
    handled.current = camera.nonce;
    spinning.current = false;
    map.stop();
    const padding = coverPadding(host);
    const reduced = prefersReducedMotion();

    if (camera.kind === 'cover') {
      setFlying(false);
      const zoom = coverZoom(host, padding);
      if (reduced) {
        map.jumpTo({ center: [-30, 14], zoom, padding });
        return;
      }
      spinning.current = true;
      const spin = (first: boolean) => {
        if (!spinning.current) return;
        const center = map.getCenter();
        map.easeTo({
          center: [center.lng + SPIN_DEGREES, first ? 14 : center.lat],
          zoom: first ? zoom : map.getZoom(),
          padding: first ? padding : map.getPadding(),
          duration: first ? 3000 : SPIN_MS,
          easing: first ? (x) => 1 - (1 - x) ** 2 : (x) => x,
          essential: true,
        });
      };
      const onEnd = () => spin(false);
      map.on('moveend', onEnd);
      spin(!isFirst);
      return () => {
        map.off('moveend', onEnd);
      };
    }

    // Con `fit`, el zoom sale del espacio que de verdad queda libre (el celular tiene mucho menos).
    let zoom = camera.zoom;
    if (camera.fit) {
      const width = host.clientWidth - (padding.left ?? 0) - (padding.right ?? 0);
      const height = host.clientHeight - (padding.top ?? 0) - (padding.bottom ?? 0);
      zoom = Math.min(9, zoomForBounds(camera.fit, Math.max(width, 120), Math.max(height, 120), 0.92));
    }

    if (camera.instant || reduced) {
      map.jumpTo({ center: camera.center, zoom, padding });
      setFlying(false);
      return;
    }
    setFlying(true);
    map.once('moveend', () => setFlying(false));
    map.flyTo({
      center: camera.center,
      zoom,
      padding,
      duration: camera.duration ?? 4200,
      curve: 1.6,
      essential: true,
    });
  }, [map, camera]);

  // Capas del cambio.
  const changeId = change?.id ?? null;
  const radarBelow = change?.source === 'gcov';
  useEffect(() => {
    if (!map || !ready) return;
    installChange(map, change);
    showLayer(map, layer, opacity, !flying, radarBelow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, changeId]);

  useEffect(() => {
    if (!map || !ready) return;
    const dancing = layer === 'dance';
    showLayer(map, dancing ? 'before' : layer, dancing ? 0 : opacity, !flying, radarBelow);
  }, [map, ready, layer, opacity, flying, changeId, radarBelow]);

  // Cuadros de la danza.
  const seriesKey = series ? series.frames.map((frame) => frame.url).join('|') : '';
  useEffect(() => {
    if (!map || !ready) return;
    installFrames(map, series);
    return () => {
      if (map.getStyle()) installFrames(map, null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, seriesKey]);

  useEffect(() => {
    if (!map || !ready || !series) return;
    showFrame(map, layer === 'dance' ? danceIndex : null, series.frames.length, opacity);
  }, [map, ready, series, seriesKey, layer, danceIndex, opacity]);

  // Huella de la pila elegida en Explorar.
  const footprintKey = props.footprint ? props.footprint.map((p) => p.join(',')).join(';') : '';
  useEffect(() => {
    if (map && ready) setFootprint(map, props.footprint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, footprintKey]);

  // Eventos y adquisiciones urgentes.
  const liveLayers = props.live;
  useEffect(() => {
    if (!map || !ready) return;
    setEvents(map, liveLayers?.events ?? null, liveLayers?.selectedEvent ?? null);
    setUrgent(map, liveLayers?.urgent ?? null, liveLayers?.selectedUrgent ?? null);
  }, [map, ready, liveLayers?.events, liveLayers?.urgent, liveLayers?.selectedEvent, liveLayers?.selectedUrgent]);

  // Imagen de un interferograma.
  const overlayUrl = props.overlay?.url ?? '';
  useEffect(() => {
    if (!map || !ready) return;
    setOverlayImage(map, props.overlay, opacity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, overlayUrl]);

  useEffect(() => {
    if (map && ready) setOverlayOpacity(map, opacity);
  }, [map, ready, opacity]);

  // Mapa óptico del día (NASA GIBS).
  const optical = props.opticalDate;
  useEffect(() => {
    if (!map || !ready || !map.getLayer('optico')) return;
    if (optical) (map.getSource('optico') as RasterTileSource | undefined)?.setTiles(gibsTiles(optical));
    map.setLayoutProperty('optico', 'visibility', optical ? 'visible' : 'none');
  }, [map, ready, optical]);

  // Capas de contexto (NASA GIBS).
  const contextKey = `${JSON.stringify(props.context)}|${props.contextDate}`;
  useEffect(() => {
    if (!map || !ready) return;
    setContext(map, props.context, props.contextDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, contextKey]);

  // Marcador de la sonda y del punto de exploración.
  useEffect(() => {
    if (!map) return;
    markerRef.current?.remove();
    markerRef.current = null;
    if (!probePoint) return;
    markerRef.current = new maplibregl.Marker({ element: markerElement(t('probe.marker'), 'sonda-marca') })
      .setLngLat(probePoint)
      .addTo(map);
  }, [map, probePoint, t]);

  const explorePoint = props.explorePoint;
  useEffect(() => {
    if (!map) return;
    pointRef.current?.remove();
    pointRef.current = null;
    if (!explorePoint) return;
    pointRef.current = new maplibregl.Marker({ element: markerElement(t('explore.marker'), 'punto-marca') })
      .setLngLat(explorePoint)
      .addTo(map);
  }, [map, explorePoint, t]);

  useEffect(() => {
    if (map && !props.live) map.getCanvas().style.cursor = probing || props.picking ? 'crosshair' : '';
  }, [map, probing, props.picking, props.live]);

  useEffect(() => {
    props.apiRef.current = {
      zoomIn: () => map?.zoomIn({ duration: 400 }),
      zoomOut: () => map?.zoomOut({ duration: 400 }),
      getCenter: () => {
        const host = hostRef.current;
        if (!map || !host) return null;
        const padding = coverPadding(host);
        const box = host.getBoundingClientRect();
        const point = map.unproject([
          (padding.left ?? 0) + (box.width - (padding.left ?? 0) - (padding.right ?? 0)) / 2,
          (padding.top ?? 0) + (box.height - (padding.top ?? 0) - (padding.bottom ?? 0)) / 2,
        ]);
        return Number.isFinite(point.lng) && Number.isFinite(point.lat) ? [point.lng, point.lat] : null;
      },
      getViewBounds: () => {
        const host = hostRef.current;
        if (!map || !host) return null;
        const padding = coverPadding(host);
        const box = host.getBoundingClientRect();
        const topLeft = map.unproject([padding.left ?? 0, padding.top ?? 0]);
        const bottomRight = map.unproject([box.width - (padding.right ?? 0), box.height - (padding.bottom ?? 0)]);
        const values = [topLeft.lng, bottomRight.lat, bottomRight.lng, topLeft.lat];
        return values.every(Number.isFinite) ? (values as Bounds) : null;
      },
    };
  });

  return (
    <div className="escenario">
      <div ref={hostRef} className="escenario-mapa" role="application" aria-label={t('map.label')} />
      {map && layer === 'swipe' && (
        <SwipeOverlay map={map} change={change} opacity={opacity} visible={!flying} projection={projection} />
      )}
    </div>
  );
}
