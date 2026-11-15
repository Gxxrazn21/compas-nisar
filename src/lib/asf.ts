// Enlace directo a un producto NISAR en ASF Data Search (Vertex).
//
// Vertex solo aplica `granule=` para resaltar una escena ya cargada; sin una búsqueda
// abre el mapa vacío. Por eso se arma una búsqueda por lista de productos con el nombre
// exacto, se pide cargar resultados y se deja seleccionado ese mismo producto.
const ASF_SEARCH = 'https://search.asf.alaska.edu/#/';

/** URL que abre Vertex con el producto indicado ya buscado y seleccionado. */
export function asfProductUrl(granule: string): string {
  const params = new URLSearchParams({
    searchType: 'List Search',
    listSearchType: 'Product',
    searchList: granule,
    resultsLoaded: 'true',
    granule,
  });
  // Vertex lee el hash con espacios codificados como %20, no como '+'.
  return `${ASF_SEARCH}?${params.toString().replace(/\+/g, '%20')}`;
}
