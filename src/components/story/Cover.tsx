// Portada: titular en Bodoni y el programa de historias, como un programa de concierto.
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useI18n } from '../../i18n';
import { formatDate } from '../../lib/format';
import type { Load } from '../../state/useCompas';
import type { EarthToday, Story } from '../../types';

interface Props {
  stories: Load<Story[]>;
  onOpen: (id: string) => void;
}

export function Cover({ stories, onOpen }: Props) {
  const { t, loc } = useI18n();
  return (
    <section className="panel panel-izq portada" data-cubre="left" aria-labelledby="titular">
      <h1 id="titular" className="titular">
        {t('cover.title')}
      </h1>
      <p className="tempo">{t('cover.tempo')}</p>
      <p className="lead">{t('cover.intro')}</p>
      {stories.status === 'loading' && <p className="estado" role="status">{t('cover.loadingStories')}</p>}
      {stories.status === 'error' && <p className="estado aviso" role="alert">{t('cover.storiesError')}</p>}
      {stories.status === 'ready' && (
        <ul className="programa" aria-label={t('cover.programLabel')}>
          {stories.data.map((story) => (
            <li key={story.id}>
              <button type="button" className="programa-fila" onClick={() => onOpen(story.id)}>
                <span className="programa-titulo">{loc(story.title)}</span>
                <span className="programa-puntos" aria-hidden="true" />
                <span className="programa-lugar">
                  {loc(story.place)}, {loc(story.country)}
                </span>
                <span className="programa-tempo">{loc(story.tempo)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Detalle discreto: la imagen de «La Tierra hoy». Si el servicio falla, no aparece. */
export function EarthTodayDetail() {
  const { t, lang } = useI18n();
  const [earth, setEarth] = useState<EarthToday | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.earthToday(controller.signal).then(setEarth).catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!earth || broken) return null;
  return (
    <figure className="tierra-hoy">
      <div className="tierra-disco">
        <img src={earth.image} alt={t('cover.earthAlt')} width={104} height={104} onError={() => setBroken(true)} />
      </div>
      <figcaption>{t('cover.earth', { date: formatDate(earth.date, lang) })}</figcaption>
    </figure>
  );
}
