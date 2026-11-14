import type { ChangeResult, ChangeStory, SeriesResult, Stack } from '../types';

export interface DemoPackage {
  prepared_at: string;
  manifest: { schema_version: number; methods: Record<string, string | number>; files: Record<string, { sha256: string; bytes: number }> };
  story: ChangeStory;
  stack: Stack;
  change: ChangeResult;
  zoom: ChangeResult;
  series: SeriesResult;
}

/** Rechaza respuestas incompletas antes de renderizar; integridad criptográfica la verifica el servidor. */
export function isDemoPackage(value: unknown): value is DemoPackage {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<DemoPackage>;
  return Boolean(p.story?.id === 'mojana' && p.zoom?.source === 'gcov' && p.zoom.layers?.change_hh &&
    p.change?.layers?.change_hh && p.stack?.scenes?.length && p.series?.frames?.length &&
    p.manifest?.schema_version === 1 && p.prepared_at && Number.isFinite(Date.parse(p.prepared_at)));
}
