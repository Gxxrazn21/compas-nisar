// Pestaña «NISAR ahora» de En vivo: dónde está el satélite en este instante, cifra a cifra.
import { CirclePlay, LocateFixed } from 'lucide-react';
import { useI18n } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { periodMinutes, stateAt, tleAgeHours } from '../../lib/orbit';
import type { Compas } from '../../state/useCompas';
import { useNow } from '../../state/useSatellite';
import { PAST_MINUTES } from '../stage/satellite';

/** Con elementos de más de una semana la posición calculada se desvía de forma apreciable. */
const OLD_HOURS = 7 * 24;

export function SatellitePanel({ compas, onTour }: { compas: Compas; onTour?: () => void }) {
  const { t, lang } = useI18n();
  const { state, reload } = compas.live.satellite;
  const now = useNow(state.status === 'ready');

  if (state.status === 'loading') {
    return <p className="estado" role="status">{t('sat.loading')}</p>;
  }
  if (state.status === 'error') {
    return (
      <div className="estado aviso" role="alert">
        <p>{state.detail || t('sat.error')}</p>
        <button type="button" className="secundario" onClick={reload}>
          {t('err.retry')}
        </button>
      </div>
    );
  }

  const position = stateAt(state.orbit, new Date(now));
  const age = tleAgeHours(state.tle.epoch, now);
  const ageText =
    age < 48 ? t('sat.ageHours', { n: Math.max(1, Math.round(age)) }) : t('sat.ageDays', { n: Math.round(age / 24) });
  const degrees = (value: number, positive: string, negative: string) =>
    `${formatNumber(Math.abs(value), lang, 2)}° ${value >= 0 ? positive : negative}`;
  const clock = new Date(now).toISOString().slice(11, 19);
  // En inglés las distancias van en millas, como las da la NASA al público de Estados Unidos.
  const toUnit = lang === 'en' ? 0.621371 : 1;

  return (
    <>
      {position ? (
        <div className="ficha satelite-ficha" role="region" aria-label={t('live.tab.satellite')}>
          <p className="ayuda">{t('sat.over')}</p>
          {/* Las cifras cambian cada segundo: no se anuncian solas a los lectores de pantalla. */}
          <p className="ficha-titulo satelite-coordenadas" aria-live="off">
            {degrees(position.lat, t('sat.north'), t('sat.south'))}
            <span aria-hidden="true"> · </span>
            {degrees(position.lon, t('sat.east'), t('sat.west'))}
          </p>
          <dl className="satelite-datos">
            <div>
              <dt>{t('sat.altitude')}</dt>
              <dd>
                {formatNumber(position.altitudeKm * toUnit, lang, 0)} {t('unit.km')}
              </dd>
            </div>
            <div>
              <dt>{t('sat.speed')}</dt>
              <dd>
                {t('sat.speedValue', {
                  kms: formatNumber(position.speedKmS * toUnit, lang, 2),
                  kmh: formatNumber(position.speedKmS * 3600 * toUnit, lang, 0),
                })}
              </dd>
            </div>
            <div>
              <dt>{t('sat.heading')}</dt>
              <dd>{t(position.ascending ? 'sat.ascending' : 'sat.descending')}</dd>
            </div>
            <div>
              <dt>{t('sat.period')}</dt>
              <dd>{t('sat.periodValue', { min: formatNumber(periodMinutes(state.orbit), lang, 1) })}</dd>
            </div>
            <div>
              <dt>{t('sat.time')}</dt>
              <dd>{clock} UTC</dd>
            </div>
          </dl>
          <button type="button" className="primario satelite-centrar" onClick={() => compas.focusSatellite()}>
            <LocateFixed size={17} aria-hidden="true" />
            {t('sat.focus')}
          </button>
        </div>
      ) : (
        <p className="estado aviso" role="alert">{t('sat.old')}</p>
      )}
      {onTour && (
        <button type="button" className="secundario recorrido-entrada" onClick={onTour}>
          <CirclePlay size={17} aria-hidden="true" />
          {t('sat.tour')}
        </button>
      )}
      <p className="ayuda">{t('sat.model')}</p>
      <p className="ayuda">{t('sat.swath')}</p>
      <p className="ayuda">{t('sat.track', { minutes: PAST_MINUTES })}</p>
      <p className="ayuda">{t('sat.source', { age: ageText })}</p>
      {position && (state.tle.stale || age > OLD_HOURS) && (
        <p className="ayuda satelite-aviso" role="status">{t('sat.old')}</p>
      )}
    </>
  );
}
