// Estilo base del escenario: globo, atmósfera de hora azul e imágenes satelitales apagadas
// para que manden los datos del radar.
import type { StyleSpecification } from 'maplibre-gl';

export const ESRI_ATTRIBUTION =
  'Imágenes satelitales: Esri, Maxar, Earthstar Geographics y la comunidad de usuarios de GIS';

export const GIBS_ATTRIBUTION = 'Imágenes ópticas diarias: NASA GIBS, VIIRS (Suomi NPP)';

const NOCHE = '#0a1626';

/** Teselas VIIRS de color verdadero de una fecha (zoom máximo 9: MapLibre amplía a partir de ahí). */
export function gibsTiles(date: string): string[] {
  return [
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
  ];
}

/** Fecha por omisión del mapa óptico mientras no haya una comparación: ayer (UTC). */
export function yesterday(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

export function baseStyle(projection: 'globe' | 'mercator', opticalDate: string = yesterday()): StyleSpecification {
  return {
    version: 8,
    projection: { type: projection },
    sky: {
      'sky-color': '#16314f',
      'horizon-color': '#2a527a',
      'fog-color': NOCHE,
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.6,
      'fog-ground-blend': 0.85,
      // La atmósfera se desvanece al acercarse: en el globo se ve el halo; en un área, no estorba.
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.85, 5, 0.6, 8, 0],
    },
    light: { anchor: 'map', position: [1.5, 200, 40] },
    sources: {
      satelite: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 18,
        attribution: ESRI_ATTRIBUTION,
      },
      // Respaldo de baja resolución: si una tesela detallada falla, se ve esta en lugar de un hueco opaco.
      'satelite-respaldo': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 5,
      },
      optico: {
        type: 'raster',
        tiles: gibsTiles(opticalDate),
        tileSize: 256,
        maxzoom: 9,
        attribution: GIBS_ATTRIBUTION,
      },
    },
    layers: [
      { id: 'fondo', type: 'background', paint: { 'background-color': NOCHE } },
      {
        id: 'satelite-respaldo',
        type: 'raster',
        source: 'satelite-respaldo',
        paint: {
          'raster-saturation': -0.5,
          'raster-brightness-max': 0.82,
          'raster-resampling': 'linear',
        },
      },
      {
        id: 'satelite',
        type: 'raster',
        source: 'satelite',
        paint: {
          'raster-saturation': -0.5,
          'raster-brightness-max': 0.82,
          'raster-contrast': 0,
          'raster-fade-duration': 150,
        },
      },
      {
        id: 'optico',
        type: 'raster',
        source: 'optico',
        layout: { visibility: 'none' },
        paint: { 'raster-fade-duration': 150 },
      },
    ],
  };
}
