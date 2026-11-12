// Estado y controles de la danza: avance explícito de la carga y reproducción.
import { Pause, Play, Repeat, SkipBack, SkipForward, X } from 'lucide-react';
import { useI18n } from '../../i18n';
import { formatDate } from '../../lib/format';
import type { Dance } from '../../state/useDance';

export function DanceBar({ dance }: { dance: Dance }) {
  const { t, lang } = useI18n();

  if (dance.phase === 'series' || dance.phase === 'preload') {
    const total = dance.series?.frames.length ?? 0;
    return (
      <div className="danza-carga" role="status">
        {dance.phase === 'series' ? (
          <>
            <progress aria-label={t('dance.series', { s: dance.elapsed })} />
            <span>{t('dance.series', { s: dance.elapsed })}</span>
          </>
        ) : (
          <>
            <progress max={Math.max(total, 1)} value={dance.loaded} aria-label={t('dance.preload', { n: dance.loaded, total })} />
            <span>{t('dance.preload', { n: dance.loaded, total })}</span>
          </>
        )}
        <button type="button" className="secundario" onClick={dance.cancel}>
          {t('dance.cancel')}
        </button>
      </div>
    );
  }

  const total = dance.series?.frames.length ?? 0;
  const frame = dance.series?.frames[dance.index];
  return (
    <div className="danza-controles" role="group" aria-label={t('dance.controls')}>
      <span className="danza-cuadro" aria-live="off">
        {frame ? t('dance.frame', { n: dance.index + 1, total, date: formatDate(frame.date, lang) }) : ''}
      </span>
      <button type="button" className="icono" onClick={() => dance.step(-1)} aria-label={t('dance.prev')} title={t('dance.prev')}>
        <SkipBack size={18} aria-hidden="true" />
      </button>
      {!dance.manualOnly && (
        <button
          type="button"
          className="icono principal"
          onClick={dance.toggle}
          aria-label={dance.playing ? t('dance.pause') : t('dance.play')}
          title={dance.playing ? t('dance.pause') : t('dance.play')}
        >
          {dance.playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
      )}
      <button type="button" className="icono" onClick={() => dance.step(1)} aria-label={t('dance.next')} title={t('dance.next')}>
        <SkipForward size={18} aria-hidden="true" />
      </button>
      {!dance.manualOnly && (
        <button
          type="button"
          className="icono"
          aria-pressed={dance.loop}
          onClick={dance.toggleLoop}
          aria-label={t('dance.loop')}
          title={t('dance.loop')}
        >
          <Repeat size={18} aria-hidden="true" />
        </button>
      )}
      <button type="button" className="secundario" onClick={dance.stop}>
        <X size={16} aria-hidden="true" /> {t('dance.stop')}
      </button>
    </div>
  );
}
