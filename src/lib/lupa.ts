// Lupa calibrada: resumen en lenguaje llano de las medianas en dB reales de γ⁰.
import type { ChangeStats, ChannelStats, Lang } from '../types';
import { formatNumber } from './format';

function sentence(channel: 'HH' | 'HV', stats: ChannelStats | null, lang: Lang): string | null {
  const before = stats?.median_before_db;
  const after = stats?.median_after_db;
  if (before === undefined || after === undefined || !Number.isFinite(before) || !Number.isFinite(after)) {
    return null;
  }
  const a = formatNumber(before, lang, 1);
  const b = formatNumber(after, lang, 1);
  return lang === 'es'
    ? `El retorno ${channel} pasó de ${a} a ${b} dB.`
    : `The ${channel} return went from ${a} to ${b} dB.`;
}

/** Frases de la lupa: «El retorno HH pasó de −5,0 a −16,4 dB.» Vacío si no hay medianas. */
export function zoomSummary(stats: ChangeStats, lang: Lang): string[] {
  return [sentence('HH', stats.hh, lang), sentence('HV', stats.hv, lang)].filter(
    (text): text is string => text !== null,
  );
}

export function isCalibrated(change: { source?: string } | null | undefined): boolean {
  return change?.source === 'gcov';
}
