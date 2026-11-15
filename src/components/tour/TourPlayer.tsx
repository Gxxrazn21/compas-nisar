// Recorrido guiado: una tarjeta sobre el mapa que explica, paso a paso y sola, qué es cada parte
// de NISAR, cómo funciona su radar, cómo se leen sus datos y para qué sirve cada zona de SARitmo.
// Mientras habla, la aplicación real hace lo que se explica (ver `useTourDirector`) y un marco
// dorado señala de qué se trata.
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { CHAPTERS, TOUR, chapterStart, textKey, titleKey } from '../../lib/tour';
import type { TourStep } from '../../lib/tour';
import type { Tour } from '../../state/useTour';
import { NisarFigure } from './Nisar3D';
import { RadarDiagram } from './RadarDiagram';

const MARGIN = 6;
/** Lo que tarda el marco en viajar de un objetivo al siguiente (igual que en recorrido.css). */
const TRAVEL_MS = 460;

/**
 * Marco dorado alrededor de lo que el paso señala. Sigue a su objetivo cuadro a cuadro escribiendo
 * directo en el estilo (sin repintar React): el satélite no se queda quieto y los paneles cambian de
 * tamaño cuando llegan los datos. Al cambiar de objetivo, el marco viaja hasta el nuevo.
 */
function Spotlight({ selector }: { selector: string | null }) {
  const ring = useRef<HTMLDivElement>(null);
  /** El marco ya está puesto sobre algo: solo entonces tiene sentido que viaje al objetivo nuevo. */
  const placed = useRef(false);

  useEffect(() => {
    const element = ring.current;
    if (!element) return;
    let frame = 0;
    // Lo último que se escribió: si el objetivo no se movió, no se toca el estilo ni se pide otro cuadro.
    let last = '';
    // Durante el viaje entre dos objetivos manda la transición de CSS; después, el marco va pegado.
    const travelUntil = performance.now() + (placed.current ? TRAVEL_MS : 0);
    element.classList.toggle('viajando', placed.current);
    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      const rect = selector ? document.querySelector(selector)?.getBoundingClientRect() : null;
      if (!rect || rect.width < 2 || rect.height < 2) {
        if (placed.current) {
          placed.current = false;
          element.classList.remove('visible', 'viajando');
        }
        return;
      }
      if (now > travelUntil) element.classList.remove('viajando');
      const left = Math.max(2, rect.left - MARGIN);
      const top = Math.max(2, rect.top - MARGIN);
      const width = Math.min(window.innerWidth - 2, rect.right + MARGIN) - left;
      const height = Math.min(window.innerHeight - 2, rect.bottom + MARGIN) - top;
      const box = `${left.toFixed(1)}|${top.toFixed(1)}|${width.toFixed(1)}|${height.toFixed(1)}`;
      if (box !== last) {
        last = box;
        element.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
        element.style.width = `${Math.max(width, 0).toFixed(1)}px`;
        element.style.height = `${Math.max(height, 0).toFixed(1)}px`;
      }
      if (!placed.current) {
        placed.current = true;
        element.classList.add('visible');
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [selector]);

  return <div ref={ring} className="recorrido-foco" aria-hidden="true" />;
}

function Figure({ step }: { step: TourStep }) {
  if (!step.figure) return null;
  if (step.figure === 'model' || step.figure === 'dimensions') {
    return <NisarFigure dimensions={step.figure === 'dimensions'} part={step.part} />;
  }
  return (
    <figure className="figura-nisar">
      {/* La clave reinicia la animación del esquema al cambiar de paso. */}
      <div key={step.figure} className="figura-dibujo figura-esquema recorrido-entra">
        <RadarDiagram kind={step.figure} />
      </div>
    </figure>
  );
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
  const chapterFirst = chapterStart(step.chapter);
  const chapterSteps = TOUR.filter((item) => item.chapter === step.chapter);

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
      <Spotlight selector={step.target ?? null} />
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
                  onClick={() => tour.go(chapterStart(chapter))}
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
            <Figure step={step} />
            {/* La clave hace entrar el texto de cada paso con un fundido corto, en vez de cambiar de golpe. */}
            <div key={step.id} className="recorrido-texto recorrido-entra" aria-live="polite">
              <h2 className="recorrido-titulo">{t(titleKey(step))}</h2>
              <p>{t(textKey(step))}</p>
            </div>
          </div>

          {/* Un tramo por paso del capítulo: el actual se llena al ritmo del reloj de useTour. */}
          <div className="recorrido-avance" aria-hidden="true">
            {chapterSteps.map((item, offset) => {
              const index = chapterFirst + offset;
              const state = index < tour.index ? 'hecho' : index === tour.index ? 'actual' : 'pendiente';
              return (
                <span key={item.id} className={state}>
                  {state === 'actual' && !last && (
                    <i
                      key={`${tour.run}:${tour.index}`}
                      style={{ animationDuration: `${tour.duration}ms`, animationPlayState: tour.playing ? 'running' : 'paused' }}
                    />
                  )}
                </span>
              );
            })}
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
