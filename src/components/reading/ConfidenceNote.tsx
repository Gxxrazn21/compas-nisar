// Aviso de confianza: serena y honesta, no un error. Las razones se componen con las cifras
// de la respuesta para que existan en ambos idiomas.
import { useI18n } from '../../i18n';
import { formatNumber, formatPercent } from '../../lib/format';
import type { ChangeStats } from '../../types';

export function ConfidenceNote({ stats, calibrated = false }: { stats: ChangeStats; calibrated?: boolean }) {
  const { t, lang } = useI18n();
  const level = stats.confidence.level;
  const reasons: string[] = [];
  if (!calibrated && stats.correlation < 0.85) {
    reasons.push(t('conf.reason.corr', { value: formatNumber(stats.correlation, lang, 2) }));
  }
  // Solo el browse tiene ajuste entre fechas; la lupa calibrada no normaliza.
  if (!calibrated && stats.hh.inliers !== undefined && stats.hh.inliers < 0.8) {
    reasons.push(t('conf.reason.fit', { value: formatPercent(stats.hh.inliers * 100, lang) }));
  }

  if (level === 'alta') {
    return <p className="confianza alta">{t('conf.alta')}</p>;
  }
  if (calibrated) {
    return (
      <div className={`confianza ${level}`} role="note">
        <p className="confianza-titulo">{t('conf.gcov.title')}</p>
        <p>{t('conf.gcov.text')}</p>
      </div>
    );
  }
  return (
    <div className={`confianza ${level}`} role="note">
      <p className="confianza-titulo">{t(level === 'media' ? 'conf.media' : 'conf.baja')}</p>
      <p>{t(level === 'media' ? 'conf.lead.media' : 'conf.lead.baja')}</p>
      {reasons.length > 0 && (
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
