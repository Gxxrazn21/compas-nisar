// Panel izquierdo de En vivo: eventos naturales de EONET y adquisiciones urgentes de NISAR.
import { useState } from 'react';
import { useI18n } from '../../i18n';
import { es } from '../../i18n/es';
import type { Key } from '../../i18n/es';
import { categoryColor, countByCategory, urgentId } from '../../lib/events';
import type { UrgentGroup } from '../../lib/events';
import { formatDate, formatDateTime } from '../../lib/format';
import type { Compas } from '../../state/useCompas';
import type { NaturalEvent } from '../../types';

const PAGE = 60;

function categoryName(t: (key: Key) => string, key: string, fallback: string): string {
  const name = `cat.${key}`;
  return name in es ? t(name as Key) : fallback;
}

export function LivePanel({ compas }: { compas: Compas }) {
  const { t } = useI18n();
  const { live } = compas;
  return (
    <section className="panel panel-izq en-vivo" data-cubre="left" aria-label={t('live.panelLabel')}>
      <h2 className="titulo-historia">{t('live.title')}</h2>
      <p className="resumen">{t('live.intro')}</p>

      <div className="segmentos pestanas" role="group" aria-label={t('live.tabs')}>
        <button type="button" aria-pressed={live.tab === 'events'} onClick={() => live.setTab('events')}>
          {t('live.tab.events')}
        </button>
        <button type="button" aria-pressed={live.tab === 'urgent'} onClick={() => live.setTab('urgent')}>
          {t('live.tab.urgent')}
        </button>
      </div>

      {live.tab === 'events' ? <Events compas={compas} /> : <Urgent compas={compas} />}

      <p className="ayuda atribucion">{t('live.sources')}</p>
    </section>
  );
}

function Events({ compas }: { compas: Compas }) {
  const { t, lang } = useI18n();
  const { live } = compas;
  const [shown, setShown] = useState(PAGE);

  if (live.events.status === 'loading') {
    return <p className="estado" role="status">{t('live.events.loading')}</p>;
  }
  if (live.events.status === 'error') {
    return (
      <div className="estado aviso" role="alert">
        <p>{t('live.events.error')}</p>
        <button type="button" className="secundario" onClick={live.reload}>
          {t('err.retry')}
        </button>
      </div>
    );
  }
  const all = live.events.data;
  const counts = countByCategory(all);
  const names = new Map(all.map((event) => [event.category, event.category_label]));
  const selected = live.selectedEvent;

  return (
    <>
      <p className="ayuda">{t('live.events.count', { n: live.visibleEvents.length, days: 20 })}</p>
      <div className="filtros" role="group" aria-label={t('live.filter')}>
        {live.categories.map((key) => {
          const off = live.hidden.has(key);
          return (
            <button key={key} type="button" className="filtro" aria-pressed={!off} onClick={() => live.toggleCategory(key)}>
              <span className="filtro-color" style={{ background: categoryColor(key) }} aria-hidden="true" />
              <span>{categoryName(t, key, names.get(key) ?? key)}</span>
              <span className="filtro-n">{counts[key]}</span>
            </button>
          );
        })}
        {live.hidden.size > 0 && (
          <button type="button" className="enlace-texto" onClick={live.showAll}>
            {t('live.showAll')}
          </button>
        )}
      </div>

      {selected && <EventCard event={selected} compas={compas} />}

      {live.visibleEvents.length === 0 ? (
        <p className="ayuda">{t('live.events.none')}</p>
      ) : (
        <ul className="lista-vivo" aria-label={t('live.events.list')}>
          {live.visibleEvents.slice(0, shown).map((event) => (
            <li key={event.id}>
              <button
                type="button"
                className="fila-vivo"
                aria-current={live.selection?.kind === 'event' && live.selection.id === event.id ? 'true' : undefined}
                onClick={() => compas.selectEvent(event.id)}
              >
                <span className="fila-punto" style={{ background: categoryColor(event.category) }} aria-hidden="true" />
                <span className="fila-texto">
                  <span className="fila-titulo">{event.title}</span>
                  <span className="fila-dato">
                    {categoryName(t, event.category, event.category_label)}, {formatDate(event.date, lang)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {live.visibleEvents.length > shown && (
        <button type="button" className="secundario" onClick={() => setShown((n) => n + PAGE)}>
          {t('live.more', { n: Math.min(PAGE, live.visibleEvents.length - shown) })}
        </button>
      )}
    </>
  );
}

function EventCard({ event, compas }: { event: NaturalEvent; compas: Compas }) {
  const { t, lang } = useI18n();
  return (
    <div className="ficha" role="region" aria-label={t('live.card')}>
      <p className="ficha-titulo">{event.title}</p>
      <p className="ayuda">
        {categoryName(t, event.category, event.category_label)}, {formatDate(event.date, lang)},{' '}
        {t(event.closed ? 'live.closed' : 'live.open')}
      </p>
      <p className="ficha-enlaces">
        <a href={event.link} target="_blank" rel="noreferrer">
          {t('live.linkEonet')}
        </a>
        {event.source_url && (
          <a href={event.source_url} target="_blank" rel="noreferrer">
            {t('live.linkSource')}
          </a>
        )}
      </p>
      <button type="button" className="primario" onClick={compas.exploreFromLive}>
        {t('live.explore')}
      </button>
      <p className="ayuda">{t('live.exploreHelp')}</p>
    </div>
  );
}

function Urgent({ compas }: { compas: Compas }) {
  const { t, lang } = useI18n();
  const { live } = compas;
  if (live.urgent.status === 'loading') {
    return <p className="estado" role="status">{t('live.urgent.loading')}</p>;
  }
  if (live.urgent.status === 'error') {
    return (
      <div className="estado aviso" role="alert">
        <p>{t('live.urgent.error')}</p>
        <button type="button" className="secundario" onClick={live.reload}>
          {t('err.retry')}
        </button>
      </div>
    );
  }
  const groups = live.urgent.data;
  const selected = live.selectedUrgent;
  return (
    <>
      <p className="ayuda">{t('live.urgent.intro')}</p>
      {selected && (
        <div className="ficha" role="region" aria-label={t('live.card')}>
          <p className="ficha-titulo">{formatDateTime(selected.datetime, lang)}</p>
          <p className="ayuda">{t('live.urgent.stack', { stack: selected.stack, products: selected.products.join(', ') })}</p>
          <p className="ficha-enlaces">
            <a href={selected.browse_url} target="_blank" rel="noreferrer">
              {t('live.urgent.preview')}
            </a>
          </p>
          <button type="button" className="primario" onClick={compas.exploreFromLive}>
            {t('live.explore')}
          </button>
          <p className="ayuda">{t('live.exploreHelp')}</p>
        </div>
      )}
      <ul className="lista-vivo" aria-label={t('live.urgent.list')}>
        {groups.map((group: UrgentGroup) => {
          const id = urgentId(group);
          return (
            <li key={id}>
              <button
                type="button"
                className="fila-vivo"
                aria-current={live.selection?.kind === 'urgent' && live.selection.id === id ? 'true' : undefined}
                onClick={() => compas.selectUrgent(id)}
              >
                <img className="miniatura" src={group.thumbnail} alt="" width={48} height={48} loading="lazy" />
                <span className="fila-texto">
                  <span className="fila-titulo">{formatDateTime(group.datetime, lang)}</span>
                  <span className="fila-dato">{t('live.urgent.stack', { stack: group.stack, products: group.products.join(', ') })}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
