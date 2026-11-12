// «Qué ve cada polarización»: bloque breve y permanente; el lente decide qué nota va primero.
import { useI18n } from '../../i18n';
import { polarizationGuide } from '../../lib/hypotheses';

interface Props {
  lens: string;
  /** Falso si la comparación tiene una sola polarización (solo HH). */
  dual: boolean;
}

export function PolarizationGuide({ lens, dual }: Props) {
  const { t, lang } = useI18n();
  const guide = polarizationGuide(lens, lang);
  return (
    <section className="bloque polarizaciones" aria-labelledby="pol-h">
      <h3 id="pol-h">{t('pol.title')}</h3>
      <p>{guide.hh}</p>
      <p>{guide.hv}</p>
      <ul className="polarizaciones-notas">
        {guide.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      {!dual && <p className="ayuda">{t('pol.single')}</p>}
    </section>
  );
}
