// Recorrido guiado: una tarjeta sobre el mapa que explica, paso a paso y sola, qué es cada parte
// de NISAR, cómo observa y para qué sirve cada zona de Compás. Mientras habla, la aplicación real
// hace lo que se explica (ver `useTourDirector`) y un marco dorado señala de qué se trata.
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { nisarSvg } from '../../lib/nisarModel';
import type { Part } from '../../lib/nisarModel';
import { CHAPTERS, textKey, titleKey } from '../../lib/tour';
import type { Tour } from '../../state/useTour';

/** El modelo a escala, con una parte resaltada o con las cotas de sus medidas. */
export function NisarFigure({ dimensions = false, part }: { dimensions?: boolean; part?: Part }) {
  const { t } = useI18n();
  const svg = useMemo(
    () =>
      nisarSvg(
        dimensions
          ? {
              reflector: t('tour.dim.reflector'),
              boom: t('tour.dim.boom'),
              body: t('tour.dim.body'),
              solar: t('tour.dim.solar'),
              person: t('tour.dim.person'),
            }
          : undefined,
      ),
    [dimensions, t],
  );
  return (
    <figure className="figura-nisar" data-resalta={part}>
      {/* El SVG lo genera `nisarSvg` con datos propios: no incluye texto de terceros. */}
      <div
        className="figura-dibujo"
        role="img"
        aria-label={t(dimensions ? 'tour.figureDimensions' : 'tour.figure')}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="ayuda">{t('tour.figureNote')}</figcaption>
    </figure>
  );
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const MARGIN = 6;

/** Marco dorado alrededor de lo que el paso señala. Si el elemento no está en pantalla, no se dibuja. */
function Spotlight({ selector }: { selector: string }) {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    const measure = () => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      if (!rect || rect.width < 2 || rect.height < 2) {
        setBox(null);
        return;
      }
      const left = Math.max(2, rect.left - MARGIN);
      const top = Math.max(2, rect.top - MARGIN);
      const next = {
        left,
        top,
        width: Math.min(window.innerWidth - 2, rect.right + MARGIN) - left,
        height: Math.min(window.innerHeight - 2, rect.bottom + MARGIN) - top,
      };
      setBox((current) =>
        current &&
        Math.abs(current.left - next.left) < 0.5 &&
        Math.abs(current.top - next.top) < 0.5 &&
        Math.abs(current.width - next.width) < 0.5 &&
        Math.abs(current.height - next.height) < 0.5
          ? current
          : next,
      );
    };
    measure();
    // Los paneles aparecen y cambian de tamaño cuando llegan los datos, y el satélite no se queda quieto.
    const timer = window.setInterval(measure, 200);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', measure);
    };
  }, [selector]);

  if (!box || box.width <= 0 || box.height <= 0) return null;
  return <div className="recorrido-foco" style={box} aria-hidden="true" />;
}

export function TourPlayer({ tour }: { tour: Tour }) {
  const { t } = useI18n();
  const card = useRef<HTMLElement>(null);
  const { step } = tour;

  // Al abrir, el foco va a la tarjeta: Espacio y las flechas quedan a mano.
  useEffect(() => {
    if (tour.active) card.current?.focus({ preventScroll: true });
  }, [tour.active, tour.run]);

  useEffect(() => {
    if (!tour.active) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      tour.close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour.active, tour.close]);

  if (!step) return null;

  const first = tour.index === 0;
  const last = tour.index === tour.total - 1;

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' && !last) {
      event.preventDefault();
      tour.next();
    } else if (event.key === 'ArrowLeft' && !first) {
      event.preventDefault();
      tour.prev();
    }
  };

  return (
    <>
      {step.target && <Spotlight key={step.target} selector={step.target} />}
      <div className="recorrido-zona">
        <section
          ref={card}
          className={step.figure ? 'recorrido con-figura' : 'recorrido'}
          aria-label={t('tour.label')}
          // Siguiendo al satélite, el mapa se centra debajo de la tarjeta para que no lo tape.
          data-cubre={step.scene === 'satellite' ? 'top' : undefined}
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          <header className="recorrido-cabeza">
            <div className="recorrido-capitulos" role="group" aria-label={t('tour.chapters')}>
              {CHAPTERS.map((chapter) => (
                <button
                  key={chapter}
                  type="button"
                  aria-pressed={step.chapter === chapter}
                  onClick={() => tour.start(chapter)}
                >
                  {t(`tour.chapter.${chapter}` as Key)}
                </button>
              ))}
            </div>
            <button type="button" className="pista-cerrar" onClick={tour.close} aria-label={t('tour.close')} title={`${t('tour.close')} (Esc)`}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="recorrido-cuerpo">
            {step.figure && <NisarFigure dimensions={step.figure === 'dimensions'} part={step.part} />}
            <div className="recorrido-texto" aria-live="polite">
              <h2 className="recorrido-titulo">{t(titleKey(step))}</h2>
              <p>{t(textKey(step))}</p>
            </div>
          </div>

          {/* La barra se reinicia en cada paso y se detiene con la pausa; el avance real lo lleva useTour. */}
          <div className="recorrido-avance" aria-hidden="true">
            {!last && (
              <span
                key={`${tour.run}:${tour.index}`}
                style={{ animationDuration: `${tour.duration}ms`, animationPlayState: tour.playing ? 'running' : 'paused' }}
              />
            )}
          </div>

          <footer className="recorrido-pie">
            <span className="recorrido-cuenta">{t('tour.stepOf', { n: tour.index + 1, total: tour.total })}</span>
            <div className="recorrido-controles" role="group" aria-label={t('tour.controls')}>
              <button type="button" className="icono" disabled={first} onClick={tour.prev} aria-label={t('tour.prev')} title={`${t('tour.prev')} (←)`}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              {last ? (
                <>
                  <button type="button" className="secundario" onClick={() => tour.start()}>
                    <RotateCcw size={16} aria-hidden="true" />
                    {t('tour.restart')}
                  </button>
                  <button type="button" className="primario" onClick={tour.close}>
                    {t('tour.finish')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="icono principal"
                    onClick={tour.toggle}
                    aria-label={t(tour.playing ? 'tour.pause' : 'tour.play')}
                    title={t(tour.playing ? 'tour.pause' : 'tour.play')}
                  >
                    {tour.playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                  </button>
                  <button type="button" className="icono" onClick={tour.next} aria-label={t('tour.next')} title={`${t('tour.next')} (→)`}>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </footer>
        </section>
      </div>
    </>
  );
}
