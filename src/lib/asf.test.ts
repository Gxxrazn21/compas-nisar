import { describe, expect, it } from 'vitest';
import { asfProductUrl } from './asf';

const GRANULE =
  'NISAR_L2_PR_GCOV_033_161_A_175_2005_DHDH_A_20261023T100224_20261023T100259_P05036_N_F_J_001';

describe('asfProductUrl', () => {
  it('abre una búsqueda por lista con el producto exacto y lo deja seleccionado', () => {
    const url = asfProductUrl(GRANULE);
    expect(url.startsWith('https://search.asf.alaska.edu/#/?')).toBe(true);
    const params = new URLSearchParams(url.split('#/?')[1]);
    expect(params.get('searchType')).toBe('List Search');
    expect(params.get('listSearchType')).toBe('Product');
    expect(params.get('searchList')).toBe(GRANULE);
    expect(params.get('resultsLoaded')).toBe('true');
    expect(params.get('granule')).toBe(GRANULE);
  });

  it('codifica los espacios como %20', () => {
    expect(asfProductUrl(GRANULE)).toContain('searchType=List%20Search');
    expect(asfProductUrl(GRANULE)).not.toContain('+');
  });
});
