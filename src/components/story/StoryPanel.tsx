// Panel izquierdo del modo historia: los pasos guían el mapa, uno a uno.
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { LENS_LABEL, asLens } from '../../lib/lens';
import type { Dance } from '../../state/useDance';
import type { Story, StoryStep } from '../../types';

interface Props {
  story: Story;
  steps: StoryStep[];
  step: number;
  dance: Dance;
  /** Contenido propio del tipo de historia (por ejemplo, el selector de interferogramas). */
  extra?: ReactNode;
  onStep: (index: number) => void;
  onBack: () => void;
}

export function StoryPanel({ story, steps, step, dance, extra, onStep, onBack }: Props) {
  const { t, loc, lang } = useI18n();
  const total = steps.length;
  const activeRef = useRef<HTMLLIElement>(null);
  // El paso activo siempre queda a la vista, aunque el panel tenga que desplazarse.
  // El paso activo siempre queda visible dentro del panel (que se desplaza solo en pantallas anchas;
  // en el celular se desplaza la hoja entera y no se toca).
  useEffect(() => {
    const item = activeRef.current;
    const panel = item?.closest<HTMLElement>('.panel');
    if (!item || !panel || panel.scrollHeight <= panel.clientHeight + 1) return;
    const footer = panel.querySelector<HTMLElement>('.pasos-nav')?.offsetHeight ?? 0;
    const visible = panel.clientHeight - footer;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    // Desplazamiento mínimo: solo lo necesario para que el paso quepa encima del pie.
    const wanted =
      bottom > panel.scrollTop + visible - 12
        ? bottom - visible + 12
        : top < panel.scrollTop
          ? Math.max(0, top - 12)
          : null;
    if (wanted !== null) panel.scrollTo({ top: wanted, behavior: 'auto' });
  }, [step, steps.length]);
  return (
    <section className="panel panel-izq historia" data-cubre="left" aria-label={t('story.panelLabel')}>
      <button type="button" className="volver" onClick={onBack}>
        {t('top.back')}
      </button>
      <p className="lugar">
        {loc(story.place)}, {loc(story.country)}
      </p>
      <h2 className="titulo-historia">{loc(story.title)}</h2>
      <p className="resumen">{loc(story.summary)}</p>
      {story.kind !== 'interferogram' && (
        <p className="nota-fechas">{t('story.lens', { lens: LENS_LABEL[lang][asLens(story.lens)] })}</p>
      )}
      {extra}

      <ol className="pasos" aria-label={t('story.steps')}>
        {steps.map((item, index) => {
          const active = index === step;
          return (
            <li key={index} ref={active ? activeRef : undefined} className={active ? 'paso activo' : 'paso'}>
              <button
                type="button"
                className="paso-cabeza"
                aria-expanded={active}
                aria-current={active ? 'step' : undefined}
                onClick={() => onStep(index)}
              >
                <span className="paso-n" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="paso-titulo">{loc(item.title)}</span>
              </button>
              {active && (
                <div className="paso-cuerpo">
                  <p>{loc(item.text)}</p>
                  {item.layer === 'dance' && <DanceStart dance={dance} />}
                  {item.layer === 'zoom' && <p className="ayuda">{t('story.zoomHint')}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="pasos-nav">
        <span className="pasos-cuenta">{t('story.stepOf', { n: step + 1, total })}</span>
        <button type="button" className="secundario" disabled={step === 0} onClick={() => onStep(step - 1)}>
          {t('story.prev')}
        </button>
        <button type="button" className="primario" disabled={step >= total - 1} onClick={() => onStep(step + 1)}>
          {t('story.next')}
        </button>
      </div>

      {story.sources.length > 0 && (
        <div className="fuentes">
          <h3>{t('story.sources')}</h3>
          <ul>
            {story.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {loc(source.label)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DanceStart({ dance }: { dance: Dance }) {
  const { t } = useI18n();
  const busy = dance.phase === 'series' || dance.phase === 'preload';
  return (
    <div className="paso-accion">
      <button type="button" className="primario" disabled={busy || dance.active} onClick={dance.start}>
        {t('score.dance')}
      </button>
      <p className="ayuda">{t('story.danceHint')}</p>
    </div>
  );
}
