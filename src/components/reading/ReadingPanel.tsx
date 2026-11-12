// Panel de lectura (derecha): frase resumen, confianza, clases, sonda, lupa, histograma, exportar, procedencia.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { formatArea, formatBetween, formatNumber } from '../../lib/format';
import { zoomSummary } from '../../lib/lupa';
import type { ChangeState } from '../../state/useChange';
import type { ProbeState } from '../../state/useCompas';
import type { Stack } from '../../types';
import { ClassList } from './ClassList';
import { ConfidenceNote } from './ConfidenceNote';
import { ExportBlock } from './ExportBlock';
import { Histogram } from './Histogram';
import { CalibratedBanner, LupaOpener } from './LupaBlock';
import type { LupaControls } from './LupaBlock';
import { ProbeBlock } from './ProbeBlock';
import { Provenance } from './Provenance';

interface Props {
  state: ChangeState;
  lens: string;
  stack: Stack | null;
  probe: ProbeState | null;
  lupa: LupaControls;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  onMethod: () => void;
}

const ERROR_TEXT: Record<string, Key> = {
  network: 'err.network',
  notFound: 'err.notFound',
  upstream: 'err.upstream',
  generic: 'err.generic',
};

function Loading({ elapsed }: { elapsed: number }) {
  const { t } = useI18n();
  return (
    <div className="carga" role="status">
      <span className="carga-aguja" aria-hidden="true" />
      <p className="carga-titulo">{t('load.title')}</p>
      <p>{t('load.fresh')}</p>
      {elapsed >= 2 && <p className="ayuda">{t('load.elapsed', { s: elapsed })}</p>}
      {elapsed >= 30 && <p className="ayuda">{t('load.slow')}</p>}
    </div>
  );
}

/** Carga de la lupa: dice qué pasa, porque la primera vez tarda entre 20 y 40 segundos. */
function LoadingLupa({ elapsed, lupa }: { elapsed: number; lupa: LupaControls }) {
  const { t, lang } = useI18n();
  const phase = elapsed < 6 ? 'lupa.load.open' : elapsed < 22 ? 'lupa.load.read' : 'lupa.load.calc';
  return (
    <div className="carga" role="status">
      <span className="carga-aguja" aria-hidden="true" />
      <p className="carga-titulo">{t('lupa.load.title')}</p>
      <p>{t('lupa.load.text', { size: formatNumber(lupa.target?.size_km ?? lupa.size, lang) })}</p>
      <p className="carga-fase">{t(phase as Key)}</p>
      <p className="ayuda">{t('lupa.load.cache')}</p>
      {elapsed >= 2 && <p className="ayuda">{t('load.elapsed', { s: elapsed })}</p>}
      {elapsed >= 45 && <p className="ayuda">{t('load.slow')}</p>}
      <button type="button" className="secundario" onClick={lupa.onClose}>
        {t('lupa.load.cancel')}
      </button>
    </div>
  );
}

function Failure({ state, lupa }: { state: ChangeState; lupa: LupaControls }) {
  const { t } = useI18n();
  const error = state.error;
  let text: string;
  if (error?.kind === 'invalid') {
    text = error.detail ? t('err.invalid', { detail: error.detail }) : t('err.invalidPlain');
  } else if (error?.kind === 'upstream' && error.detail && lupa.target) {
    text = error.detail;
  } else {
    text = t(ERROR_TEXT[error?.kind ?? 'generic'] ?? 'err.generic');
  }
  return (
    <div className="falla" role="alert">
      <p className="falla-titulo">{t(lupa.target ? 'lupa.err.title' : 'err.title')}</p>
      <p>{text}</p>
      <div className="falla-acciones">
        <button type="button" className="secundario" onClick={state.retry}>
          {t('err.retry')}
        </button>
        {lupa.target && (
          <button type="button" className="secundario" onClick={lupa.onClose}>
            {t('lupa.back')}
          </button>
        )}
      </div>
    </div>
  );
}

export function ReadingPanel({ state, lens, stack, probe, lupa, collapsed, onCollapse, onMethod }: Props) {
  const { t, lang } = useI18n();
  const { change, status } = state;
  const calibrated = change?.source === 'gcov';

  if (collapsed) {
    return (
      <aside className="panel panel-der lectura plegada" data-cubre="right" aria-label={t('read.title')}>
        <button type="button" className="plegar" onClick={() => onCollapse(false)} aria-expanded={false}>
          <ChevronLeft size={18} aria-hidden="true" />
          {t('read.expand')}
        </button>
      </aside>
    );
  }

  return (
    <aside className="panel panel-der lectura" data-cubre="right" aria-label={t('read.title')} aria-busy={status === 'loading'}>
      <button type="button" className="plegar" onClick={() => onCollapse(true)} aria-expanded={true}>
        {t('read.collapse')}
        <ChevronRight size={18} aria-hidden="true" />
      </button>
      {status === 'loading' && (lupa.target ? <LoadingLupa elapsed={state.elapsed} lupa={lupa} /> : <Loading elapsed={state.elapsed} />)}
      {status === 'error' && <Failure state={state} lupa={lupa} />}
      {change && status !== 'error' && (
        <div className={status === 'loading' ? 'lectura-cuerpo viejo' : 'lectura-cuerpo'}>
          {calibrated && <CalibratedBanner lupa={lupa} resolution={change.resolution_m} />}
          <p className="frase">
            {t(change.stats.changed_km2 > 0 ? 'read.summary' : 'read.summaryNone', {
              between: formatBetween(change.before.date, change.after.date, lang),
              changed: formatArea(change.stats.changed_km2, lang),
              valid: formatArea(change.stats.valid_km2, lang),
            })}
          </p>
          {calibrated && (
            <p className="medianas">
              {zoomSummary(change.stats, lang).map((sentence) => (
                <span key={sentence}>{sentence} </span>
              ))}
            </p>
          )}
          <ConfidenceNote stats={change.stats} calibrated={calibrated} />
          {!calibrated && <LupaOpener lupa={lupa} />}
          <ClassList classes={change.stats.classes} lens={lens} />
          <ProbeBlock probe={probe} lens={lens} calibrated={calibrated} />
          <Histogram data={change.stats.hh.hist} calibrated={calibrated} />
          <ExportBlock change={change} stack={stack} lens={lens} />
          <Provenance change={change} stack={stack} onMethod={onMethod} />
        </div>
      )}
    </aside>
  );
}
