// La partitura: panel inferior con el pentagrama, la selección de fechas y la danza.
import { Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { xOfDate, makeAxis, noteFrequency, scoreWidth } from '../../lib/score';
import type { Blocked, Selection } from '../../lib/selection';
import { playNote, unlockSound } from '../../lib/sound';
import type { Dance } from '../../state/useDance';
import type { Scene, Stack } from '../../types';
import { DanceBar } from './DanceBar';
import { Staff, explain } from './Staff';
import { browseLegend } from '../../lib/browseLegend';

interface Props {
  stack: Stack | null;
  selection: Selection;
  applied: { before: string; after: string } | null;
  dance: Dance;
  comparing: boolean;
  /** Texto cuando aún no hay pila (Explorar sin lugar elegido). */
  emptyText?: string;
  /** Las notas suenan; el botón del altavoz lo cambia. */
  sound: boolean;
  onSound: () => void;
  onPick: (sceneId: string) => void;
  onCompare: () => void;
  readOnly?: boolean;
}

export function Score({ stack, selection, applied, dance, comparing, emptyText, sound, onSound, onPick, onCompare, readOnly = false }: Props) {
  const { t } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, [stack]);

  const complete = Boolean(selection.before && selection.after);
  const frame = dance.series?.frames[dance.index];
  const legend = browseLegend(dance.series?.series.find(point => point.date === frame?.date)?.granule
    ?? stack?.scenes.find(scene => scene.date === selection.after)?.mode);
  const singlePol = legend === 'hh' || legend === 'vv';
  const primaryChannel = legend === 'vv' || legend === 'vv-vh' ? 'VV' : 'HH';
  const channelLabel = dance.channel === 'hh' ? primaryChannel : 'HV';
  const unchanged = Boolean(
    applied && selection.before === applied.before && selection.after === applied.after,
  );

  // Lleva la nota de «antes» a la vista cuando la partitura es más ancha que el panel.
  const beforeDate = selection.before;
  useEffect(() => {
    const element = scroller.current;
    if (!element || !stack || !beforeDate || !stack.scenes.length) return;
    const first = stack.scenes[0] as Scene;
    const last = stack.scenes[stack.scenes.length - 1] as Scene;
    const total = makeAxis(first.date, last.date, 0).days;
    const axis = makeAxis(first.date, last.date, scoreWidth(total, element.clientWidth));
    const x = xOfDate(beforeDate, axis);
    if (x < element.scrollLeft + 40 || x > element.scrollLeft + element.clientWidth - 40) {
      element.scrollTo({ left: Math.max(0, x - element.clientWidth / 3) });
    }
  }, [stack, beforeDate, width]);

  const status =
    message ??
    (dance.active
      ? t('dance.point', { channel: channelLabel })
      : readOnly ? t('score.fixedPair')
      : selection.awaiting === 'after'
      ? t('score.pickAfter')
      : complete && !unchanged
        ? t('score.ready')
        : t('score.pickBefore'));

  useEffect(() => setMessage(null), [selection.before, selection.after]);

  const blocked = useCallback(
    (reason: Blocked, scene: Scene) => {
      if (!stack) return;
      setMessage(explain(reason, scene, selection, stack.scenes, t));
    },
    [stack, selection, t],
  );

  const compareHint: Key | null = !complete ? 'score.compareNeed' : unchanged ? 'score.compareSame' : null;
  const cursorDate =
    dance.active && dance.series ? (dance.series.frames[dance.index]?.date ?? null) : null;

  // En la danza, cada cuadro hace sonar su nota: la melodía es la serie de retornos del radar.
  const danceSeries = dance.active ? dance.series : null;
  const danceIndex = dance.index;
  useEffect(() => {
    if (!sound || !danceSeries) return;
    const date = danceSeries.frames[danceIndex]?.date;
    if (!date) return;
    const point = danceSeries.series.find((point) => point.date === date);
    const frequency = noteFrequency(dance.channel === 'hv' ? point?.hv_db : point?.hh_db);
    if (frequency !== null) playNote(frequency);
  }, [sound, danceSeries, danceIndex, dance.channel]);

  const soundLabel = t(sound ? 'score.soundOn' : 'score.soundOff');

  return (
    <section className="partitura" data-cubre="bottom" aria-labelledby="partitura-h">
      <div className="partitura-cabeza">
        <h2 id="partitura-h" className="partitura-titulo">
          {t('score.title')} <em>{t('score.tempo')}</em>
        </h2>
        <p className="partitura-estado" role="status" aria-live="polite">
          {status}
        </p>
        <div className="partitura-acciones">
          <label className="partitura-canal">
            <span>{t('score.channel')}</span>
            <select value={dance.channel} onChange={event => dance.setChannel(event.target.value as 'hh' | 'hv')}>
              <option value="hh">{primaryChannel}</option>
              <option value="hv" disabled={!stack?.polarizations.includes('HV')}>HV</option>
            </select>
          </label>
          <button
            type="button"
            className="icono sonido"
            aria-pressed={sound}
            aria-label={soundLabel}
            title={`${soundLabel} (M)`}
            onClick={() => {
              unlockSound();
              onSound();
            }}
          >
            {sound ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
          </button>
          {dance.phase === 'idle' || dance.phase === 'error' ? (
            <>
              {!readOnly && <button
                type="button"
                className="secundario"
                disabled={!complete || unchanged || comparing}
                onClick={onCompare}
                title={compareHint ? t(compareHint) : undefined}
              >
                {t('score.compare')}
              </button>}
              <button
                type="button"
                className="primario"
                disabled={!stack || !dance.available}
                title={`${t('story.danceHint')} (D)`}
                onClick={() => {
                  unlockSound();
                  dance.start();
                }}
              >
                {t('score.dance')}
              </button>
            </>
          ) : (
            <DanceBar dance={dance} />
          )}
        </div>
      </div>
      {dance.phase === 'error' && (
        <p className="partitura-aviso" role="alert">
          {dance.errorDetail ? t('dance.errorDetail', { detail: dance.errorDetail }) : t('dance.error')}
        </p>
      )}
      {dance.failedDates.length > 0 && (
        <p className="partitura-aviso" role="status">
          {t(dance.active ? 'dance.partial' : 'dance.failed', { n: dance.failedDates.length, total: dance.totalFrames })}
          {' '}{dance.failedDates.join(', ')}{' '}
          <button type="button" className="enlace" onClick={dance.retry}>{t('dance.retry')}</button>
        </p>
      )}
      <div ref={scroller} className="partitura-lienzo" tabIndex={-1}>
        {stack ? (
          <Staff
            stack={stack}
            containerWidth={width}
            selection={selection}
            series={dance.series}
            channel={dance.channel}
            channelLabel={channelLabel}
            readOnly={readOnly}
            cursorDate={cursorDate}
            sound={sound}
            onPick={(scene) => onPick(scene.id)}
            onBlocked={blocked}
          />
        ) : (
          <p className="ayuda partitura-vacia">{emptyText ?? t('score.loading')}</p>
        )}
      </div>
      <details className="partitura-detalles">
        <summary>{t('score.scaleShort')} · {dance.point ? t(dance.pointKind === 'selected' ? 'score.pointSelected' : 'score.pointCenter', {
          lon: dance.point[0].toFixed(4), lat: dance.point[1].toFixed(4),
        }) : t('score.noPoint')}</summary>
        <p>{t('score.scale')}</p>
        <p>{t('score.timing')}</p>
        {dance.series?.method && <p>{t('score.reference', { date: dance.series.method.reference_date, radius: dance.series.method.window_radius_pixels })}</p>}
      </details>
      {dance.active && <details className="partitura-detalles partitura-colores">
        <summary>{t('dance.colorHelp')}</summary>
        <p>{t(`dance.color.${legend}`)}</p>
        <p>{t(singlePol ? 'dance.grayExplanation' : 'dance.colorExplanation')}</p>
        <p>{t('dance.colorLimits')}</p>
      </details>}
    </section>
  );
}
