// Exportar: informe JSON de la comparación, descarga de las capas PNG y enlace permanente.
import { useState } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { buildReport, copyText, downloadJson } from '../../lib/report';
import type { ChangeResult, Stack } from '../../types';

interface Props {
  change: ChangeResult;
  stack: Stack | null;
  lens: string;
}

const LAYER_KEYS = ['before', 'after', 'change_hh', 'change_hv', 'classes', 'composite'] as const;

export function ExportBlock({ change, stack, lens }: Props) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const calibrated = change.source === 'gcov';

  const limits = (): string[] => {
    const keys: Key[] = calibrated
      ? ['limits.cal.1', 'limits.cal.2', 'limits.cal.3', 'limits.4']
      : ['limits.1', 'limits.2', 'limits.3', 'limits.4'];
    const list = keys.map((key) => t(key));
    if ([change.before, change.after].some((scene) => scene.quality !== 'validated')) list.push(t('limits.provisional'));
    return list;
  };

  const download = () => {
    const report = buildReport(change, {
      lang,
      lens,
      stack,
      link: window.location.href,
      origin: window.location.origin,
      limits: limits(),
      generatedAt: new Date().toISOString(),
    });
    const name = `compas-${change.stack}-${change.before.date}-${change.after.date}${calibrated ? '-lupa' : ''}.json`;
    downloadJson(name, report);
  };

  const copy = async () => {
    const ok = await copyText(window.location.href);
    setCopied(ok ? 'ok' : 'fail');
    window.setTimeout(() => setCopied(null), 3500);
  };

  const layers = LAYER_KEYS.filter((key) => Boolean(change.layers[key]));

  return (
    <section className="bloque exportar" aria-labelledby="exportar-h">
      <h3 id="exportar-h">{t('export.title')}</h3>
      <div className="exportar-botones">
        <button type="button" className="secundario" onClick={download}>
          {t('export.json')}
        </button>
        <button type="button" className="secundario" onClick={() => void copy()}>
          {t('export.copy')}
        </button>
      </div>
      <p className="ayuda" role="status" aria-live="polite">
        {copied === 'ok' ? t('export.copied') : copied === 'fail' ? t('export.copyFail') : t('export.help')}
      </p>
      <details className="desplegable">
        <summary>{t('export.layers')}</summary>
        <ul className="descargas">
          {layers.map((key) => (
            <li key={key}>
              <a href={change.layers[key] ?? '#'} download={`compas-${change.id}-${key}.png`}>
                {t(`layer.${key}` as Key)}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
