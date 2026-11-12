// El pentagrama: SVG hecho a mano. Cada pasada del radar es una nota; «antes» y «después»
// son doradas y las une una ligadura; durante la danza un cursor recorre el pentagrama.
import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { formatDate, formatDateShort, formatMonth } from '../../lib/format';
import {
  barDays,
  makeAxis,
  monthTicks,
  noteY,
  pitchRange,
  scoreWidth,
  stemUp,
  xOfDate,
  xOfDay,
} from '../../lib/score';
import { blockReason } from '../../lib/selection';
import type { Blocked, Selection } from '../../lib/selection';
import type { Scene, SeriesResult, Stack } from '../../types';

export const STAFF_HEIGHT = 126;
const SPACE = 9;
const TOP = 38;
const CENTER = TOP + SPACE * 2;
const BOTTOM = TOP + SPACE * 4;
const STEM = 26;

interface Props {
  stack: Stack;
  containerWidth: number;
  selection: Selection;
  series: SeriesResult | null;
  cursorDate: string | null;
  onPick: (scene: Scene) => void;
  onBlocked: (reason: Blocked, scene: Scene) => void;
}

function monthLabel(date: string, index: number, lang: 'es' | 'en'): string {
  const month = formatMonth(date, lang);
  return index === 0 || date.slice(5, 7) === '01' ? `${month} ${date.slice(0, 4)}` : month;
}

export function Staff({ stack, containerWidth, selection, series, cursorDate, onPick, onBlocked }: Props) {
  const { t, lang } = useI18n();
  const scenes = stack.scenes;
  const first = scenes[0]?.date;
  const last = scenes[scenes.length - 1]?.date;
  const refs = useRef<Array<SVGGElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (!first || !last) return null;
    const probe = makeAxis(first, last, 0);
    const width = scoreWidth(probe.days, containerWidth);
    const axis = makeAxis(first, last, width);
    return { axis, width };
  }, [first, last, containerWidth]);

  if (!geometry || !first) return null;
  const { axis, width } = geometry;

  const heights = new Map(series?.series.map((point) => [point.date, point.hh_db] as const));
  const range = pitchRange(series?.series.map((point) => point.hh_db) ?? []);
  const y = (date: string) => noteY(heights.get(date), range, CENTER, SPACE);

  const bars = barDays(axis.days)
    .map((day) => xOfDay(day, axis))
    .filter((x) => x > 6 && x < width - 6);
  const ticks = monthTicks(first, axis.days);

  const sceneBefore = scenes.find((scene) => scene.date === selection.before);
  const sceneAfter = scenes.find((scene) => scene.date === selection.after);
  const defaultFocus = Math.max(0, scenes.findIndex((scene) => scene.date === selection.before));
  const rovingIndex = focusIndex ?? defaultFocus;

  const qualityText = (scene: Scene) => t(`prov.quality.${scene.quality}` as Key);
  const noteName = (scene: Scene) => {
    const isBefore = scene.date === selection.before;
    const isAfter = scene.date === selection.after;
    const key: Key = isBefore ? 'score.noteBefore' : isAfter ? 'score.noteAfter' : 'score.noteAria';
    return t(key, { date: formatDate(scene.date, lang), quality: qualityText(scene) });
  };

  const activate = (scene: Scene) => {
    const reason = blockReason(scene, selection, scenes);
    if (reason) onBlocked(reason, scene);
    else onPick(scene);
  };

  const keyDown = (event: KeyboardEvent<SVGGElement>, index: number, scene: Scene) => {
    const target: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      Home: 0,
      End: scenes.length - 1,
    };
    if (event.key in target) {
      event.preventDefault();
      const next = Math.min(scenes.length - 1, Math.max(0, target[event.key] as number));
      setFocusIndex(next);
      refs.current[next]?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(scene);
    }
  };

  const slur = () => {
    if (!sceneBefore || !sceneAfter) return null;
    const x1 = xOfDate(sceneBefore.date, axis);
    const x2 = xOfDate(sceneAfter.date, axis);
    const y1 = y(sceneBefore.date) - 8;
    const y2 = y(sceneAfter.date) - 8;
    const peak = Math.min(y1, y2, TOP) - 14;
    return <path className="ligadura" d={`M ${x1} ${y1} C ${x1} ${peak}, ${x2} ${peak}, ${x2} ${y2}`} />;
  };

  const label = (scene: Scene | undefined, kind: 'before' | 'after') => {
    if (!scene) return null;
    const x = xOfDate(scene.date, axis);
    const word = t(kind === 'before' ? 'score.before' : 'score.after');
    const anchor = kind === 'before' ? (x < 110 ? 'start' : 'end') : x > width - 110 ? 'end' : 'start';
    return (
      <text className="nota-rotulo" x={anchor === 'end' ? x + 8 : x - 8} y={BOTTOM + 26} textAnchor={anchor}>
        <tspan className="nota-palabra">{word}</tspan> {formatDateShort(scene.date, lang)}
      </text>
    );
  };

  const cursorX = cursorDate ? xOfDate(cursorDate, axis) : null;

  return (
    <svg
      className="pentagrama"
      width={width}
      height={STAFF_HEIGHT}
      viewBox={`0 0 ${width} ${STAFF_HEIGHT}`}
      role="group"
      aria-label={t('score.label')}
    >
      {[0, 1, 2, 3, 4].map((line) => (
        <line key={line} className="pent-linea" x1={4} x2={width - 4} y1={TOP + SPACE * line} y2={TOP + SPACE * line} />
      ))}
      <text className="pent-clave" x={12} y={CENTER + 7}>
        HH
      </text>
      {bars.map((x) => (
        <line key={x} className="pent-barra" x1={x} x2={x} y1={TOP} y2={BOTTOM} />
      ))}
      {ticks.map((tick, index) => {
        const x = xOfDay(tick.day, axis);
        return (
          <g key={tick.date}>
            <line className="pent-mes" x1={x} x2={x} y1={STAFF_HEIGHT - 19} y2={STAFF_HEIGHT - 13} />
            <text className="pent-mes-texto" x={x + 4} y={STAFF_HEIGHT - 4}>
              {monthLabel(tick.date, index, lang)}
            </text>
          </g>
        );
      })}

      {slur()}

      {cursorX !== null && (
        <g className="cursor" aria-hidden="true">
          <line x1={cursorX} x2={cursorX} y1={TOP - 14} y2={BOTTOM + 14} />
          <path d={`M ${cursorX - 5} ${TOP - 18} L ${cursorX + 5} ${TOP - 18} L ${cursorX} ${TOP - 10} Z`} />
        </g>
      )}

      {scenes.map((scene, index) => {
        const x = xOfDate(scene.date, axis);
        const ny = y(scene.date);
        const isBefore = scene.date === selection.before;
        const isAfter = scene.date === selection.after;
        const lit = scene.date === cursorDate;
        const reason = blockReason(scene, selection, scenes);
        const classes = [
          'nota',
          scene.analyzable ? '' : 'hueca',
          isBefore || isAfter ? 'elegida' : '',
          lit ? 'encendida' : '',
          reason ? 'atenuada' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const up = stemUp(ny, CENTER);
        return (
          <g
            key={scene.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            className={classes}
            style={{ transform: `translate(${x}px, ${ny}px)` }}
            role="button"
            tabIndex={index === rovingIndex ? 0 : -1}
            aria-label={noteName(scene)}
            aria-pressed={isBefore || isAfter}
            aria-disabled={reason !== null}
            onClick={() => activate(scene)}
            onFocus={() => setFocusIndex(index)}
            onKeyDown={(event) => keyDown(event, index, scene)}
          >
            <title>
              {noteName(scene)}
              {reason ? `. ${explain(reason, scene, selection, scenes, t)}` : ''}
            </title>
            <circle className="nota-foco" r={13} />
            <circle className="nota-halo" r={11} />
            <circle className="nota-zona" r={14} />
            <line
              className="nota-plica"
              x1={up ? 5 : -5}
              x2={up ? 5 : -5}
              y1={0}
              y2={up ? -STEM : STEM}
            />
            <ellipse className="nota-cabeza" rx={5.8} ry={4.2} transform="rotate(-22)" />
          </g>
        );
      })}

      {label(sceneBefore, 'before')}
      {label(sceneAfter, 'after')}
    </svg>
  );
}

/** Texto que explica por qué una nota no se puede elegir. */
export function explain(
  reason: Blocked,
  scene: Scene,
  selection: Selection,
  scenes: Scene[],
  t: (key: Key, vars?: Record<string, string | number>) => string,
): string {
  if (reason === 'other-mode') {
    const anchor = scenes.find((item) => item.date === selection.before);
    return t('score.blocked.other-mode', { mode: scene.mode, anchor: anchor?.mode ?? '' });
  }
  return t(`score.blocked.${reason}` as Key);
}
