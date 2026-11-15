// Diálogo «Cómo usar SARitmo»: tres pasos, los atajos de teclado y las preferencias.
import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import type { Prefs } from '../../state/usePrefs';
import { SHORTCUTS } from '../../state/useShortcuts';

interface Props {
  open: boolean;
  prefs: Prefs;
  onToggle: (key: keyof Prefs) => void;
  onClose: () => void;
  /** Cierra la ayuda y abre el recorrido guiado. */
  onTour?: () => void;
}

const STEPS = ['help.step.1', 'help.step.2', 'help.step.3'] as const;
const PREFS: Array<keyof Prefs> = ['borders', 'names', 'sound', 'hints'];

export function HelpDialog({ open, prefs, onToggle, onClose, onTour }: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="metodo guia"
      aria-labelledby="guia-h"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="metodo-cuerpo">
        <header className="metodo-cabeza">
          <h2 id="guia-h">{t('help.title')}</h2>
          <button type="button" className="secundario" onClick={onClose} autoFocus>
            {t('method.close')}
          </button>
        </header>
        <ol className="guia-pasos">
          {STEPS.map((id) => (
            <li key={id}>{t(id)}</li>
          ))}
        </ol>
        {onTour && (
          <button type="button" className="secundario" onClick={onTour}>
            {t('help.tour')}
          </button>
        )}
        <section aria-labelledby="guia-teclas-h">
          <h3 id="guia-teclas-h">{t('help.keys')}</h3>
          <dl className="guia-teclas">
            {SHORTCUTS.map((item) => (
              <div key={item.id}>
                <dt>
                  {item.keys.map((label) => (
                    <kbd key={label}>{label === 'space' ? t('help.space') : label}</kbd>
                  ))}
                </dt>
                <dd>{t(`help.key.${item.id}` as Key)}</dd>
              </div>
            ))}
          </dl>
          <p className="ayuda">{t('help.keysNote')}</p>
        </section>
        <section aria-labelledby="guia-pref-h">
          <h3 id="guia-pref-h">{t('help.prefs')}</h3>
          <ul className="guia-prefs">
            {PREFS.map((key) => (
              <li key={key}>
                <label>
                  <input type="checkbox" checked={prefs[key]} onChange={() => onToggle(key)} />
                  <span>{t(`help.pref.${key}` as Key)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </dialog>
  );
}
