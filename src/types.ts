// Tipos de la API de Compás. Fuente de verdad: docs/contrato-api.md (versión 3).
// Los nombres de campo se copian tal cual del contrato.

export type Lang = 'es' | 'en';

/** Texto bilingüe de data/stories.json. Se tolera una cadena simple por robustez. */
export type Localized = { es: string; en: string } | string;

/** [oeste, sur, este, norte] en grados. */
export type Bounds = [number, number, number, number];
export type LonLat = [number, number];
/** Esquinas de una fuente `image` de MapLibre: NO, NE, SE, SO. */
export type Corners = [LonLat, LonLat, LonLat, LonLat];

export type Quality = 'validated' | 'provisional' | 'beta';
export type Georef = 'kml' | 'stack-kml' | 'footprint' | 'product';
export type ConfidenceLevel = 'alta' | 'media' | 'baja';

export interface Scene {
  id: string;
  granule: string;
  date: string;
  datetime: string;
  cycle: number;
  mode: string;
  collection: string;
  quality: Quality;
  analyzable: boolean;
  thumbnail: string;
  browse_url: string;
  download_url: string;
}

export interface Stack {
  id: string;
  track: number;
  frame: number;
  direction: 'ASCENDING' | 'DESCENDING' | string;
  polarizations: string[];
  footprint: { type: 'Polygon'; coordinates: LonLat[][] } | null;
  first: string;
  last: string;
  analyzable_count: number;
  scenes: Scene[];
}

/** Capas que entrega /api/change. `change_hv` es null en polarización simple. */
export interface ChangeLayers {
  before: string;
  after: string;
  change_hh: string;
  change_hv: string | null;
  classes: string;
  composite: string;
}

export type ClassKey =
  | 'agua_nueva'
  | 'agua_retirada'
  | 'veg_inundada'
  | 'veg_perdida'
  | 'veg_aumento'
  | 'aumento'
  | 'disminucion';

export interface ClassStat {
  key: ClassKey;
  /** Etiqueta del backend: no se muestra; el nombre visible lo pone el lente. */
  label: string;
  km2: number;
  pct: number;
  color: string;
}

export interface Histogram {
  edges: number[];
  counts: number[];
}

/**
 * Estadísticas de un canal. Con `source: "browse"` vienen `gain`, `bias`, `inliers` y `range`;
 * con `source: "gcov"` (lupa calibrada) vienen en su lugar las medianas en dB reales.
 */
export interface ChannelStats {
  gain?: number;
  bias?: number;
  inliers?: number;
  range?: [number, number];
  median_before_db?: number;
  median_after_db?: number;
  p5: number;
  p95: number;
  hist: Histogram;
}

export interface ChangeStats {
  valid_km2: number;
  changed_km2: number;
  changed_pct: number;
  correlation: number;
  confidence: { level: ConfidenceLevel; reasons: string[] };
  classes: ClassStat[];
  hh: ChannelStats;
  hv: ChannelStats | null;
}

export interface ChangeMethod {
  version: number | string;
  formula: string;
  c?: number;
  threshold_db: number;
  filter: string;
  dark_db?: number;
  note: string;
}

/** `browse`: imagen de vista previa (dB aproximados). `gcov`: lupa calibrada (dB reales de γ⁰). */
export type ChangeSource = 'browse' | 'gcov';

export interface ChangeResult {
  id: string;
  stack: string;
  before: Scene;
  after: Scene;
  days_between: number;
  dual_pol: boolean;
  georef: Georef;
  /** Ausente en las respuestas antiguas: equivale a `browse`. */
  source?: ChangeSource;
  resolution_m?: number;
  bounds: Bounds;
  coordinates: Corners;
  size: [number, number];
  layers: ChangeLayers;
  stats: ChangeStats;
  method: ChangeMethod;
  limitations: string[];
}

export interface ProbeChannel {
  before_db: number;
  after_db: number;
  delta_db: number;
}

export type ProbeResult =
  | { valid: false }
  | {
      lon: number;
      lat: number;
      valid: true;
      class: ClassKey | null;
      label: string | null;
      hh: ProbeChannel;
      hv: ProbeChannel | null;
    };

export interface SeriesPoint {
  date: string;
  granule: string;
  quality: Quality;
  hh_db: number | null;
  hv_db: number | null;
}

export interface SeriesFrame {
  date: string;
  url: string;
}

export interface SeriesResult {
  stack: string;
  point: LonLat;
  dual_pol: boolean;
  series: SeriesPoint[];
  bounds: Bounds;
  coordinates: Corners;
  frames: SeriesFrame[];
}

export interface StoryStep {
  layer: StepLayer;
  title: Localized;
  text: Localized;
}

/** Ventana de la lupa calibrada de una historia. */
export interface ZoomWindow {
  lon: number;
  lat: number;
  size_km: number;
}

interface StoryBase {
  id: string;
  lens: string;
  title: Localized;
  place: Localized;
  country: Localized;
  tempo?: Localized;
  kicker?: Localized;
  center: LonLat;
  summary: Localized;
  steps: StoryStep[];
  sources: { label: Localized; url: string }[];
}

/** Historia de cambio. Sin `zoom` de cámara, se encuadra su `aoi`. */
export interface ChangeStory extends StoryBase {
  kind?: 'change';
  /** Zoom de cámara (opcional). */
  zoom?: number;
  /** Ventana de la lupa calibrada de la historia. */
  lupa?: ZoomWindow;
  aoi: Bounds;
  stack: string;
  before: string;
  after: string;
}

export interface InterferogramStory extends StoryBase {
  kind: 'interferogram';
  /** Zoom de cámara. */
  zoom: number;
  point: LonLat;
  limit: number;
}

export type Story = ChangeStory | InterferogramStory;

export function isInterferogramStory(story: Story | null | undefined): story is InterferogramStory {
  return story?.kind === 'interferogram';
}

export function isChangeStory(story: Story | null | undefined): story is ChangeStory {
  return Boolean(story) && story?.kind !== 'interferogram';
}

export interface Health {
  status: string;
  version: string;
  nasa_key: boolean;
  earthdata?: boolean;
}

export interface StacksResult {
  point: LonLat;
  stacks: Stack[];
}

export interface NaturalEvent {
  id: string;
  title: string;
  category: string;
  category_label: string;
  date: string;
  lon: number;
  lat: number;
  closed: boolean;
  link: string;
  source_url: string;
}

export interface UrgentScene {
  granule: string;
  product: string;
  datetime: string;
  stack: string;
  footprint: { type: 'Polygon'; coordinates: LonLat[][] } | null;
  center: LonLat;
  thumbnail: string;
  browse_url: string;
}

export interface Interferogram {
  granule: string;
  reference_date: string;
  secondary_date: string;
  track: number;
  frame: number;
  direction: string;
  image: string;
  coordinates: Corners;
  georef: string;
  footprint: { type: 'Polygon'; coordinates: LonLat[][] } | null;
}

export interface EarthToday {
  date: string;
  caption: string;
  image: string;
  source: string;
}

/** Capas que puede pedir un paso de historia. */
export type StepLayer =
  | 'before'
  | 'after'
  | 'swipe'
  | 'change_hh'
  | 'classes'
  | 'dance'
  | 'zoom'
  | 'interferogram';

/** Capas que el mapa sabe mostrar. `dance` la activa la partitura. */
export type MapLayer =
  | 'before'
  | 'after'
  | 'swipe'
  | 'change_hh'
  | 'change_hv'
  | 'classes'
  | 'composite'
  | 'dance';
