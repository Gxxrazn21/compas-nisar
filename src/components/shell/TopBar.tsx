import { CaseSensitive, CircleHelp, CirclePlay, SquareDashed } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import type { Mode } from '../../lib/hash';
import type { Lang } from '../../types';

interface Props {
  mode: Mode;
  /** Fronteras y nombres sobre el mapa. */
  borders: boolean;
  names: boolean;
  onMode: (mode: Mode) => void;
  onHome: () => void;
  onMethod: () => void;
  onBorders: () => void;
  onNames: () => void;
  onHelp: () => void;
  /** Abre el recorrido guiado; sin él, el botón no aparece. */
  onTour?: () => void;
}

const LANGS: Lang[] = ['en', 'es'];
const MODES: Mode[] = ['stories', 'explore', 'live'];

export function TopBar({ mode, borders, names, onMode, onHome, onMethod, onBorders, onNames, onHelp, onTour }: Props) {
  const { t, lang, setLang } = useI18n();
  return (
    <header className="barra-superior">
      <button type="button" className="marca" onClick={onHome} aria-label={t('top.home')}>
        {/* SAR + ritmo: la sigla va recta y el resto en cursiva, como una indicación de tempo. */}
        <span className="marca-sar">SAR</span>itmo
      </button>
      <nav className="navegacion" aria-label={t('nav.label')}>
        {MODES.map((item, index) => (
          <button
            key={item}
            type="button"
            aria-current={mode === item ? 'page' : undefined}
            title={`${t(`nav.${item}` as Key)} (${index + 1})`}
            onClick={() => onMode(item)}
          >
            {t(`nav.${item}` as Key)}
          </button>
        ))}
      </nav>
      <div className="barra-derecha">
        <div className="referencia" role="group" aria-label={t('ref.group')}>
          <button type="button" aria-pressed={borders} title={`${t('ref.bordersHint')} (B)`} onClick={onBorders}>
            <SquareDashed size={17} aria-hidden="true" />
            <span>{t('ref.borders')}</span>
          </button>
          <button type="button" aria-pressed={names} title={`${t('ref.namesHint')} (N)`} onClick={onNames}>
            <CaseSensitive size={19} aria-hidden="true" />
            <span>{t('ref.names')}</span>
          </button>
        </div>
        <div className="idioma" role="group" aria-label={t('top.langLabel')}>
          {LANGS.map((code) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={lang === code}
              onClick={() => setLang(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        {onTour && (
          <button type="button" className="enlace recorrido-boton" onClick={onTour} aria-label={t('tour.open')} title={t('tour.open')}>
            <CirclePlay size={17} aria-hidden="true" />
            <span>{t('tour.short')}</span>
          </button>
        )}
        <button type="button" className="enlace" onClick={onMethod}>
          {t('top.method')}
        </button>
        <button type="button" className="enlace ayuda-boton" onClick={onHelp} aria-label={t('help.open')} title={`${t('help.open')} (?)`}>
          <CircleHelp size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
