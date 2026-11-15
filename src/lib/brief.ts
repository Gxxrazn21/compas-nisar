import type { Lang } from '../types';
import type { buildReport } from './report';
import { EVIDENCE_COPY } from './evidence';

type Report = ReturnType<typeof buildReport>;
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const link = (value: string) => { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? escape(u.href) : ''; } catch { return ''; } };
const imageData = (value: string | null) => value && /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value) ? value : null;

/** HTML portable sin scripts, fuentes remotas, claves o recursos de imagen externos. */
export function buildBriefHtml(report: Report, lang: Lang, image: string | null): string {
  const es = lang === 'es';
  const c = EVIDENCE_COPY[lang];
  const img = imageData(image);
  const fmt = (n: number) => new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(n);
  const title = es ? 'Una señal, una pregunta por verificar' : 'A signal, a question to investigate';
  const rows = report.estadisticas.clases.map((item) => `<tr><td>${escape(item.nombre)}</td><td>${fmt(item.km2)} km²</td></tr>`).join('');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>SARitmo — ${escape(title)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f2efe6;color:#11233a;font:15px/1.5 system-ui,sans-serif}main{max-width:850px;margin:32px auto;padding:30px}header{border-bottom:2px solid #b28723;margin-bottom:20px}h1{font:32px/1.1 Georgia,serif;margin:10px 0}h2{font-size:17px;margin:18px 0 6px}p{margin:6px 0}figure{margin:16px 0}img{display:block;width:100%;height:270px;object-fit:contain;background:#11233a}figcaption,small{font-size:12px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}table{border-collapse:collapse;width:100%;font-size:13px}td{border-bottom:1px solid #b7b8b3;padding:5px 0}td:last-child{text-align:right}a{color:#31567a;overflow-wrap:anywhere}.source{overflow-wrap:anywhere;font-size:11px}.evidence{padding-left:12px;border-left:3px solid #b28723}ul{padding-left:18px;font-size:12px}@page{size:A4;margin:12mm}@media print{body{font-size:10px;background:transparent}main{margin:0;padding:0}h1{font-size:24px}h2{font-size:13px;margin-top:10px}img{height:190px}figure{margin:8px 0}table,figcaption,small{font-size:9px}ul,.source{font-size:8px}section{break-inside:avoid}a{color:inherit}}@media(max-width:600px){main{padding:18px;margin:0}.columns{grid-template-columns:1fr}}
  </style></head><body><main><header><strong>SARitmo · NISAR / NASA–ISRO</strong><h1>${escape(title)}</h1><p>${escape(report.fechas.antes)} → ${escape(report.fechas.despues)} · ${report.fechas.dias_entre_pasadas} ${es ? 'días' : 'days'}</p></header>
  <p>${es ? 'El método señala' : 'The method flags'} <strong>${fmt(report.estadisticas.cambio_km2)} km²</strong> ${es ? 'de cambio de señal entre' : 'of signal change within'} ${fmt(report.area.valida_km2)} km² ${es ? 'con datos. No es un inventario confirmado de daños o inundaciones.' : 'with data. This is not a confirmed damage or flood inventory.'}</p>
  <figure>${img ? `<img src="${img}" alt="${es ? 'Capa georreferenciada de cambio HH' : 'Georeferenced HH change layer'}">` : `<p>${es ? 'Imagen no disponible' : 'Image unavailable'}</p>`}<figcaption>${es ? 'Cambio HH: azul = disminución; naranja = aumento. Sin mapa base. Norte arriba.' : 'HH change: blue = decrease; orange = increase. No basemap. North up.'} ${es ? 'Límites oeste, sur, este, norte' : 'Bounds west, south, east, north'}: ${report.area.limites.map((v) => v.toFixed(5)).join(', ')}.</figcaption></figure>
  <div class="columns"><section><h2>${escape(c.observation)}</h2><p>${escape(report.fuente)} · ${escape(report.unidades)}</p><p>${es ? 'Umbral' : 'Threshold'}: ${report.metodo.threshold_db} dB; ${es ? 'versión del método' : 'method version'} ${escape(report.metodo.version)}.</p><table>${rows}</table><small>${es ? 'Las clases expresan hipótesis; su área depende del método y del umbral.' : 'Classes express hypotheses; their area depends on the method and threshold.'}</small></section>
  <section><h2>${escape(c.independent)}</h2><p class="evidence">${escape(report.evidencia.resumen)}</p><p>${escape(report.evidencia.revision.date)}</p>${report.evidencia.revision.note ? `<p>${escape(report.evidencia.revision.note)}</p>` : ''}<a href="${link(report.evidencia.referencia)}">${escape(c.open)}</a><h2>${escape(c.next)}</h2><p>${escape(c.action)}</p></section></div>
  <section><h2>${es ? 'Procedencia y límites' : 'Provenance and limits'}</h2>${report.escenas.map((s) => `<p class="source">${escape(s.granule)} · ${escape(s.calidad)} · <a href="${link(s.buscador_asf)}">ASF</a></p>`).join('')}<ul>${report.limites.map((s) => `<li>${escape(s)}</li>`).join('')}</ul><p class="source">${es ? 'Generado' : 'Generated'}: ${escape(report.generado)} · <a href="${link(report.enlace)}">${es ? 'Abrir comparación' : 'Open comparison'}</a></p></section></main></body></html>`;
}

export async function layerDataUrl(path: string): Promise<string> {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error('La capa debe ser local.');
  // Renueva también las capas guardadas con un tipo MIME incorrecto por el servidor.
  const response = await fetch(url, { cache: 'reload' });
  if (!response.ok) throw new Error('No se pudo descargar la capa.');
  const blob = await response.blob();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) throw new Error('Formato de imagen no válido.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la capa.'));
    reader.readAsDataURL(blob);
  });
}

export function downloadBrief(name: string, html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
