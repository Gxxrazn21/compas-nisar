// Control «Contexto» de la barra del mapa: tres capas opcionales de NASA GIBS que se superponen
// debajo del cambio de NISAR (agua vista por Sentinel-1, cobertura del suelo y población).
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import {
  CONTEXT,
  CONTEXT_IDS,
  DEFAULT_OPACITY,
  LEGEND,
  MIN_OPACITY,
  POPULATION_RAMP,
  activeContext,
  canStep,
} from '../../lib/context';
import type { ContextId, ContextLayers, LegendItem } from '../../lib/context';
import { formatDate } from '../../lib/format';

export interface ContextProps {
  layers: ContextLayers;
  /** Fecha que pide la capa de Sentinel-1. */
  date: string;
  days: number;
  /** Fecha «después» de la comparación, de la que parte la de Sentinel-1. */
  after: string | null;
  onLayer: (id: ContextId, opacity: number | null) => void;
  onStep: (delta: number) => void;
}

function Legend({ items }: { items: LegendItem[] }) {
  const { lang } = useI18n();
  return (
    <ul className="ctx-leyenda">
      {items.map((item) => (
        <li key={item.label.es}>
          <span className="ctx-muestra" aria-hidden="true">
            {item.colors.map((color) => (
              <span key={color} style={{ background: color }} />
            ))}
          </span>
          {item.label[lang]}
        </li>
      ))}
    </ul>
  );
}

function SentinelDate({ props }: { props: ContextProps }) {
  const { t, lang } = useI18n();
  const { date, days, after } = props;
  const offset =
    days === 0
      ? t('ctx.s1.same')
      : t(days > 0 ? 'ctx.s1.later' : 'ctx.s1.earlier', {
          n: Math.abs(days),
          unit: t(Math.abs(days) === 1 ? 'ctx.day' : 'ctx.days'),
        });
  return (
    <div className="ctx-fecha">
      <div className="ctx-fecha-control" role="group" aria-label={t('ctx.s1.group')}>
        <button
          type="button"
          className="icono"
          onClick={() => props.onStep(-1)}
          disabled={!canStep(after, days, -1)}
          aria-label={t('ctx.s1.prev')}
          title={t('ctx.s1.prev')}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <p className="ctx-fecha-dia" role="status">
          <strong>{formatDate(date, lang)}</strong>
          <span>{offset}</span>
        </p>
        <button
          type="button"
          className="icono"
          onClick={() => props.onStep(1)}
          disabled={!canStep(after, days, 1)}
          aria-label={t('ctx.s1.next')}
          title={t('ctx.s1.next')}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      {days !== 0 && (
        <button type="button" className="enlace-texto" onClick={() => props.onStep(-days)}>
          {t('ctx.s1.reset')}
        </button>
      )}
      <p className="ayuda">{t('ctx.s1.note')}</p>
    </div>
  );
}

function Item({ id, props }: { id: ContextId; props: ContextProps }) {
  const { t } = useI18n();
  const opacity = props.layers[id];
  const on = opacity !== undefined;
  const name = t(`ctx.${id}.name` as Key);
  return (
    <li className={on ? 'ctx-capa encendida' : 'ctx-capa'}>
      <label className="ctx-interruptor">
        <input
          type="checkbox"
          checked={on}
          onChange={(event) => props.onLayer(id, event.target.checked ? DEFAULT_OPACITY[id] : null)}
        />
        <span className="ctx-nombre">{name}</span>
      </label>
      <p className="ayuda">{t(`ctx.${id}.what` as Key)}</p>
      {on && (
        <div className="ctx-detalle">
          <label className="ctx-opacidad">
            <span>{t('ctx.opacity')}</span>
            <input
              type="range"
              min={MIN_OPACITY}
              max={1}
              step={0.05}
              value={opacity}
              aria-label={t('ctx.opacityOf', { name })}
              onChange={(event) => props.onLayer(id, Number(event.target.value))}
            />
          </label>
          {id === 'agua' && <SentinelDate props={props} />}
          <div className="ctx-lectura">
            <p className="ctx-lectura-titulo">{t('ctx.legend')}</p>
            {id === 'poblacion' ? (
              <>
                <span className="ctx-rampa" style={{ background: POPULATION_RAMP }} aria-hidden="true" />
                <p className="ayuda">{t('ctx.poblacion.read')}</p>
              </>
            ) : (
              <Legend items={LEGEND[id]} />
            )}
            <a href={CONTEXT[id].link} target="_blank" rel="noreferrer" className="ctx-enlace">
              {t('ctx.link')}
            </a>
          </div>
        </div>
      )}
    </li>
  );
}

export function ContextControl(props: ContextProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const count = activeContext(props.layers).length;

  // Escape cierra el panel y devuelve el foco al botón.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="contexto" ref={root}>
      {open && (
        <section className="contexto-panel" id="contexto-panel" aria-label={t('ctx.title')}>
          <h3>{t('ctx.title')}</h3>
          <p className="ayuda">{t('ctx.intro')}</p>
          <ul className="ctx-lista">
            {CONTEXT_IDS.map((id) => (
              <Item key={id} id={id} props={props} />
            ))}
          </ul>
          <p className="ayuda ctx-atribucion">{t('ctx.attr.full')}</p>
        </section>
      )}
      <button
        ref={button}
        type="button"
        className={count > 0 ? 'capa-contexto activa' : 'capa-contexto'}
        aria-expanded={open}
        aria-controls="contexto-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <Layers size={17} aria-hidden="true" />
        {t('ctx.button')}
        {count > 0 && (
          <span className="ctx-cuenta" aria-label={t('ctx.active', { n: count })}>
            {count}
          </span>
        )}
      </button>
    </div>
  );
}
