// Lista de clases: es a la vez la leyenda del mapa (color del backend, nombre según el lente).
import { useI18n } from '../../i18n';
import { formatArea } from '../../lib/format';
import { className } from '../../lib/lens';
import type { ClassStat } from '../../types';

interface Props {
  classes: ClassStat[];
  lens: string;
}

export function ClassList({ classes, lens }: Props) {
  const { t, lang } = useI18n();
  const present = classes.filter((item) => item.km2 > 0).sort((a, b) => b.km2 - a.km2);
  const largest = present[0]?.km2 ?? 1;

  return (
    <section className="bloque" aria-labelledby="clases-h">
      <h3 id="clases-h">{t('classes.title')}</h3>
      {present.length === 0 ? (
        <p className="ayuda">{t('classes.none')}</p>
      ) : (
        <>
          <ul className="clases" aria-label={t('classes.legend')}>
            {present.map((item) => (
              <li key={item.key} className="clase">
                <span className="clase-color" style={{ background: item.color }} aria-hidden="true" />
                <span className="clase-nombre">{className(lens, item.key, lang)}</span>
                <span className="clase-km">{formatArea(item.km2, lang)}</span>
                <span className="clase-barra" aria-hidden="true">
                  <span style={{ width: `${Math.max(2, (item.km2 / largest) * 100)}%`, background: item.color }} />
                </span>
              </li>
            ))}
          </ul>
          <p className="ayuda">{t('classes.share')}</p>
        </>
      )}
    </section>
  );
}
