// Procedencia y límites: siempre a un clic, nunca escondidos.
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { formatDate } from '../../lib/format';
import type { ChangeResult, Scene, Stack } from '../../types';

const ASF_SEARCH = 'https://search.asf.alaska.edu/#/?granule=';

function SceneRow({ label, scene }: { label: string; scene: Scene }) {
  const { t, lang } = useI18n();
  const quality = t(`prov.quality.${scene.quality}` as Key);
  return (
    <div className="prov-fila">
      <dt>{label}</dt>
      <dd>
        <span className="prov-fecha">
          {formatDate(scene.date, lang)}, {quality}
        </span>
        <span className="prov-id">{scene.granule}</span>
        <span className="prov-id">
          {t('prov.mode', { mode: scene.mode })}, {t('prov.cycle', { cycle: scene.cycle })}
        </span>
        <a
          href={`${ASF_SEARCH}${encodeURIComponent(scene.granule)}`}
          target="_blank"
          rel="noreferrer"
          aria-label={t('prov.asfLabel', { date: formatDate(scene.date, lang) })}
        >
          {t('prov.asf')}
        </a>
      </dd>
    </div>
  );
}

interface Props {
  change: ChangeResult;
  stack: Stack | null;
  onMethod: () => void;
}

export function Provenance({ change, stack, onMethod }: Props) {
  const { t } = useI18n();
  const direction = stack ? t(`prov.direction.${stack.direction}` as Key) : '';
  const provisional = [change.before, change.after].some((scene) => scene.quality !== 'validated');
  const calibrated = change.source === 'gcov';

  return (
    <>
      <details className="desplegable">
        <summary>{t('prov.title')}</summary>
        <dl className="prov">
          <SceneRow label={t('prov.before')} scene={change.before} />
          <SceneRow label={t('prov.after')} scene={change.after} />
        </dl>
        {stack && (
          <p className="prov-texto">
            {t('prov.track', { track: stack.track, frame: stack.frame, direction })}.{' '}
            {t(change.dual_pol ? 'prov.pol.dual' : 'prov.pol.single')}.
          </p>
        )}
        <p className="prov-texto">{t(`prov.georef.${change.georef}` as Key)}</p>
        {calibrated && change.resolution_m !== undefined && (
          <p className="prov-texto">{t('prov.resolution', { m: change.resolution_m })}</p>
        )}
      </details>
      <details className="desplegable">
        <summary>{t('limits.title')}</summary>
        <ul className="limites">
          {calibrated ? (
            <>
              <li>{t('limits.cal.1')}</li>
              <li>{t('limits.cal.2')}</li>
              <li>{t('limits.cal.3')}</li>
            </>
          ) : (
            <>
              <li>{t('limits.1')}</li>
              <li>{t('limits.2')}</li>
              <li>{t('limits.3')}</li>
            </>
          )}
          <li>{t('limits.4')}</li>
          {provisional && <li>{t('limits.provisional')}</li>}
        </ul>
        <button type="button" className="enlace-texto" onClick={onMethod}>
          {t('limits.method')}
        </button>
      </details>
    </>
  );
}
