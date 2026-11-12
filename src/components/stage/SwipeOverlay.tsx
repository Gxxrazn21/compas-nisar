// Cortina antes/después: un segundo mapa sincronizado, recortado con clip-path,
// que muestra la capa «antes» a la izquierda de la cortina.
import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useI18n } from '../../i18n';
import { formatDate } from '../../lib/format';
import type { ChangeResult } from '../../types';
import { installChange, showLayer } from './dataLayers';
import { baseStyle } from './mapStyle';
import { coverPadding } from './padding';

interface Props {
  map: MapLibreMap;
  change: ChangeResult | null;
  opacity: number;
  visible: boolean;
  projection: 'globe' | 'mercator';
}

function clamp(value: number): number {
  return Math.min(0.98, Math.max(0.02, value));
}

export function SwipeOverlay({ map, change, opacity, visible, projection }: Props) {
  const { t, lang } = useI18n();
  const hostRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<MapLibreMap | null>(null);
  const [position, setPosition] = useState(0.5);

  // Posición inicial: el centro de la parte del mapa que no tapan los paneles.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const padding = coverPadding(area);
    const width = area.clientWidth || 1;
    const free = width - (padding.left ?? 0) - (padding.right ?? 0);
    setPosition(clamp(((padding.left ?? 0) + free / 2) / width));
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const second = new maplibregl.Map({
      container: host,
      style: baseStyle(projection),
      interactive: false,
      attributionControl: false,
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      canvasContextAttributes: { antialias: false },
    });
    const sync = () =>
      second.jumpTo({
        center: map.getCenter(),
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        padding: map.getPadding(),
      });
    const resize = () => {
      second.resize();
      sync();
    };
    second.on('load', () => {
      sync();
      setTop(second);
    });
    map.on('move', sync);
    map.on('resize', resize);
    return () => {
      map.off('move', sync);
      map.off('resize', resize);
      setTop(null);
      second.remove();
    };
  }, [map, projection]);

  const changeId = change?.id ?? null;
  useEffect(() => {
    if (!top) return;
    installChange(top, change, ['before']);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top, changeId]);

  useEffect(() => {
    if (top) showLayer(top, 'before', opacity, visible);
  }, [top, changeId, opacity, visible]);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const area = areaRef.current;
    if (!area || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = area.getBoundingClientRect();
    setPosition(clamp((event.clientX - rect.left) / rect.width));
  };

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    const big = event.shiftKey ? 0.1 : 0.02;
    const next: Record<string, number> = {
      ArrowLeft: position - big,
      ArrowDown: position - big,
      ArrowRight: position + big,
      ArrowUp: position + big,
      Home: 0.02,
      End: 0.98,
    };
    if (event.key in next) {
      event.preventDefault();
      setPosition(clamp(next[event.key] as number));
    }
  };

  const percent = position * 100;
  return (
    <div ref={areaRef} className="cortina" style={{ ['--pos' as string]: `${percent}%` }}>
      <div
        ref={hostRef}
        className="cortina-mapa"
        aria-hidden="true"
        style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
      />
      {change && (
        <>
          <p className="cortina-rotulo antes">{t('map.curtainBefore', { date: formatDate(change.before.date, lang) })}</p>
          <p className="cortina-rotulo despues">{t('map.curtainAfter', { date: formatDate(change.after.date, lang) })}</p>
        </>
      )}
      <div
        className="cortina-asa"
        role="slider"
        tabIndex={0}
        aria-label={t('map.curtain')}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        onKeyDown={keys}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event);
        }}
        onPointerMove={move}
      >
        <span className="cortina-grip" aria-hidden="true" />
      </div>
    </div>
  );
}
