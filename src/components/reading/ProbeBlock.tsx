// Sonda: valores de HH y HV en el punto donde se hizo clic.
import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';
import { formatDb, formatNumber } from '../../lib/format';
import { className } from '../../lib/lens';
import type { ProbeState } from '../../state/useCompas';
import type { ProbeChannel } from '../../types';

interface Props {
  probe: ProbeState | null;
  lens: string;
  calibrated?: boolean;
}

export function ProbeBlock({ probe, lens, calibrated = false }: Props) {
  const { t, lang } = useI18n();
  const section = useRef<HTMLElement>(null);
  const point = probe?.point;
  useEffect(() => {
    if (point) section.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [point]);
  let body;
  if (!probe) {
    body = <p className="ayuda">{t('probe.hint')}</p>;
  } else if (probe.status === 'loading') {
    body = <p className="ayuda" role="status">{t('probe.loading')}</p>;
  } else if (probe.status === 'error') {
    body = <p className="ayuda" role="alert">{t('probe.error')}</p>;
  } else if (!probe.result || !probe.result.valid) {
    body = <p className="ayuda" role="status">{t('probe.invalid')}</p>;
  } else {
    const { hh, hv } = probe.result;
    const key = probe.result.class;
    const row = (label: string, pick: (channel: ProbeChannel) => number, signed = false) => (
      <tr>
        <th scope="row">{label}</th>
        <td>{formatDb(pick(hh), lang, signed)}</td>
        {hv !== null && <td>{formatDb(pick(hv), lang, signed)}</td>}
      </tr>
    );
    body = (
      <div role="status">
        <p className="sonda-clase">{key ? className(lens, key, lang) : t('probe.stable')}</p>
        <table className="sonda-tabla">
          <thead>
            <tr>
              <td />
              <th scope="col">HH</th>
              {hv !== null && <th scope="col">HV</th>}
            </tr>
          </thead>
          <tbody>
            {row(t('probe.before'), (channel) => channel.before_db)}
            {row(t('probe.after'), (channel) => channel.after_db)}
            {row(t('probe.delta'), (channel) => channel.delta_db, true)}
          </tbody>
        </table>
        <p className="ayuda">
          {t('probe.at', { lon: formatNumber(probe.result.lon, lang, 3), lat: formatNumber(probe.result.lat, lang, 3) })}.{' '}
          {t(calibrated ? 'probe.noteCal' : 'probe.note')}
        </p>
      </div>
    );
  }
  return (
    <section ref={section} className="bloque" aria-labelledby="sonda-h">
      <h3 id="sonda-h">{t('probe.title')}</h3>
      {body}
    </section>
  );
}
