// Recorrido guardado de La Mojana: los mismos paneles, capas y contexto que una historia, pero con
// datos de un paquete local verificado (sin consultar a la NASA). El mapa base, las capas de
// contexto y el contraste externo sí necesitan conexión; sin ella el radar se ve sobre fondo oscuro.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { centerOfBounds, zoomForBounds, zoomForWindow } from '../../lib/camera';
import { activeContext, contextDate, stepOffset } from '../../lib/context';
import type { ContextId, ContextLayers } from '../../lib/context';
import { isDemoPackage } from '../../lib/demo';
import type { DemoPackage } from '../../lib/demo';
import { unlockSound } from '../../lib/sound';
import type { CameraTarget, ProbeState } from '../../state/useCompas';
import { useDance } from '../../state/useDance';
import { usePrefs } from '../../state/usePrefs';
import { useShortcuts } from '../../state/useShortcuts';
import type { Lang, MapLayer, ProbeResult, StepLayer, Story, StoryStep } from '../../types';
import type { Key } from '../../i18n/es';
import { MethodDialog } from '../method/MethodDialog';
import { ReadingPanel } from '../reading/ReadingPanel';
import { Score } from '../score/Score';
import { HelpDialog } from '../shell/HelpDialog';
import { Sheet } from '../shell/Sheet';
import { TopBar } from '../shell/TopBar';
import { MapToolbar } from '../stage/MapToolbar';
import { Stage } from '../stage/Stage';
import type { StageApi } from '../stage/Stage';
import { StoryPanel } from './StoryPanel';

const TEXT = {
  es: {
    title: 'La Mojana: una señal que merece comprobarse', loading: 'Abriendo el recorrido guardado…',
    error: 'El recorrido no está disponible o está incompleto. Puedes reintentar o volver a explorar.',
    retry: 'Reintentar', back: 'Volver a SARitmo', label: 'Recorrido guardado', prepared: 'preparado el',
    note: 'Los datos de NISAR salen de archivos locales verificados, no de una consulta en vivo. El mapa de fondo, las capas de contexto y el contraste externo sí usan conexión.',
    question: '¿Qué zonas merecen una verificación de campo por cambios compatibles con expansión del agua?',
    steps: ['Observar el territorio', 'Comparar el retorno calibrado', 'Escuchar las observaciones', 'Verificar y compartir'],
    body: [
      'Comienza con la vista general entre el 26 de junio y el 24 de octubre de 2026. El azul indica menos retorno y el naranja más. Enciende «Agua», «Bosques y suelo» o «Población» sobre la barra del mapa para ver qué rodea cada mancha. Estos patrones orientan la búsqueda; no son un mapa de inundación confirmado.',
      'Acerca la mirada a una ventana de 15 km. Aquí se compara γ⁰ del producto científico, sin ajuste global entre fechas. Haz clic en el mapa para consultar un punto; la causa todavía requiere verificación.',
      'La secuencia muestra las vistas previas a color de cada pasada: lila donde domina HH y verde donde domina HV. Escucha HH y HV en el centro marcado: la escala musical es compartida, pero no mide potencia absoluta entre canales. Los intervalos reales aparecen junto a cada fecha.',
      'Abre Datos para contrastar con Sentinel-1, registrar una observación local y descargar un informe portable. Las coincidencias visuales son pistas. La verificación de campo y la concordancia cuantitativa siguen pendientes.',
    ],
    saved: 'Datos de NISAR guardados, no en vivo.',
  },
  en: {
    title: 'La Mojana: a signal worth checking', loading: 'Opening the saved walkthrough…',
    error: 'The walkthrough is unavailable or incomplete. Retry or return to explore.', retry: 'Retry', back: 'Back to SARitmo',
    label: 'Saved walkthrough', prepared: 'prepared on',
    note: 'NISAR data comes from verified local files, not a live query. The basemap, context layers and external comparison do use a connection.',
    question: 'Which areas warrant field checks for changes consistent with expanding water?',
    steps: ['Observe the landscape', 'Compare calibrated return', 'Listen to observations', 'Verify and share'],
    body: [
      'Start with the overview from June 26 to October 24, 2026. Blue indicates less return and orange more. Turn on "Water", "Forests and land" or "Population" above the map bar to see what surrounds each patch. These patterns guide investigation; they are not a confirmed flood map.',
      'Focus on a 15 km window. Here we compare γ⁰ from the science product, with no global fit between dates. Click the map to query a point; the cause still needs verification.',
      'The sequence shows the color preview of each pass: purple where HH dominates and green where HV does. Listen to HH and HV at the marked center: the musical scale is shared, but does not measure absolute power across channels. Actual intervals appear beside each date.',
      'Open Data to compare with Sentinel-1, record a local observation and download a portable brief. Visual agreement is a clue. Field verification and quantitative agreement remain pending.',
    ],
    saved: 'Saved NISAR data, not live.',
  },
};

/** Paso del recorrido → qué pide al panel (`zoom` y `dance` muestran su botón y su ayuda). */
const STEP_LAYERS: StepLayer[] = ['change_hh', 'zoom', 'dance', 'change_hh'];
/** Capa del mapa con la que abre cada paso. */
const OPENING_LAYER: MapLayer[] = ['change_hh', 'change_hh', 'after', 'change_hh'];
const LAST_STEP = STEP_LAYERS.length - 1;

export function DemoApp() {
  const { lang } = useI18n();
  const c = TEXT[lang];
  const [data, setData] = useState<DemoPackage | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError(false);
    fetch('/api/demo/mojana', { signal: controller.signal }).then(async (r) => {
      if (!r.ok) throw new Error(); const value: unknown = await r.json();
      if (!isDemoPackage(value)) throw new Error(); if (!controller.signal.aborted) setData(value);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);
  if (!data) return <main className="demo-loading"><h1>SARitmo</h1><p role={error ? 'alert' : 'status'}>{error ? c.error : c.loading}</p>
    {error && <button className="primario" onClick={() => setAttempt(n => n + 1)}>{c.retry}</button>} <a href={`/#lang=${lang}`}>{c.back}</a></main>;
  return <Walkthrough data={data} lang={lang} />;
}

function Walkthrough({ data, lang }: { data: DemoPackage; lang: Lang }) {
  const { t } = useI18n();
  const c = TEXT[lang];
  const { prefs, toggle } = usePrefs();
  const reference = useMemo(() => ({ borders: prefs.borders, names: prefs.names }), [prefs.borders, prefs.names]);
  const [step, setStepState] = useState(0);
  const [layer, setLayer] = useState<MapLayer>('change_hh');
  const [opacity, setOpacity] = useState(1);
  const [basemap, setBasemap] = useState<'sat' | 'optico'>('sat');
  const [context, setContext] = useState<ContextLayers>({});
  const [contextDays, setContextDays] = useState(0);
  const [method, setMethod] = useState<{ open: boolean; anchor: 'future' | null }>({ open: false, anchor: null });
  const [help, setHelp] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [probe, setProbe] = useState<ProbeState | null>(null);
  const [view, setView] = useState(0);
  const abort = useRef<AbortController | null>(null);
  const apiRef = useRef<StageApi | null>(null);

  const calibrated = step === 1 || step === 3;
  const change = calibrated ? data.zoom : data.change;
  const after = change.after.date;
  const target = useMemo(() => ({ stack: data.stack.id, point: data.series.point, aoi: data.story.aoi }), [data]);
  const dance = useDance(target, data.series);
  const bounds = step === 2 ? data.series.bounds : change.bounds;
  // Cada paso (y el botón de volver al área) pide un encuadre nuevo. La ventana calibrada es pequeña:
  // se encuadra por su tamaño en kilómetros, no con el ajuste general, que no pasa del zoom 9.
  const camera = useMemo<CameraTarget>(
    () => {
      const base = { kind: 'view' as const, center: centerOfBounds(bounds), nonce: view, instant: view === 0, duration: 1400 };
      return calibrated
        ? { ...base, zoom: zoomForWindow(data.story.lupa?.size_km ?? 15, base.center[1], 400) }
        : { ...base, zoom: zoomForBounds(bounds), fit: bounds };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view],
  );

  const story = useMemo<Story>(
    () => ({ ...data.story, title: { es: TEXT.es.title, en: TEXT.en.title }, summary: { es: TEXT.es.question, en: TEXT.en.question } }),
    [data.story],
  );
  const steps = useMemo<StoryStep[]>(
    () => STEP_LAYERS.map((stepLayer, i) => ({
      layer: stepLayer,
      title: { es: TEXT.es.steps[i] ?? '', en: TEXT.en.steps[i] ?? '' },
      text: { es: TEXT.es.body[i] ?? '', en: TEXT.en.body[i] ?? '' },
    })),
    [],
  );

  useEffect(() => { abort.current?.abort(); setProbe(null); }, [change.id]);
  useEffect(() => () => abort.current?.abort(), []);

  // El primer gesto habilita el audio: las notas de la danza llegan después del clic.
  useEffect(() => {
    if (!prefs.sound) return;
    const unlock = () => unlockSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [prefs.sound]);

  const onProbe = (lon: number, lat: number) => {
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setProbe({ point: [lon, lat], status: 'loading', result: null });
    fetch(`/api/demo/mojana/probe?${new URLSearchParams({ change: change.id, lon: String(lon), lat: String(lat) })}`, { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); const result = await r.json() as ProbeResult; if (!controller.signal.aborted) setProbe({ point: [lon, lat], status: 'ready', result }); })
      .catch(() => { if (!controller.signal.aborted) setProbe({ point: [lon, lat], status: 'error', result: null }); });
  };

  const { stop: stopDance } = dance;
  const setStep = useCallback((next: number) => {
    const index = Math.max(0, Math.min(LAST_STEP, next));
    stopDance();
    setStepState(index);
    setLayer(OPENING_LAYER[index] ?? 'change_hh');
    setView((n) => n + 1);
  }, [stopDance]);
  const pickLayer = (next: MapLayer) => { dance.stop(); setLayer(next); };
  const recenter = () => setView((n) => n + 1);
  const leave = (hash = '') => window.location.assign(`/#${hash}${hash ? '&' : ''}lang=${lang}`);
  const onContextLayer = useCallback((id: ContextId, value: number | null) => {
    setContext((current) => {
      const next = { ...current };
      if (value === null) delete next[id];
      else next[id] = value;
      return next;
    });
  }, []);

  useShortcuts((id) => {
    switch (id) {
      case 'stories': leave(); return true;
      case 'explore': leave('m=e'); return true;
      case 'live': leave('m=v'); return true;
      case 'prev': setStep(step - 1); return true;
      case 'next': setStep(step + 1); return true;
      case 'playPause':
        if (!dance.active || dance.manualOnly) return false;
        dance.toggle();
        return true;
      case 'dance':
        if (step !== 2) return false;
        if (dance.phase === 'idle' || dance.phase === 'error') dance.start();
        else if (dance.phase === 'ready') dance.stop();
        else dance.cancel();
        return true;
      case 'borders':
      case 'names':
      case 'sound':
        toggle(id);
        return true;
      case 'zoomIn': apiRef.current?.zoomIn(); return true;
      case 'zoomOut': apiRef.current?.zoomOut(); return true;
      case 'recenter': recenter(); return true;
      case 'help': setHelp(true); return true;
    }
  });

  const mapLayer: MapLayer = dance.active ? 'dance' : layer;
  const optical = basemap === 'optico' && mapLayer !== 'swipe' ? after : null;
  const prepared = new Date(data.prepared_at).toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={`app analisis vista-story con-lectura${collapsed ? ' lectura-plegada' : ''} demo-app`}>
      <Stage
        projection="mercator"
        camera={camera}
        change={change}
        layer={mapLayer}
        opacity={opacity}
        series={dance.series}
        danceIndex={dance.active ? dance.index : null}
        probePoint={dance.active ? dance.point : probe?.point ?? null}
        probing={!dance.active && mapLayer !== 'swipe'}
        onProbe={onProbe}
        picking={false}
        onPick={() => {}}
        explorePoint={null}
        footprint={null}
        live={null}
        overlay={null}
        opticalDate={optical}
        context={context}
        contextDate={contextDate(after, contextDays)}
        reference={reference}
        apiRef={apiRef}
      />
      <TopBar
        mode="stories"
        borders={prefs.borders}
        names={prefs.names}
        onMode={(mode) => leave(mode === 'explore' ? 'm=e' : mode === 'live' ? 'm=v' : '')}
        onHome={() => leave()}
        onMethod={() => setMethod({ open: true, anchor: null })}
        onBorders={() => toggle('borders')}
        onNames={() => toggle('names')}
        onHelp={() => setHelp(true)}
      />
      <Sheet label={t('sheet.toggle')}>
        <StoryPanel
          story={story}
          steps={steps}
          step={step}
          dance={{ ...dance, available: step === 2 }}
          extra={
            <details className="demo-nota">
              <summary><strong>{c.label}</strong>, {c.prepared} {prepared}</summary>
              <p className="ayuda">{c.note}</p>
            </details>
          }
          onStep={setStep}
          onBack={() => leave()}
          onFuture={() => setMethod({ open: true, anchor: 'future' })}
        />
        <MapToolbar
          change={change}
          layer={mapLayer}
          opacity={opacity}
          basemap={basemap}
          opticalDate={after}
          onLayer={pickLayer}
          onOpacity={setOpacity}
          onBasemap={setBasemap}
          onRecenter={recenter}
          context={{
            layers: context,
            date: contextDate(after, contextDays),
            days: contextDays,
            after,
            onLayer: onContextLayer,
            onStep: (delta) => setContextDays((current) => stepOffset(after, current, delta)),
          }}
          stageApi={apiRef}
        />
        <ReadingPanel key={`${change.id}-${step}`} state={{ change, status: 'ready', error: null, elapsed: 0, retry: () => {} }} lens="agua" stack={data.stack} probe={probe}
          lupa={{ available: false, target: calibrated ? data.story.lupa ?? null : null, size: data.story.lupa?.size_km ?? 15, hasProbe: Boolean(probe), onSize: () => {}, onOpen: () => {}, onClose: () => setStep(0) }}
          collapsed={collapsed} onCollapse={setCollapsed} onMethod={() => setMethod({ open: true, anchor: null })} initialTab={step === 3 ? 'datos' : 'lectura'} />
        <Score readOnly stack={data.stack} selection={{ before: data.story.before, after: data.story.after, awaiting: 'before' }} applied={{ before: data.story.before, after: data.story.after }}
          dance={{ ...dance, available: step === 2 }} comparing={false} sound={prefs.sound} onSound={() => toggle('sound')} onPick={() => {}} onCompare={() => {}} />
      </Sheet>
      <footer className="pie">
        {c.saved} {t('map.attribution')}
        {optical ? ` ${t('basemap.attribution')}` : ''}
        {prefs.borders || prefs.names ? ` ${t('ref.attribution')}` : ''}
        {activeContext(context).length > 0
          ? ` ${t('ctx.attr.pie', { names: activeContext(context).map((id) => t(`ctx.attr.${id}` as Key)).join(', ') })}`
          : null}
      </footer>
      <MethodDialog open={method.open} anchor={method.anchor} onClose={() => setMethod({ open: false, anchor: null })} />
      <HelpDialog open={help} prefs={prefs} onToggle={toggle} onClose={() => setHelp(false)} />
    </div>
  );
}
