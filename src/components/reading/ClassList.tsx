// Lista de clases: es a la vez la leyenda del mapa (color del backend, nombre según el lente).
// Cada clase se despliega para responder «¿por qué cambió?»: la señal, el mecanismo físico, otras
// causas posibles y qué polarización lo revela.
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n';
import { formatArea } from '../../lib/format';
import { hypothesisFor } from '../../lib/hypotheses';
import { className } from '../../lib/lens';
import type { ClassKey, ClassStat } from '../../types';

interface Props {
  classes: ClassStat[];
  lens: string;
}

function Why({ id, owner, classKey, lens }: { id: string; owner: string; classKey: ClassKey; lens: string }) {
  const { t, lang } = useI18n();
  const item = hypothesisFor(classKey, lens, lang);
  return (
    <div className="clase-porque" id={id} role="region" aria-labelledby={owner}>
      <dl>
        <div>
          <dt>{t('why.signal')}</dt>
          <dd>{item.signal}</dd>
        </div>
        {item.mechanism !== null && (
          <div>
            <dt>{t('why.mechanism')}</dt>
            <dd>{item.mechanism}</dd>
          </div>
        )}
        <div>
          <dt>{t('why.lead')}</dt>
          <dd>{item.lead}</dd>
        </div>
        {item.others.length > 0 && (
          <div>
            <dt>{t('why.others')}</dt>
            <dd>
              <ul>
                {item.others.map((other) => (
                  <li key={other}>{other}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        <div>
          <dt>{t('why.pol')}</dt>
          <dd>{item.polarization}</dd>
        </div>
      </dl>
      <p className="clase-pista">{item.check}</p>
    </div>
  );
}

export function ClassList({ classes, lens }: Props) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<ClassKey | null>(null);
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
            {present.map((item) => {
              const expanded = open === item.key;
              const panel = `porque-${item.key}`;
              return (
                <li key={item.key} className={expanded ? 'clase abierta' : 'clase'}>
                  <span className="clase-color" style={{ background: item.color }} aria-hidden="true" />
                  <button
                    type="button"
                    className="clase-nombre"
                    id={`clase-${item.key}`}
                    aria-expanded={expanded}
                    aria-controls={expanded ? panel : undefined}
                    onClick={() => setOpen(expanded ? null : item.key)}
                  >
                    <span>{className(lens, item.key, lang)}</span>
                    <ChevronDown size={16} aria-hidden="true" className="clase-flecha" />
                  </button>
                  <span className="clase-km">{formatArea(item.km2, lang)}</span>
                  <span className="clase-barra" aria-hidden="true">
                    <span style={{ width: `${Math.max(2, (item.km2 / largest) * 100)}%`, background: item.color }} />
                  </span>
                  {expanded && <Why id={panel} owner={`clase-${item.key}`} classKey={item.key} lens={lens} />}
                </li>
              );
            })}
          </ul>
          <p className="ayuda">
            {t('classes.hint')} {t('classes.share')}
          </p>
        </>
      )}
    </section>
  );
}
