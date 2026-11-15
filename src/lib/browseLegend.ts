export type BrowseLegend = 'hh-hv' | 'vv-vh' | 'hh' | 'vv' | 'quad' | 'unknown';

/** Modo de la fecha mostrada, no el de la última escena de la pila.
 * Los dos códigos corresponden a frecuencia A y B; NA indica que no se adquirió.
 * Fuente: https://nisar-docs.asf.alaska.edu/nisar-intro/#polarization
 */
export function browseLegend(modeOrGranule: string | undefined): BrowseLegend {
  const match = modeOrGranule?.match(/(?:^|_)\d{4}_([A-Z]{2})([A-Z]{2})(?:_|$)/);
  const code = match?.[1] === 'NA' ? match[2] : match?.[1];
  switch (code) {
    case 'DH': return 'hh-hv';
    case 'DV': return 'vv-vh';
    case 'SH': return 'hh';
    case 'SV': return 'vv';
    case 'QP': return 'quad';
    default: return 'unknown';
  }
}
