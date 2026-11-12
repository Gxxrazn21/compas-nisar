// La partitura: panel inferior con el pentagrama, la selección de fechas y la danza.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { xOfDate, makeAxis, scoreWidth } from '../../lib/score';
import type { Blocked, Selection } from '../../lib/selection';
import type { Dance } from '../../state/useDance';
import type { Scene, Stack } from '../../types';
import { DanceBar } from './DanceBar';
import { Staff, explain } from './Staff';

interface Props {
  stack: Stack | null;
  selection: Selection;
  applied: { before: string; after: string } | null;
  dance: Dance;
  comparing: boolean;
  /** Texto cuando aún no hay pila (Explorar sin lugar elegido). */
  emptyText?: string;
  onPick: (sceneId: string) => void;
  onCompare: () => void;
}

export function Score({ stack, selection, applied, dance, comparing, emptyText, onPick, onCompare }: Props) {
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
      ? t('dance.point')
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
          {dance.phase === 'idle' || dance.phase === 'error' ? (
            <>
              <button
                type="button"
                className="secundario"
                disabled={!complete || unchanged || comparing}
                onClick={onCompare}
                title={compareHint ? t(compareHint) : undefined}
              >
                {t('score.compare')}
              </button>
              <button type="button" className="primario" disabled={!stack} onClick={dance.start}>
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
      <div ref={scroller} className="partitura-lienzo" tabIndex={-1}>
        {stack ? (
          <Staff
            stack={stack}
            containerWidth={width}
            selection={selection}
            series={dance.series}
            cursorDate={cursorDate}
            onPick={(scene) => onPick(scene.id)}
            onBlocked={blocked}
          />
        ) : (
          <p className="ayuda partitura-vacia">{emptyText ?? t('score.loading')}</p>
        )}
      </div>
      {dance.series && !dance.active && dance.phase === 'idle' && (
        <p className="ayuda partitura-pie">{t('score.pitch')}</p>
      )}
    </section>
  );
}
