import { useState } from 'react';
import { evidenceReview } from '../lib/evidence';
import type { EvidenceReview } from '../lib/evidence';

function read(key: string, date: string): EvidenceReview {
  try { return evidenceReview(JSON.parse(localStorage.getItem(key) ?? 'null'), date); }
  catch { return evidenceReview(null, date); }
}

export function useEvidence(id: string, date: string) {
  const key = `compas.evidence.${id}`;
  const [stored, setStored] = useState<{ key: string; review: EvidenceReview }>(() => ({ key, review: read(key, date) }));
  const review = stored.key === key ? stored.review : read(key, date);
  const update = (next: EvidenceReview) => {
    const clean = evidenceReview(next, date);
    setStored({ key, review: clean });
    try { localStorage.setItem(key, JSON.stringify(clean)); } catch { /* La revisión sigue disponible en memoria. */ }
  };
  return [review, update] as const;
}
