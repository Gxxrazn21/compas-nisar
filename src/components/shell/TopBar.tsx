import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import type { Mode } from '../../lib/hash';
import type { Lang } from '../../types';

interface Props {
  mode: Mode;
  onMode: (mode: Mode) => void;
  onHome: () => void;
  onMethod: () => void;
}

const LANGS: Lang[] = ['es', 'en'];
const MODES: Mode[] = ['stories', 'explore', 'live'];

export function TopBar({ mode, onMode, onHome, onMethod }: Props) {
  const { t, lang, setLang } = useI18n();
  return (
    <header className="barra-superior">
      <button type="button" className="marca" onClick={onHome} aria-label={t('top.home')}>
        {t('brand')}
      </button>
      <nav className="navegacion" aria-label={t('nav.label')}>
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            aria-current={mode === item ? 'page' : undefined}
            onClick={() => onMode(item)}
          >
            {t(`nav.${item}` as Key)}
          </button>
        ))}
      </nav>
      <div className="barra-derecha">
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
        <button type="button" className="enlace" onClick={onMethod}>
          {t('top.method')}
        </button>
      </div>
    </header>
  );
}
