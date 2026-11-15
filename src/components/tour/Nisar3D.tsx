// Figura del satélite en el recorrido: el modelo en 3D (se carga aparte, con three.js) y, mientras
// llega o si el equipo no tiene WebGL, el plano en 2D.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import type { DimensionId, Viewer } from '../../lib/nisar3d';
import { nisarSvg } from '../../lib/nisarModel';
import type { Part } from '../../lib/nisarModel';
import { prefersReducedMotion } from '../../state/useElapsed';

export function NisarFigure({ dimensions = false, part }: { dimensions?: boolean; part?: Part }) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  const labels = useMemo<Record<DimensionId, string>>(
    () => ({
      reflector: t('tour.dim.reflector'),
      boom: t('tour.dim.boom'),
      body: t('tour.dim.body'),
      solar: t('tour.dim.solar'),
      person: t('tour.dim.person'),
    }),
    [t],
  );
  // Lo último que se pidió mostrar: el visor puede terminar de cargar después de un cambio de paso.
  const wanted = useRef({ part, dimensions, labels });
  wanted.current = { part, dimensions, labels };

  useEffect(() => {
    let cancelled = false;
    import('../../lib/nisar3d')
      .then((module) => {
        if (cancelled || !host.current) return;
        const created = module.createViewer(host.current, { labels: wanted.current.labels, reducedMotion: prefersReducedMotion() });
        created.show(wanted.current.part ?? null, wanted.current.dimensions);
        viewer.current = created;
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });
    return () => {
      cancelled = true;
      viewer.current?.dispose();
      viewer.current = null;
    };
  }, []);

  useEffect(() => {
    viewer.current?.show(part ?? null, dimensions);
  }, [part, dimensions]);

  useEffect(() => {
    viewer.current?.setLabels(labels);
  }, [labels]);

  const flat = useMemo(
    () => nisarSvg(dimensions ? { reflector: labels.reflector, boom: labels.boom, solar: labels.solar, person: labels.person } : undefined),
    [dimensions, labels],
  );

  return (
    <figure className="figura-nisar" data-resalta={state === 'ready' ? undefined : part} data-estado={state}>
      <div className="figura-dibujo" role="img" aria-label={t(dimensions ? 'tour.figureDimensions' : 'tour.figure')}>
        {/* El SVG lo genera `nisarSvg` con datos propios: no incluye texto de terceros. */}
        {state !== 'ready' && <div className="figura-plano" dangerouslySetInnerHTML={{ __html: flat }} />}
        <div ref={host} className="figura-3d" />
      </div>
      <figcaption className="ayuda">{t('tour.figureNote')}</figcaption>
    </figure>
  );
}
