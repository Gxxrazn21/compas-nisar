// Diálogo «Método»: cómo se calcula el cambio, en lenguaje llano.
import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';

interface Props {
  open: boolean;
  /** Sección a la que bajar al abrir (por ejemplo, «Qué viene con NISAR»). */
  anchor?: 'future' | null;
  onClose: () => void;
}

const SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's7', 's8', 's9', 's10'] as const;
const LIMITS = ['s6.1', 's6.2', 's6.3', 's6.4', 's6.5'] as const;
const FACTS = ['future.facts.1', 'future.facts.2', 'future.facts.3', 'future.facts.4'] as const;
const APPS = ['future.apps.1', 'future.apps.2', 'future.apps.3', 'future.apps.4', 'future.apps.5', 'future.apps.6'] as const;
const GAPS = ['future.gap.1', 'future.gap.2'] as const;

export function MethodDialog({ open, anchor = null, onClose }: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (open) {
      const target = anchor === 'future' ? dialog.querySelector<HTMLElement>('#futuro') : null;
      // Se espera un cuadro para que el diálogo ya tenga su alto.
      requestAnimationFrame(() => {
        if (target) target.scrollIntoView({ block: 'start' });
        else dialog.querySelector('.metodo-cuerpo')?.scrollTo({ top: 0 });
      });
    }
  }, [open, anchor]);

  return (
    <dialog
      ref={ref}
      className="metodo"
      aria-labelledby="metodo-h"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="metodo-cuerpo">
        <header className="metodo-cabeza">
          <h2 id="metodo-h">{t('method.title')}</h2>
          <button type="button" className="secundario" onClick={onClose} autoFocus>
            {t('method.close')}
          </button>
        </header>
        <p className="lead">{t('method.intro')}</p>
        {SECTIONS.map((id) => (
          <section key={id}>
            <h3>{t(`method.${id}.title` as Key)}</h3>
            <p>{t(`method.${id}.text` as Key)}</p>
          </section>
        ))}
        <section>
          <h3>{t('method.s6.title')}</h3>
          <ul>
            {LIMITS.map((id) => (
              <li key={id}>{t(`method.${id}` as Key)}</li>
            ))}
          </ul>
        </section>
        <section id="futuro" className="futuro" aria-labelledby="futuro-h">
          <h3 id="futuro-h">{t('future.title')}</h3>
          <p>{t('future.intro')}</p>
          <h4>{t('future.facts.title')}</h4>
          <ul>
            {FACTS.map((id) => (
              <li key={id}>{t(id)}</li>
            ))}
          </ul>
          <h4>{t('future.apps.title')}</h4>
          <ul>
            {APPS.map((id) => (
              <li key={id}>{t(id)}</li>
            ))}
          </ul>
          <h4>{t('future.gap.title')}</h4>
          <ul>
            {GAPS.map((id) => (
              <li key={id}>{t(id)}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>{t('method.formula')}</h3>
          <p className="formula">{t('method.formulaText')}</p>
        </section>
        <section>
          <h3>{t('method.sources')}</h3>
          <p>{t('method.sourcesText')}</p>
        </section>
      </div>
    </dialog>
  );
}
