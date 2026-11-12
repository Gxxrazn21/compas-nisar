// Barra del mapa: capas agrupadas, opacidad, mapa base, acercar, alejar y volver al área.
import { LocateFixed, Minus, Plus } from 'lucide-react';
import type { RefObject } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { formatDate } from '../../lib/format';
import type { ChangeResult, MapLayer } from '../../types';
import { ContextControl } from './ContextControl';
import type { ContextProps } from './ContextControl';
import type { StageApi } from './Stage';

interface Props {
  change: ChangeResult | null;
  layer: MapLayer;
  opacity: number;
  /** Solo opacidad y zoom (historia de interferogramas: no hay capas de cambio). */
  compact?: boolean;
  basemap: 'sat' | 'optico';
  /** Fecha del mapa óptico, si hay una comparación. */
  opticalDate: string | null;
  onLayer: (layer: MapLayer) => void;
  onOpacity: (value: number) => void;
  onBasemap: (basemap: 'sat' | 'optico') => void;
  onRecenter: () => void;
  /** Capas de contexto de NASA GIBS; sin esto, el control no aparece. */
  context?: ContextProps;
  stageApi: RefObject<StageApi | null>;
}

type LayerKey = 'before' | 'after' | 'swipe' | 'change_hh' | 'change_hv' | 'classes' | 'composite';

const GROUPS: Array<{ id: 'image' | 'change' | 'reading'; layers: LayerKey[] }> = [
  { id: 'image', layers: ['before', 'after', 'swipe'] },
  { id: 'change', layers: ['change_hh', 'change_hv'] },
  { id: 'reading', layers: ['classes', 'composite'] },
];

export function MapToolbar(props: Props) {
  const { change, layer, opacity, compact, basemap, opticalDate, onLayer, onOpacity, onBasemap, onRecenter, context, stageApi } = props;
  const { t, lang } = useI18n();
  const current = layer === 'dance' ? null : layer;
  const swipe = layer === 'swipe';
  const optical = basemap === 'optico' && opticalDate !== null && !swipe;

  return (
    <div className="barra-mapa" data-cubre="bottom">
      {optical && opticalDate && (
        <p className="optico-nota" role="status">
          {t('basemap.note', { date: formatDate(opticalDate, lang) })}
        </p>
      )}
      {!compact && (
        <div className="capas" role="group" aria-label={t('layer.group')}>
          {GROUPS.map((group) => {
            const layers = group.layers.filter((key) => key !== 'change_hv' || Boolean(change?.layers.change_hv));
            return (
              <div key={group.id} className="capas-grupo" role="group" aria-label={t(`layer.group.${group.id}` as Key)}>
                <span className="capas-rotulo" aria-hidden="true">
                  {t(`layer.group.${group.id}` as Key)}
                </span>
                <div className="capas-botones">
                  {layers.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="capa"
                      aria-pressed={current === key}
                      disabled={!change}
                      title={t(`layer.hint.${key}` as Key)}
                      onClick={() => onLayer(key)}
                    >
                      {t(`layer.${key}` as Key)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <label className="opacidad">
        <span>{t('map.opacity')}</span>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.05}
          value={opacity}
          disabled={!change && !compact}
          onChange={(event) => onOpacity(Number(event.target.value))}
        />
      </label>
      {opticalDate && (
        <div className="capas mapa-base" role="group" aria-label={t('basemap.group')}>
          <button type="button" className="capa" aria-pressed={basemap === 'sat'} onClick={() => onBasemap('sat')}>
            {t('basemap.sat')}
          </button>
          <button
            type="button"
            className="capa"
            aria-pressed={basemap === 'optico'}
            disabled={swipe}
            title={swipe ? t('basemap.swipeHint') : t('basemap.hint')}
            onClick={() => onBasemap('optico')}
          >
            {t('basemap.optical')}
          </button>
        </div>
      )}
      {context && !compact && <ContextControl {...context} />}
      <div className="zoom" role="group" aria-label={t('map.zoomGroup')}>
        <button type="button" className="icono" onClick={() => stageApi.current?.zoomIn()} aria-label={t('map.zoomIn')} title={t('map.zoomIn')}>
          <Plus size={18} aria-hidden="true" />
        </button>
        <button type="button" className="icono" onClick={() => stageApi.current?.zoomOut()} aria-label={t('map.zoomOut')} title={t('map.zoomOut')}>
          <Minus size={18} aria-hidden="true" />
        </button>
        <button type="button" className="icono" onClick={onRecenter} aria-label={t('map.backToArea')} title={t('map.backToArea')}>
          <LocateFixed size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
