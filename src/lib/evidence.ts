import type { Bounds, Lang } from '../types';

export type ReviewStatus = 'not_reviewed' | 'consistent' | 'different' | 'no_data';
export interface EvidenceReview { status: ReviewStatus; date: string; note: string }
const STATUSES: ReviewStatus[] = ['not_reviewed', 'consistent', 'different', 'no_data'];

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

/** Las notas locales son una revisión visual del usuario, nunca una validación automática. */
export function evidenceReview(raw: unknown, fallbackDate: string): EvidenceReview {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    status: STATUSES.includes(data.status as ReviewStatus) ? data.status as ReviewStatus : 'not_reviewed',
    date: validDate(data.date) ? data.date : fallbackDate,
    note: typeof data.note === 'string' ? data.note.slice(0, 1000) : '',
  };
}

export const REVIEW_LABELS: Record<Lang, Record<ReviewStatus, string>> = {
  es: { not_reviewed: 'Sin revisar', consistent: 'Patrón visual compatible', different: 'Patrón visual diferente', no_data: 'Sin datos comparables' },
  en: { not_reviewed: 'Not reviewed', consistent: 'Visually consistent pattern', different: 'Visually different pattern', no_data: 'No comparable data' },
};

export function evidenceSummary(review: EvidenceReview, lang: Lang): string {
  if (review.status === 'not_reviewed') return lang === 'es'
    ? 'Corroboración independiente pendiente: Sentinel-1 sin revisar; no hay verificación de campo registrada.'
    : 'Independent corroboration pending: Sentinel-1 not reviewed; no field verification recorded.';
  if (review.status === 'no_data') return lang === 'es'
    ? 'Revisión visual: sin datos comparables. Esto no significa ausencia de agua o de cambio.'
    : 'Visual review: no comparable data. This does not mean no water or no change.';
  return lang === 'es'
    ? `Revisión visual del usuario: ${REVIEW_LABELS.es[review.status].toLowerCase()}. Esta anotación no confirma el fenómeno ni mide concordancia estadística.`
    : `User visual review: ${REVIEW_LABELS.en[review.status].toLowerCase()}. This note does not confirm the phenomenon or measure statistical agreement.`;
}

export function worldviewLink(bounds: Bounds, date: string): string {
  const query = new URLSearchParams({
    l: 'OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1', t: date,
    v: bounds.map((value) => Number(value.toFixed(5))).join(','),
  });
  return `https://worldview.earthdata.nasa.gov/?${query}`;
}

export const EVIDENCE_COPY = {
  es: {
    title: 'De la señal a la evidencia', observation: 'Qué observamos',
    scientific: 'Retorno calibrado de NISAR. El cambio de señal no identifica por sí solo su causa.',
    preview: 'Vista previa normalizada. Orienta sobre patrones de cambio; sus áreas no son un inventario confirmado.',
    independent: 'Contraste independiente', open: 'Revisar agua en Sentinel-1',
    instruction: 'Compara la misma zona y fechas próximas. Comprueba cobertura y leyenda: una imagen vacía no demuestra ausencia de agua. La banda C y la banda L pueden responder distinto a la vegetación.',
    date: 'Fecha consultada en Sentinel-1', status: 'Tu revisión visual', note: 'Observación y referencia local (opcional)',
    saved: 'Se guarda en este navegador y se incluye en el informe. No se envía a otras personas.',
    next: 'Siguiente comprobación', action: 'Contrasta las zonas señaladas con niveles de río, lluvia y observaciones locales fechadas. Prioriza qué revisar en campo; no interpretes estas clases como una alerta.',
    noPopulation: 'La población GPW corresponde a 2020: la capa de contexto no estima personas afectadas.',
  },
  en: {
    title: 'From signal to evidence', observation: 'What we observed',
    scientific: 'Calibrated NISAR return. A signal change alone does not identify its cause.',
    preview: 'Normalized preview. It helps locate change patterns; its areas are not a confirmed inventory.',
    independent: 'Independent comparison', open: 'Review water in Sentinel-1',
    instruction: 'Compare the same area at nearby dates. Check coverage and the legend: an empty image is not evidence of no water. C-band and L-band can respond differently to vegetation.',
    date: 'Date reviewed in Sentinel-1', status: 'Your visual review', note: 'Observation and local reference (optional)',
    saved: 'Saved in this browser and included in the report. It is not sent to other people.',
    next: 'Next check', action: 'Compare highlighted areas with dated river levels, rainfall and local observations. Prioritize field checks; do not interpret these classes as an alert.',
    noPopulation: 'GPW population is from 2020: the context layer does not estimate affected people.',
  },
};
