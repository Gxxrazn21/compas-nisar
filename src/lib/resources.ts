// Recursos abiertos que propone el reto «Dancing with the SARs» y que el
// diálogo Método lista con el papel de cada uno en SARitmo.
// Los textos viven en i18n: `resources.<id>.name` y `resources.<id>.use`.

export type ResourceGroup = 'nasa' | 'csa' | 'conae';

export interface Resource {
  id: string;
  group: ResourceGroup;
  url: string;
}

export const RESOURCE_GROUPS: readonly ResourceGroup[] = ['nasa', 'csa', 'conae'];

export const RESOURCES: readonly Resource[] = [
  { id: 'earthdataSearch', group: 'nasa', url: 'https://search.earthdata.nasa.gov/search' },
  { id: 'asfSearch', group: 'nasa', url: 'https://search.asf.alaska.edu/' },
  { id: 'nisarDocs', group: 'nasa', url: 'https://nisar-docs.asf.alaska.edu/' },
  {
    id: 'remoteSensing',
    group: 'nasa',
    url: 'https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/remote-sensing',
  },
  { id: 'sarBasics', group: 'nasa', url: 'https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar' },
  { id: 'arset', group: 'nasa', url: 'https://appliedsciences.nasa.gov/get-involved/training' },
  { id: 'storymaps', group: 'nasa', url: 'https://nisar.jpl.nasa.gov/applications/arcgis-storymaps/' },
  { id: 'societal', group: 'nasa', url: 'https://nisar.jpl.nasa.gov/applications/societal-benefit/' },
  { id: 'uavsar', group: 'nasa', url: 'https://uavsar.jpl.nasa.gov/education/postcards.html' },
  { id: 'rcm', group: 'csa', url: 'https://donnees-data.asc-csa.gc.ca/en/dataset/rcm' },
  { id: 'csaTutorial', group: 'csa', url: 'https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial' },
  { id: 'radarsat1', group: 'csa', url: 'https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1' },
  {
    id: 'saocomCatalog',
    group: 'conae',
    url: 'https://catalogos.conae.gov.ar/catalogo/catalogoSatSaocomInfo.html',
  },
  {
    id: 'saocomAccess',
    group: 'conae',
    url: 'https://www.argentina.gob.ar/noticias/la-informacion-saocom-cada-vez-mas-accesible',
  },
];

export function resourcesOf(group: ResourceGroup): Resource[] {
  return RESOURCES.filter((resource) => resource.group === group);
}
