// Panel izquierdo de Explorar: elegir un punto, ver las pilas que lo cubren y preparar la comparación.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useI18n } from '../../i18n';
import type { Key } from '../../i18n/es';
import { formatDate, formatNumber } from '../../lib/format';
import { LENS_IDS, LENS_LABEL, asLens } from '../../lib/lens';
import type { Compas } from '../../state/useCompas';
import type { LonLat, Stack } from '../../types';

/** Lugares reales con datos de NISAR, para probar sin saber dónde buscar. */
const EXAMPLES: Array<{ key: Key; point: LonLat }> = [
  { key: 'explore.ex.mojana', point: [-74.75, 8.55] },
  { key: 'explore.ex.iceland', point: [-17.0, 64.4] },
  { key: 'explore.ex.california', point: [-120.5, 36.8] },
  { key: 'explore.ex.punjab', point: [75.5, 30.8] },
];

function parseCoordinate(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) ? value : null;
}

interface Props {
  compas: Compas;
}

export function ExplorePanel({ compas }: Props) {
  const { t, lang } = useI18n();
  const { explorePoint, stacksState, stackId, stack } = compas;
  const [lon, setLon] = useState('');
  const [lat, setLat] = useState('');
  const [problem, setProblem] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const x = parseCoordinate(lon);
    const y = parseCoordinate(lat);
    if (x === null || y === null || Math.abs(x) > 180 || Math.abs(y) > 90) {
      setProblem(true);
      return;
    }
    setProblem(false);
    compas.goToPoint(x, y);
  };

  return (
    <section
      className={stackId ? 'panel panel-izq exploracion con-pila' : 'panel panel-izq exploracion'}
      data-cubre="left"
      aria-label={t('explore.panelLabel')}
    >
      <h2 className="titulo-historia">{t(stackId ? 'explore.titleShort' : 'explore.title')}</h2>
      {!stackId && !explorePoint && <p className="resumen">{t('explore.intro')}</p>}

      {!stackId && <form className="coordenadas" onSubmit={submit} noValidate>
        <label>
          <span>{t('explore.lon')}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="-74,75"
            value={lon}
            onChange={(event) => setLon(event.target.value)}
            aria-invalid={problem}
          />
        </label>
        <label>
          <span>{t('explore.lat')}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="8,55"
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            aria-invalid={problem}
          />
        </label>
        <button type="submit" className="secundario">
          {t('explore.go')}
        </button>
      </form>}
      {problem && !stackId && (
        <p className="ayuda aviso-campo" role="alert">
          {t('explore.coordsInvalid')}
        </p>
      )}

      {!explorePoint && !stackId && (
        <div className="ejemplos">
          <h3>{t('explore.examples')}</h3>
          <ul>
            {EXAMPLES.map((item) => (
              <li key={item.key}>
                <button type="button" className="secundario" onClick={() => compas.goToPoint(item.point[0], item.point[1])}>
                  {t(item.key)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {explorePoint && (
        <p className="nota-fechas punto-elegido">
          {t('explore.point', {
            lon: formatNumber(explorePoint[0], lang, 3),
            lat: formatNumber(explorePoint[1], lang, 3),
          })}{' '}
          <button type="button" className="enlace-texto" onClick={compas.changePlace}>
            {t('explore.otherPlace')}
          </button>
        </p>
      )}

      {stacksState.status === 'loading' && (
        <p className="estado" role="status">
          {t('explore.searching')}
        </p>
      )}
      {stacksState.status === 'error' && (
        <p className="estado aviso" role="alert">
          {t('explore.stacksError')}
        </p>
      )}
      {stacksState.status === 'ready' && stacksState.stacks.length === 0 && <EmptyState compas={compas} />}
      {compas.aroundNote === 'none' && !stackId && (
        <p className="aviso" role="status">
          {t('explore.around.none')}
        </p>
      )}
      {stacksState.status === 'ready' && stacksState.stacks.length > 0 && !stackId && (
        <StackList stacks={stacksState.stacks} onChoose={compas.chooseStack} />
      )}

      {stackId && (
        <Prepare compas={compas} stack={stack} />
      )}
    </section>
  );
}

function EmptyState({ compas }: { compas: Compas }) {
  const { t } = useI18n();
  return (
    <div className="vacio" role="status">
      <p className="vacio-titulo">{t('explore.empty.title')}</p>
      <p>{t('explore.empty.text')}</p>
      <ul className="vacio-lugares">
        {EXAMPLES.map((item) => (
          <li key={item.key}>
            <button type="button" className="secundario" onClick={() => compas.goToPoint(item.point[0], item.point[1])}>
              {t(item.key)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StackList({ stacks, onChoose }: { stacks: Stack[]; onChoose: (stack: Stack) => void }) {
  const { t, lang } = useI18n();
  return (
    <div className="pilas">
      <h3>{t('explore.stacksTitle', { n: stacks.length })}</h3>
      <p className="ayuda">{t('explore.stacksHelp')}</p>
      <ul>
        {stacks.map((item) => (
          <li key={item.id}>
            <button type="button" className="pila" onClick={() => onChoose(item)}>
              <span className="pila-titulo">
                {t('explore.stackTitle', {
                  track: item.track,
                  frame: item.frame,
                  direction: t(`prov.direction.${item.direction}` as Key),
                })}
              </span>
              <span className="pila-dato">
                {t('explore.stackDates', { n: item.analyzable_count, total: item.scenes.length })}
              </span>
              <span className="pila-dato">
                {t('explore.stackRange', {
                  first: formatDate(item.first, lang),
                  last: formatDate(item.last, lang),
                })}
              </span>
              <span className="pila-dato">{t('explore.stackPol', { pol: item.polarizations.join(', ') })}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Prepare({ compas, stack }: { compas: Compas; stack: Stack | null }) {
  const { t, lang } = useI18n();
  const lens = asLens(compas.lens);
  const list = compas.stacksState.status === 'ready' ? compas.stacksState.stacks : [];

  return (
    <div className="preparar">
      <div className="pila-elegida">
        <h3>
          {stack
            ? t('explore.stackTitle', {
                track: stack.track,
                frame: stack.frame,
                direction: t(`prov.direction.${stack.direction}` as Key),
              })
            : compas.stackId}
        </h3>
        {stack && (
          <p className="ayuda">
            {t('explore.stackDates', { n: stack.analyzable_count, total: stack.scenes.length })}
            {', '}
            {t('explore.stackRange', { first: formatDate(stack.first, lang), last: formatDate(stack.last, lang) })}
          </p>
        )}
        {list.length > 1 && (
          <p>
            <button type="button" className="enlace-texto" onClick={compas.changeStack}>
              {t('explore.otherStack')}
            </button>
          </p>
        )}
      </div>

      {compas.aroundNote && <p className="aviso" role="status">{t(`explore.around.${compas.aroundNote}` as Key)}</p>}

      <fieldset className="grupo">
        <legend>{t('explore.lens')}</legend>
        <div className="segmentos">
          {LENS_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={lens === id}
              onClick={() => compas.setLens(id)}
            >
              {LENS_LABEL[lang][id]}
            </button>
          ))}
        </div>
        <p className="ayuda">{t('explore.lensHelp')}</p>
      </fieldset>

      <fieldset className="grupo">
        <legend>{t('explore.area')}</legend>
        <div className="segmentos">
          <button type="button" aria-pressed={compas.aoiMode === 'view'} onClick={() => compas.setAoiMode('view')}>
            {t('explore.area.view')}
          </button>
          <button type="button" aria-pressed={compas.aoiMode === 'full'} onClick={() => compas.setAoiMode('full')}>
            {t('explore.area.full')}
          </button>
        </div>
        <p className="ayuda">{t(compas.aoiMode === 'view' ? 'explore.area.viewHelp' : 'explore.area.fullHelp')}</p>
        {compas.aoiNote && compas.dates && (
          <p className="ayuda">{t(`explore.areaNote.${compas.aoiNote}` as Key)}</p>
        )}
      </fieldset>

      {!compas.dates && <p className="ayuda">{t('explore.pickHint')}</p>}
    </div>
  );
}
