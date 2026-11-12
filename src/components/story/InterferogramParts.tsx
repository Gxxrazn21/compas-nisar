// Historia de interferogramas: selector de pares de fechas y panel que explica el producto.
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { formatDate, formatDateShort } from '../../lib/format';
import type { InterferogramsState } from '../../state/useInterferograms';

const ASF_SEARCH = 'https://search.asf.alaska.edu/#/?granule=';

interface PickerProps {
  state: InterferogramsState;
  pair: number;
  onPair: (index: number) => void;
}

/** Selector entre los pares de fechas: referencia, secundaria, pista y dirección. */
export function InterferogramPicker({ state, pair, onPair }: PickerProps) {
  const { t, lang } = useI18n();
  if (state.status === 'loading' || state.status === 'idle') {
    return <p className="estado" role="status">{t('ig.loading')}</p>;
  }
  if (state.status === 'error') {
    return <p className="estado aviso" role="alert">{state.detail ? t('ig.errorDetail', { detail: state.detail }) : t('ig.error')}</p>;
  }
  if (state.items.length === 0) return <p className="estado aviso" role="status">{t('ig.none')}</p>;
  return (
    <fieldset className="grupo pares">
      <legend>{t('ig.pairs')}</legend>
      <ul>
        {state.items.map((item, index) => (
          <li key={item.granule}>
            <button type="button" className="pila" aria-pressed={index === pair} onClick={() => onPair(index)}>
              <span className="pila-titulo">
                {t('ig.pairDates', {
                  reference: formatDateShort(item.reference_date, lang),
                  secondary: `${formatDateShort(item.secondary_date, lang)} ${item.secondary_date.slice(0, 4)}`,
                })}
              </span>
              <span className="pila-dato">
                {t('ig.pairTrack', {
                  track: item.track,
                  direction: t(`prov.direction.${item.direction}` as Key),
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export function InterferogramReading({ state, pair }: { state: InterferogramsState; pair: number }) {
  const { t, lang } = useI18n();
  const item = state.status === 'ready' ? state.items[pair] : undefined;
  return (
    <aside className="panel panel-der lectura" data-cubre="right" aria-label={t('read.title')}>
      <div className="lectura-cuerpo">
        <p className="frase">
          {item
            ? t('ig.sentence', {
                reference: formatDate(item.reference_date, lang),
                secondary: formatDate(item.secondary_date, lang),
              })
            : t('ig.sentenceNone')}
        </p>
        <section className="bloque">
          <h3>{t('ig.what.title')}</h3>
          <p>{t('ig.what.text')}</p>
          <p>{t('ig.fringes')}</p>
        </section>
        <section className="bloque">
          <h3>{t('ig.product.title')}</h3>
          <p>{t('ig.product.text')}</p>
          <p className="ayuda">{t('ig.georef')}</p>
        </section>
        {item && (
          <details className="desplegable">
            <summary>{t('prov.title')}</summary>
            <p className="prov-id">{item.granule}</p>
            <p className="prov-texto">
              {t('prov.track', {
                track: item.track,
                frame: item.frame,
                direction: t(`prov.direction.${item.direction}` as Key),
              })}
              .
            </p>
            <p>
              <a href={`${ASF_SEARCH}${encodeURIComponent(item.granule)}`} target="_blank" rel="noreferrer">
                {t('prov.asf')}
              </a>
            </p>
          </details>
        )}
        <details className="desplegable">
          <summary>{t('limits.title')}</summary>
          <ul className="limites">
            <li>{t('ig.limit.1')}</li>
            <li>{t('ig.limit.2')}</li>
            <li>{t('ig.limit.3')}</li>
          </ul>
        </details>
        <p className="ayuda">{t('ig.source')}</p>
      </div>
    </aside>
  );
}
