import { useI18n } from '../../i18n';
import { EVIDENCE_COPY, REVIEW_LABELS, evidenceSummary, worldviewLink } from '../../lib/evidence';
import type { EvidenceReview, ReviewStatus } from '../../lib/evidence';
import type { ChangeResult } from '../../types';

export function EvidencePanel({ change, review, onReview }: {
  change: ChangeResult; review: EvidenceReview; onReview: (review: EvidenceReview) => void;
}) {
  const { lang } = useI18n();
  const c = EVIDENCE_COPY[lang];
  return <section className="bloque evidencia" aria-labelledby="evidencia-h">
    <h3 id="evidencia-h">{c.title}</h3>
    <p>{change.source === 'gcov' ? c.scientific : c.preview}</p>
    <p className="evidencia-estado" role="status">{evidenceSummary(review, lang)}</p>
    <details className="desplegable">
      <summary>{c.independent}</summary>
      <p>{c.instruction}</p>
      <label>{c.date}<input type="date" value={review.date} onChange={(e) => {
        if (e.target.value) onReview({ ...review, status: 'not_reviewed', date: e.target.value });
      }} /></label>
      <a href={worldviewLink(change.bounds, review.date)} target="_blank" rel="noreferrer">{c.open}</a>
      <label>{c.status}<select value={review.status} onChange={(e) => onReview({ ...review, status: e.target.value as ReviewStatus })}>
        {Object.entries(REVIEW_LABELS[lang]).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select></label>
      <label>{c.note}<textarea rows={3} maxLength={1000} value={review.note} onChange={(e) => onReview({ ...review, note: e.target.value })} /></label>
      <p className="ayuda">{c.saved}</p>
    </details>
    <p><strong>{c.next}.</strong> {c.action}</p>
    <p className="ayuda">{c.noPopulation}</p>
  </section>;
}
