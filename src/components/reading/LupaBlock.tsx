// Lupa calibrada: aviso de lo que se está viendo y el control para abrirla desde el punto elegido.
import { useI18n } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { LUPA_SIZES } from '../../state/useCompas';
import type { ZoomWindow } from '../../types';

export interface LupaControls {
  /** El servidor tiene token de Earthdata. */
  available: boolean;
  /** Hay una lupa abierta (cargando o lista). */
  target: ZoomWindow | null;
  size: number;
  hasProbe: boolean;
  onSize: (size: number) => void;
  onOpen: () => void;
  onClose: () => void;
}

/** Banda sobre la lectura cuando lo que se muestra son dB reales de la lupa. */
export function CalibratedBanner({ lupa, resolution }: { lupa: LupaControls; resolution: number | undefined }) {
  const { t, lang } = useI18n();
  return (
    <div className="lupa-aviso" role="note">
      <p className="lupa-aviso-titulo">{t('lupa.badge')}</p>
      <p>
        {t('lupa.badgeText', {
          res: formatNumber(resolution ?? 30, lang),
          size: formatNumber(lupa.target?.size_km ?? lupa.size, lang),
        })}
      </p>
      <button type="button" className="secundario" onClick={lupa.onClose}>
        {t('lupa.back')}
      </button>
    </div>
  );
}

/** Bloque para abrir la lupa en la vista general del browse. */
export function LupaOpener({ lupa }: { lupa: LupaControls }) {
  const { t } = useI18n();
  if (!lupa.available) return null;
  return (
    <section className="bloque" aria-labelledby="lupa-h">
      <h3 id="lupa-h">{t('lupa.title')}</h3>
      <p className="ayuda">{t(lupa.hasProbe ? 'lupa.helpProbe' : 'lupa.helpCenter')}</p>
      <fieldset className="grupo">
        <legend className="solo-lector">{t('lupa.size')}</legend>
        <div className="segmentos" role="group" aria-label={t('lupa.size')}>
          {LUPA_SIZES.map((size) => (
            <button key={size} type="button" aria-pressed={lupa.size === size} onClick={() => lupa.onSize(size)}>
              {t('lupa.sizeKm', { n: size })}
            </button>
          ))}
        </div>
      </fieldset>
      <button type="button" className="primario" onClick={lupa.onOpen}>
        {t('lupa.open')}
      </button>
      <p className="ayuda">{t('lupa.slow')}</p>
    </section>
  );
}
