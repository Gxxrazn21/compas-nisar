// Composición de la aplicación: escenario a toda la ventana y paneles flotantes encima.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExplorePanel } from './components/explore/ExplorePanel';
import { LivePanel } from './components/live/LivePanel';
import { MethodDialog } from './components/method/MethodDialog';
import type { LupaControls } from './components/reading/LupaBlock';
import { ReadingPanel } from './components/reading/ReadingPanel';
import { Score } from './components/score/Score';
import { HelpDialog } from './components/shell/HelpDialog';
import { MapHint } from './components/shell/MapHint';
import { Sheet } from './components/shell/Sheet';
import { TopBar } from './components/shell/TopBar';
import { TourPlayer } from './components/tour/TourPlayer';
import { MapToolbar } from './components/stage/MapToolbar';
import { Stage } from './components/stage/Stage';
import type { LiveLayers, StageApi } from './components/stage/Stage';
import { Cover, EarthTodayDetail } from './components/story/Cover';
import { InterferogramPicker, InterferogramReading } from './components/story/InterferogramParts';
import { StoryPanel } from './components/story/StoryPanel';
import { useI18n } from './i18n';
import type { Key } from './i18n/es';
import { activeContext } from './lib/context';
import type { ContextLayers } from './lib/context';
import { eventsGeoJSON, urgentGeoJSON } from './lib/events';
import { parseHash } from './lib/hash';
import { unlockSound } from './lib/sound';
import { DANCE_EXTRA_MS, stepDuration, textKey } from './lib/tour';
import type { Chapter, TourStep } from './lib/tour';
import { useCompas } from './state/useCompas';
import { usePrefs } from './state/usePrefs';
import { useShortcuts } from './state/useShortcuts';
import { useTour } from './state/useTour';
import { useTourDirector } from './state/useTourDirector';

const NO_CONTEXT: ContextLayers = {};

type View = 'cover' | 'story' | 'interferogram' | 'explore' | 'live';

export function App() {
  const { t } = useI18n();
  // Un enlace permanente puede fijar las fronteras y los nombres; lo demás sale de lo guardado.
  const linked = useRef(parseHash(window.location.hash).reference).current;
  const { prefs, toggle } = usePrefs(linked);
  const reference = useMemo(() => ({ borders: prefs.borders, names: prefs.names }), [prefs.borders, prefs.names]);
  const compas = useCompas(reference);
  const [helpOpen, setHelpOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [methodAnchor, setMethodAnchor] = useState<'future' | null>(null);
  const openMethod = (anchor: 'future' | null = null) => {
    setMethodAnchor(anchor);
    setMethodOpen(true);
  };
  const [readingCollapsed, setReadingCollapsed] = useState(false);
  // Recorrido guiado: cada paso dura lo que toma leer su texto en el idioma elegido.
  const tour = useTour(
    useCallback((step: TourStep) => stepDuration(t(textKey(step)), step.dance ? DANCE_EXTRA_MS : 0), [t]),
  );
  useTourDirector(tour, compas);
  const startTour = (chapter?: Chapter) => {
    setHelpOpen(false);
    setMethodOpen(false);
    // Explicar el panel de lectura con el panel plegado no sirve de nada.
    setReadingCollapsed(false);
    tour.start(chapter);
  };
  const stageApi = useRef<StageApi | null>(null);
  const { dance, live, mode, story } = compas;

  const view: View =
    mode === 'live'
      ? 'live'
      : mode === 'explore'
        ? 'explore'
        : compas.interferogramStory
          ? 'interferogram'
          : story
            ? 'story'
            : 'cover';

  const change = compas.mapChange;
  const probing = Boolean(change) && compas.mapLayer !== 'dance' && (view === 'story' || view === 'explore');
  const picking = view === 'explore' && !compas.stackId;
  const hasReading = view === 'story' || (view === 'explore' && compas.readingState.status !== 'idle');

  const optical =
    compas.basemap === 'optico' && compas.mapLayer !== 'swipe' && compas.opticalDate && (view === 'story' || view === 'explore')
      ? compas.opticalDate
      : null;

  // Las capas de contexto acompañan a una comparación: solo se dibujan en Historias y Explorar.
  const contextOn = view === 'story' || (view === 'explore' && compas.readingState.status !== 'idle');

  // `selectEvent` y `selectUrgent` se recrean en cada render: se llaman a través de una referencia para
  // que el mapa no vuelva a cargar y agrupar los quinientos eventos cada vez que algo cambia en pantalla.
  const liveActions = useRef({ event: compas.selectEvent, urgent: compas.selectUrgent });
  liveActions.current = { event: compas.selectEvent, urgent: compas.selectUrgent };
  const onLiveEvent = useCallback((id: string) => liveActions.current.event(id), []);
  const onLiveUrgent = useCallback((id: string) => liveActions.current.urgent(id), []);
  const eventsData = useMemo(() => eventsGeoJSON(live.visibleEvents), [live.visibleEvents]);
  const urgentData = useMemo(
    () => (live.urgent.status === 'ready' ? urgentGeoJSON(live.urgent.data) : null),
    [live.urgent],
  );
  const liveLayers = useMemo<LiveLayers | null>(() => {
    if (view !== 'live') return null;
    return {
      events: live.tab === 'events' ? eventsData : null,
      selectedEvent: live.selection?.kind === 'event' ? live.selection.id : null,
      urgent: live.tab === 'urgent' ? urgentData : null,
      selectedUrgent: live.selection?.kind === 'urgent' ? live.selection.id : null,
      onEvent: onLiveEvent,
      onUrgent: onLiveUrgent,
    };
  }, [view, live.tab, eventsData, urgentData, live.selection, onLiveEvent, onLiveUrgent]);

  const overlay = useMemo(() => {
    if (view !== 'interferogram' || compas.interferograms.status !== 'ready') return null;
    const item = compas.interferograms.items[compas.pair];
    return item ? { url: item.image, coordinates: item.coordinates } : null;
  }, [view, compas.interferograms, compas.pair]);

  const lupa: LupaControls = {
    available: compas.earthdata,
    target: compas.lupaTarget,
    size: compas.lupaSize,
    hasProbe: Boolean(compas.probe),
    onSize: compas.setLupaSize,
    onOpen: () => compas.openLupa(compas.probe?.point ?? stageApi.current?.getCenter() ?? null),
    onClose: compas.closeLupa,
  };

  const onCompare = () => compas.compare(stageApi.current?.getViewBounds() ?? null);
  const score = (
    <Score
      stack={compas.stack}
      selection={compas.selection}
      applied={compas.dates}
      dance={dance}
      comparing={compas.readingState.status === 'loading'}
      emptyText={view === 'explore' && !compas.stackId ? t('explore.scoreEmpty') : undefined}
      sound={prefs.sound}
      onSound={() => toggle('sound')}
      onPick={compas.pickScene}
      onCompare={onCompare}
    />
  );

  // El primer gesto de la persona habilita el audio: las notas de la danza llegan mucho después del clic.
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

  useShortcuts((id) => {
    // Con el recorrido abierto, las flechas y el espacio lo gobiernan a él.
    if (tour.active && (id === 'prev' || id === 'next' || id === 'playPause')) {
      if (id === 'prev') tour.prev();
      else if (id === 'next') tour.next();
      else tour.toggle();
      return true;
    }
    switch (id) {
      case 'stories':
      case 'explore':
      case 'live':
        if (id !== compas.mode || (id === 'stories' && story)) compas.setMode(id);
        return true;
      case 'prev':
      case 'next':
        if (view !== 'story' && view !== 'interferogram') return false;
        compas.setStep(compas.step + (id === 'next' ? 1 : -1));
        return true;
      case 'playPause':
        if (!dance.active || dance.manualOnly) return false;
        dance.toggle();
        return true;
      case 'dance':
        if ((view !== 'story' && view !== 'explore') || !compas.stack || !dance.available) return false;
        if (dance.phase === 'idle' || dance.phase === 'error') dance.start();
        else if (dance.phase === 'ready') dance.stop();
        else dance.cancel();
        return true;
      case 'borders':
      case 'names':
      case 'sound':
        toggle(id);
        return true;
      case 'zoomIn':
        stageApi.current?.zoomIn();
        return true;
      case 'zoomOut':
        stageApi.current?.zoomOut();
        return true;
      case 'recenter':
        if (view === 'cover' || view === 'live') return false;
        compas.recenter();
        return true;
      case 'help':
        setHelpOpen(true);
        return true;
    }
  });

  // Una sola pista a la vez: el paso siguiente de la vista actual.
  const hint: { text: Key; keys?: Key } | null = !prefs.hints || tour.active
    ? null
    : view === 'live'
      ? { text: live.selection ? 'hint.liveSelected' : live.tab === 'urgent' ? 'hint.liveUrgent' : live.tab === 'satellite' ? 'hint.liveSatellite' : 'hint.live' }
      : view === 'interferogram'
        ? { text: 'hint.interferogram', keys: 'hint.keys.steps' }
        : dance.active
          ? { text: 'hint.dance', keys: dance.manualOnly ? undefined : 'hint.keys.dance' }
          : view === 'explore' && !compas.stackId && !compas.explorePoint
            ? { text: 'hint.pickPlace' }
            : view === 'explore' && !compas.stackId
              ? compas.stacksState.status === 'ready' && compas.stacksState.stacks.length > 0
                ? { text: 'hint.pickStack' }
                : null
              : view === 'explore' && compas.readingState.status === 'idle'
                ? { text: 'hint.pickNotes' }
                : (view === 'story' || view === 'explore') && change && compas.mapLayer !== 'swipe'
                  ? { text: 'hint.probe', keys: view === 'story' ? 'hint.keys.steps' : undefined }
                  : null;

  return (
    <div
      className={
        view === 'cover'
          ? 'app portada-app'
          : `app analisis vista-${view}${hasReading ? ' con-lectura' : ''}${readingCollapsed && hasReading ? ' lectura-plegada' : ''}${
              view === 'explore' && compas.readingState.status === 'idle' ? ' sin-herramientas' : ''
            }`
      }
    >
      <Stage
        projection={compas.proj}
        camera={compas.camera}
        change={change}
        layer={compas.mapLayer}
        opacity={compas.opacity}
        series={dance.series}
        danceIndex={dance.active ? dance.index : null}
        probePoint={view === 'story' || view === 'explore' ? (dance.active ? dance.point : compas.probe?.point ?? null) : null}
        probing={probing}
        onProbe={compas.probeAt}
        picking={picking}
        onPick={compas.pickPoint}
        explorePoint={compas.explorePoint}
        footprint={view === 'explore' ? compas.footprint : null}
        live={liveLayers}
        overlay={overlay}
        opticalDate={optical}
        context={contextOn ? compas.context : NO_CONTEXT}
        contextDate={compas.contextDate}
        reference={reference}
        satellite={view === 'live' && live.satellite.state.status === 'ready' ? live.satellite.state.orbit : null}
        apiRef={stageApi}
      />
      <TopBar
        mode={compas.mode}
        borders={prefs.borders}
        names={prefs.names}
        onMode={compas.setMode}
        onHome={compas.goHome}
        onMethod={() => openMethod()}
        onBorders={() => toggle('borders')}
        onNames={() => toggle('names')}
        onHelp={() => setHelpOpen(true)}
        onTour={() => startTour()}
      />
      {hint && (
        <MapHint text={t(hint.text)} keys={hint.keys ? t(hint.keys) : undefined} onDismiss={() => toggle('hints')} />
      )}

      {view === 'cover' ? (
        <>
          <Cover stories={compas.stories} onOpen={compas.openStory} onTour={() => startTour()} />
          <EarthTodayDetail />
        </>
      ) : (
        <Sheet label={t('sheet.toggle')} collapsed={tour.step?.scene === 'satellite'}>
          {view === 'story' && story && (
            <StoryPanel
              story={story}
              steps={compas.steps}
              step={compas.step}
              dance={dance}
              onStep={compas.setStep}
              onBack={compas.goHome}
              onFuture={() => openMethod('future')}
            />
          )}
          {view === 'interferogram' && story && (
            <StoryPanel
              story={story}
              steps={compas.steps}
              step={compas.step}
              dance={dance}
              extra={<InterferogramPicker state={compas.interferograms} pair={compas.pair} onPair={compas.setPair} />}
              onStep={compas.setStep}
              onBack={compas.goHome}
              onFuture={() => openMethod('future')}
            />
          )}
          {view === 'explore' && <ExplorePanel compas={compas} />}
          {view === 'live' && <LivePanel compas={compas} onTour={() => startTour('satellite')} />}

          {(view === 'story' || view === 'explore' || view === 'interferogram') &&
            (view !== 'explore' || compas.readingState.status !== 'idle') && (
              <MapToolbar
                change={change}
                layer={compas.mapLayer}
                opacity={compas.opacity}
                compact={view === 'interferogram'}
                basemap={compas.basemap}
                opticalDate={view === 'interferogram' ? null : compas.opticalDate}
                onLayer={compas.setLayer}
                onOpacity={compas.setOpacity}
                onBasemap={compas.setBasemap}
                onRecenter={compas.recenter}
                context={{
                  layers: compas.context,
                  date: compas.contextDate,
                  days: compas.contextDays,
                  after: compas.opticalDate,
                  onLayer: compas.setContextLayer,
                  onStep: compas.stepContextDays,
                }}
                stageApi={stageApi}
              />
            )}

          {hasReading && (
            <ReadingPanel
              state={compas.readingState}
              lens={compas.lens}
              stack={compas.stack}
              probe={compas.probe}
              lupa={lupa}
              collapsed={readingCollapsed}
              onCollapse={setReadingCollapsed}
              onMethod={() => openMethod()}
            />
          )}
          {view === 'interferogram' && <InterferogramReading state={compas.interferograms} pair={compas.pair} />}
          {(view === 'story' || view === 'explore') && score}
        </Sheet>
      )}

      <footer className="pie">
        {t(view === 'live' ? 'live.footer' : 'map.attribution')}
        {optical ? ` ${t('basemap.attribution')}` : ''}
        {prefs.borders || prefs.names ? ` ${t('ref.attribution')}` : ''}
        {contextOn && activeContext(compas.context).length > 0
          ? ` ${t('ctx.attr.pie', { names: activeContext(compas.context).map((id) => t(`ctx.attr.${id}` as Key)).join(', ') })}`
          : null}
      </footer>
      <MethodDialog open={methodOpen} anchor={methodAnchor} onClose={() => setMethodOpen(false)} />
      <HelpDialog open={helpOpen} prefs={prefs} onToggle={toggle} onClose={() => setHelpOpen(false)} onTour={() => startTour()} />
      <TourPlayer tour={tour} />
    </div>
  );
}
