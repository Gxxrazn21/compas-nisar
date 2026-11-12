// Composición de la aplicación: escenario a toda la ventana y paneles flotantes encima.
import { useMemo, useRef, useState } from 'react';
import { ExplorePanel } from './components/explore/ExplorePanel';
import { LivePanel } from './components/live/LivePanel';
import { MethodDialog } from './components/method/MethodDialog';
import type { LupaControls } from './components/reading/LupaBlock';
import { ReadingPanel } from './components/reading/ReadingPanel';
import { Score } from './components/score/Score';
import { Sheet } from './components/shell/Sheet';
import { TopBar } from './components/shell/TopBar';
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
import { useCompas } from './state/useCompas';

const NO_CONTEXT: ContextLayers = {};

type View = 'cover' | 'story' | 'interferogram' | 'explore' | 'live';

export function App() {
  const { t } = useI18n();
  const compas = useCompas();
  const [methodOpen, setMethodOpen] = useState(false);
  const [methodAnchor, setMethodAnchor] = useState<'future' | null>(null);
  const openMethod = (anchor: 'future' | null = null) => {
    setMethodAnchor(anchor);
    setMethodOpen(true);
  };
  const [readingCollapsed, setReadingCollapsed] = useState(false);
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

  const liveLayers = useMemo<LiveLayers | null>(() => {
    if (view !== 'live') return null;
    return {
      events: live.tab === 'events' ? eventsGeoJSON(live.visibleEvents) : null,
      selectedEvent: live.selection?.kind === 'event' ? live.selection.id : null,
      urgent: live.tab === 'urgent' && live.urgent.status === 'ready' ? urgentGeoJSON(live.urgent.data) : null,
      selectedUrgent: live.selection?.kind === 'urgent' ? live.selection.id : null,
      onEvent: compas.selectEvent,
      onUrgent: compas.selectUrgent,
    };
    // `selectEvent` y `selectUrgent` cambian con el estado de En vivo: se recrean con él.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, live.tab, live.visibleEvents, live.urgent, live.selection, compas.selectEvent, compas.selectUrgent]);

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
      onPick={compas.pickScene}
      onCompare={onCompare}
    />
  );

  return (
    <div
      className={
        view === 'cover'
          ? 'app portada-app'
          : `app analisis vista-${view}${readingCollapsed && hasReading ? ' lectura-plegada' : ''}${
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
        probePoint={view === 'story' || view === 'explore' ? (compas.probe?.point ?? null) : null}
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
        apiRef={stageApi}
      />
      <TopBar mode={compas.mode} onMode={compas.setMode} onHome={compas.goHome} onMethod={() => openMethod()} />

      {view === 'cover' ? (
        <>
          <Cover stories={compas.stories} onOpen={compas.openStory} />
          <EarthTodayDetail />
        </>
      ) : (
        <Sheet label={t('sheet.toggle')}>
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
          {view === 'live' && <LivePanel compas={compas} />}

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
        {contextOn && activeContext(compas.context).length > 0
          ? ` ${t('ctx.attr.pie', { names: activeContext(compas.context).map((id) => t(`ctx.attr.${id}` as Key)).join(', ') })}`
          : null}
      </footer>
      <MethodDialog open={methodOpen} anchor={methodAnchor} onClose={() => setMethodOpen(false)} />
    </div>
  );
}
