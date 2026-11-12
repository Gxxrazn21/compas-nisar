// Estado de la aplicación: sección (historias, explorar, en vivo), fechas, capa, paso, lupa,
// sonda, danza y enlace permanente. La carga de datos vive en hooks propios (useChange,
// useStacks, useLive, useInterferograms) para que este archivo solo orqueste.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, isAbort } from '../api';
import { aoiFromView, bboxOfPolygon } from '../lib/aoi';
import { datesAroundEvent, hasPairAround } from '../lib/around';
import { cameraFor, centerOfBounds, zoomForBounds, zoomForWindow } from '../lib/camera';
import { buildHash, parseHash } from '../lib/hash';
import type { HashState, Mode } from '../lib/hash';
import { asLens } from '../lib/lens';
import { pick } from '../lib/selection';
import type { Selection } from '../lib/selection';
import { isChangeStory, isInterferogramStory } from '../types';
import type {
  Bounds,
  ChangeResult,
  ChangeStory,
  Health,
  InterferogramStory,
  LonLat,
  MapLayer,
  ProbeResult,
  Stack,
  Story,
  StoryStep,
  StepLayer,
  ZoomWindow,
} from '../types';
import { useChange, useZoom } from './useChange';
import type { ChangeState } from './useChange';
import { useDance } from './useDance';
import type { Dance } from './useDance';
import { prefersReducedMotion } from './useElapsed';
import { useInterferograms } from './useInterferograms';
import type { InterferogramsState } from './useInterferograms';
import { useLive } from './useLive';
import type { Live } from './useLive';
import { useStacks } from './useStacks';
import type { StacksState } from './useStacks';
import { useI18n } from '../i18n';

export type CameraTarget =
  | { kind: 'cover'; nonce: number }
  | {
      kind: 'view';
      center: LonLat;
      zoom: number;
      nonce: number;
      instant: boolean;
      duration?: number;
      /** Límites que el mapa debe encuadrar en el espacio que dejan libre los paneles. */
      fit?: Bounds;
    };

export interface ProbeState {
  point: LonLat;
  status: 'loading' | 'ready' | 'error';
  result: ProbeResult | null;
}

export type Load<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

export type AoiMode = 'view' | 'full';

/** Cómo quedó el área del último análisis de Explorar, para decírselo a la persona. */
export type AoiNote = 'view' | 'full' | 'covers' | 'outside' | null;

/** Qué pasó al buscar pasadas alrededor de un evento. */
export type AroundNote = 'pair' | 'before-only' | 'none' | null;

export const LUPA_SIZES = [10, 15, 20] as const;
const GLOBE_ZOOM = 2;

export interface Compas {
  proj: 'globe' | 'mercator';
  mode: Mode;
  stories: Load<Story[]>;
  story: Story | null;
  changeStory: ChangeStory | null;
  interferogramStory: InterferogramStory | null;
  steps: StoryStep[];
  stackId: string | null;
  stack: Stack | null;
  dates: { before: string; after: string } | null;
  step: number;
  /** Capa elegida por la persona o por el paso, antes de ajustes (danza, HV ausente). */
  layer: MapLayer;
  /** Capa que realmente muestra el mapa. */
  mapLayer: MapLayer;
  opacity: number;
  camera: CameraTarget;
  /** Estado de lo que se lee ahora: la lupa si está abierta, si no el browse. */
  readingState: ChangeState;
  /** Cambio que se dibuja en el mapa (la lupa mientras carga muestra el browse debajo). */
  mapChange: ChangeResult | null;
  /** Cambio del browse, que alimenta la danza. */
  browseChange: ChangeResult | null;
  selection: Selection;
  probe: ProbeState | null;
  dance: Dance;
  earthdata: boolean;
  // lupa
  lupaTarget: ZoomWindow | null;
  lupaSize: number;
  setLupaSize: (size: number) => void;
  openLupa: (center: LonLat | null) => void;
  closeLupa: () => void;
  // explorar
  explorePoint: LonLat | null;
  stacksState: StacksState;
  lens: string;
  setLens: (lens: string) => void;
  aoiMode: AoiMode;
  setAoiMode: (mode: AoiMode) => void;
  aoiNote: AoiNote;
  aroundNote: AroundNote;
  footprint: LonLat[] | null;
  pickPoint: (lon: number, lat: number) => void;
  goToPoint: (lon: number, lat: number) => void;
  chooseStack: (stack: Stack) => void;
  changePlace: () => void;
  changeStack: () => void;
  // en vivo
  live: Live;
  exploreFromLive: () => void;
  selectEvent: (id: string) => void;
  selectUrgent: (id: string) => void;
  // interferogramas
  interferograms: InterferogramsState;
  pair: number;
  setPair: (index: number) => void;
  // mapa base
  basemap: 'sat' | 'optico';
  setBasemap: (basemap: 'sat' | 'optico') => void;
  /** Fecha del mapa óptico (la fecha «después» de la comparación), si hay una. */
  opticalDate: string | null;
  // vistas
  /** Hay una comparación en pantalla o en camino: se muestra la lectura, la barra de capas y la sonda. */
  analysing: boolean;
  setMode: (mode: Mode) => void;
  openStory: (id: string) => void;
  goHome: () => void;
  setStep: (index: number) => void;
  setLayer: (layer: MapLayer) => void;
  setOpacity: (value: number) => void;
  pickScene: (sceneId: string) => void;
  compare: (viewBounds: Bounds | null) => void;
  probeAt: (lon: number, lat: number) => void;
  recenter: () => void;
}

function toMapLayer(layer: StepLayer | undefined): MapLayer {
  if (!layer || layer === 'zoom' || layer === 'interferogram') return 'change_hh';
  return layer;
}

function zoomWindow(story: ChangeStory | null): ZoomWindow | null {
  return story?.lupa ?? null;
}

function footprintBox(stack: Stack | null): Bounds | null {
  return bboxOfPolygon(stack?.footprint);
}

export function useCompas(): Compas {
  const { lang } = useI18n();
  const initial = useRef<HashState>(parseHash(window.location.hash));
  const start = initial.current;
  const startMode: Mode =
    start.mode ?? (start.story ? 'stories' : start.stack || start.point ? 'explore' : 'stories');

  const [mode, setModeState] = useState<Mode>(startMode);
  const [stories, setStories] = useState<Load<Story[]>>({ status: 'loading' });
  const [health, setHealth] = useState<Health | null>(null);
  const [storyId, setStoryId] = useState<string | null>(startMode === 'stories' ? start.story : null);
  const [dates, setDates] = useState<{ before: string; after: string } | null>(
    startMode === 'stories' && start.before && start.after ? { before: start.before, after: start.after } : null,
  );
  const [step, setStepState] = useState(start.step ?? 0);
  const [layerChoice, setLayerChoice] = useState<MapLayer | null>(start.layer);
  const [opacity, setOpacity] = useState(0.9);
  const [basemap, setBasemap] = useState<'sat' | 'optico'>(start.basemap);
  const [camera, setCamera] = useState<CameraTarget>(() => {
    if (startMode === 'explore') {
      return {
        kind: 'view',
        center: start.point ?? [-30, 14],
        zoom: start.point ? 5.5 : GLOBE_ZOOM,
        nonce: 0,
        instant: true,
      };
    }
    if (startMode === 'live') return { kind: 'view', center: [-30, 14], zoom: GLOBE_ZOOM, nonce: 0, instant: true };
    return { kind: 'cover', nonce: 0 };
  });
  const [stack, setStack] = useState<Stack | null>(null);
  const stackRef = useRef<Stack | null>(null);
  const [selection, setSelection] = useState<Selection>({ before: null, after: null, awaiting: 'before' });
  const [probe, setProbe] = useState<ProbeState | null>(null);
  const probeAbort = useRef<AbortController | null>(null);
  const nonce = useRef(1);

  // Exploración
  const [exPoint, setExPoint] = useState<LonLat | null>(startMode === 'explore' ? start.point : null);
  const [exStackId, setExStackId] = useState<string | null>(startMode === 'explore' ? start.stack : null);
  const [exDates, setExDates] = useState<{ before: string; after: string } | null>(
    startMode === 'explore' && start.before && start.after ? { before: start.before, after: start.after } : null,
  );
  const [exAoi, setExAoi] = useState<Bounds | null>(startMode === 'explore' ? start.aoi : null);
  const [exLens, setExLens] = useState<string>(asLens(start.lens));
  const [aoiMode, setAoiMode] = useState<AoiMode>('view');
  const [aoiNote, setAoiNote] = useState<AoiNote>(null);
  const [aroundNote, setAroundNote] = useState<AroundNote>(null);
  const pendingAround = useRef<string | null>(null);
  const preset = useRef<{ before: string | null; after: string | null } | null>(null);

  // Lupa calibrada pedida por la persona (la de un paso de historia se deriva del paso)
  const [lupaReq, setLupaReq] = useState<ZoomWindow | null>(start.lupa);
  const [lupaSize, setLupaSize] = useState<number>(start.lupa?.size_km ?? 15);

  // Interferogramas
  const [pair, setPairState] = useState(start.pair ?? 0);

  // Salud del servidor (¿hay token de Earthdata?)
  useEffect(() => {
    const controller = new AbortController();
    api
      .health(controller.signal)
      .then(setHealth)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const earthdata = health?.earthdata === true;

  // Historias
  useEffect(() => {
    const controller = new AbortController();
    api
      .stories(controller.signal)
      .then((data) => setStories({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (!isAbort(error)) setStories({ status: 'error' });
      });
    return () => controller.abort();
  }, []);

  const story = useMemo(
    () => (stories.status === 'ready' ? (stories.data.find((item) => item.id === storyId) ?? null) : null),
    [stories, storyId],
  );
  const changeStory = isChangeStory(story) ? story : null;
  const interferogramStory = isInterferogramStory(story) ? story : null;

  // Hash que apuntaba a una historia inexistente: vuelve a la portada.
  useEffect(() => {
    if (stories.status === 'ready' && storyId && !story) setStoryId(null);
  }, [stories, storyId, story]);

  const view = useCallback(
    (center: LonLat, zoom: number, instant: boolean, duration?: number, fit?: Bounds) =>
      setCamera({ kind: 'view', center, zoom, nonce: nonce.current++, instant, duration, fit }),
    [],
  );

  // Al restaurar una historia desde el hash, la cámara salta al lugar sin volar.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !story) return;
    restored.current = true;
    const target = cameraFor(story);
    view(target.center, target.zoom, true, undefined, target.fit);
  }, [story, view]);

  // Pasos visibles: el de la lupa solo existe si el servidor tiene token de Earthdata.
  const steps = useMemo<StoryStep[]>(() => {
    if (!story) return [];
    return story.steps.filter((item) => item.layer !== 'zoom' || (earthdata && zoomWindow(changeStory) !== null));
  }, [story, earthdata, changeStory]);
  const stepIndex = Math.max(0, Math.min(step, steps.length - 1));
  const stepKind = steps[stepIndex]?.layer;

  // La pila depende de la sección
  const stackId = mode === 'stories' ? (changeStory?.stack ?? null) : mode === 'explore' ? exStackId : null;
  const applied =
    mode === 'stories'
      ? (dates ?? (changeStory ? { before: changeStory.before, after: changeStory.after } : null))
      : mode === 'explore'
        ? exDates
        : null;
  const aoi = mode === 'stories' ? (changeStory?.aoi ?? null) : mode === 'explore' ? exAoi : null;
  const lens = mode === 'stories' && story ? story.lens : exLens;

  // Pila para la partitura. En Explorar ya la tenemos de la lista; si viene del hash, se pide.
  useEffect(() => {
    if (!stackId) {
      stackRef.current = null;
      setStack(null);
      return;
    }
    if (stackRef.current?.id === stackId) return;
    const controller = new AbortController();
    api
      .stack(stackId, controller.signal)
      .then((value) => {
        stackRef.current = value;
        setStack(value);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [stackId]);

  const stacksState = useStacks(exPoint, mode === 'explore');

  const browseState = useChange(
    stackId && applied ? { stack: stackId, before: applied.before, after: applied.after, aoi } : null,
  );
  const browseChange: ChangeResult | null = browseState.change;

  // Lupa: la del paso de la historia o la que pidió la persona
  const storyLupa = mode === 'stories' && earthdata && stepKind === 'zoom' ? zoomWindow(changeStory) : null;
  const lupaTarget = earthdata && stackId && applied ? (lupaReq ?? storyLupa) : null;
  const lupaState = useZoom(
    lupaTarget && stackId && applied
      ? { ...lupaTarget, stack: stackId, before: applied.before, after: applied.after }
      : null,
  );
  const readingState = lupaTarget ? lupaState : browseState;
  const mapChange = lupaTarget ? (lupaState.change ?? browseChange) : browseChange;

  // La selección de la partitura parte siempre de lo que está en el mapa (o del preajuste de un evento).
  const appliedKey = applied ? `${applied.before}|${applied.after}` : '';
  useEffect(() => {
    const seed = preset.current;
    preset.current = null;
    if (seed && !applied) {
      setSelection({
        before: seed.before,
        after: seed.after,
        awaiting: seed.before && !seed.after ? 'after' : 'before',
      });
      return;
    }
    setSelection({ before: applied?.before ?? null, after: applied?.after ?? null, awaiting: 'before' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedKey, stackId]);

  // La sonda pertenece a un cambio concreto.
  const changeId = mapChange?.id ?? null;
  useEffect(() => {
    probeAbort.current?.abort();
    setProbe(null);
  }, [changeId]);

  const footprint = useMemo<LonLat[] | null>(
    () => (mode === 'explore' ? (stack?.footprint?.coordinates?.[0] ?? null) : null),
    [mode, stack],
  );

  /** Cámara que encuadra la huella de la pila de Explorar. */
  const fitFootprint = useCallback(
    (target: Stack, instant: boolean) => {
      const box = footprintBox(target);
      if (!box) return;
      view(centerOfBounds(box), Math.min(zoomForBounds(box, 760, 420), 9), instant, undefined, box);
    },
    [view],
  );

  // Restaurar Explorar desde el hash: la cámara se encuadra en la huella cuando llega la pila.
  const restoredExplore = useRef(false);
  useEffect(() => {
    if (restoredExplore.current || !stack || mode !== 'explore' || !start.stack) return;
    restoredExplore.current = true;
    if (start.aoi) {
      view(centerOfBounds(start.aoi), Math.min(zoomForBounds(start.aoi, 760, 420), 9), true, undefined, start.aoi);
    } else {
      fitFootprint(stack, true);
    }
  }, [stack, mode, start.stack, start.aoi, view, fitFootprint]);

  // La danza usa el centro del área analizada y el mismo aoi guardado
  const dancePoint: LonLat | null = aoi ? centerOfBounds(aoi) : browseChange ? centerOfBounds(browseChange.bounds) : null;
  const danceTarget = useMemo(
    () => (stackId && dancePoint ? { stack: stackId, point: dancePoint, aoi } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stackId, dancePoint?.[0], dancePoint?.[1], aoi?.join(',')],
  );
  const dance = useDance(danceTarget);

  const rawLayer = layerChoice ?? toMapLayer(stepKind);
  const hasHv = Boolean(mapChange?.layers.change_hv);
  const mapLayer: MapLayer = dance.active
    ? 'dance'
    : rawLayer === 'dance'
      ? 'change_hh'
      : rawLayer === 'change_hv' && !hasHv
        ? 'change_hh'
        : rawLayer;

  const analysing = mode === 'stories' ? Boolean(changeStory && stackId && applied) : mode === 'explore' ? Boolean(stackId && applied) : false;

  // Interferogramas
  const interferograms = useInterferograms(interferogramStory);
  const pairIndex =
    interferograms.status === 'ready' ? Math.max(0, Math.min(pair, interferograms.items.length - 1)) : pair;

  // En vivo
  const live = useLive(mode === 'live');

  // Enlace permanente
  const lupaForHash = lupaReq ?? null;
  useEffect(() => {
    let state: Partial<HashState>;
    if (mode === 'stories' && story) {
      state = {
        mode,
        story: story.id,
        stack: stackId,
        before: dates?.before,
        after: dates?.after,
        layer: interferogramStory ? null : rawLayer,
        step,
        pair: interferogramStory ? pairIndex : null,
        lupa: lupaForHash,
        basemap,
      };
    } else if (mode === 'explore') {
      state = {
        mode,
        stack: exStackId,
        point: exPoint,
        before: exDates?.before,
        after: exDates?.after,
        lens: exLens,
        aoi: exAoi,
        layer: exDates ? rawLayer : null,
        lupa: lupaForHash,
        basemap,
      };
    } else if (mode === 'live') {
      state = { mode };
    } else {
      state = {};
    }
    const next = buildHash({ ...state, lang, proj: start.proj });
    if (next !== window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
    }
  }, [
    mode, story, interferogramStory, stackId, dates, rawLayer, step, pairIndex, lupaForHash, basemap,
    exStackId, exPoint, exDates, exLens, exAoi, lang, start.proj,
  ]);

  // Cámara al abrir o cerrar la lupa
  const lupaKey = lupaTarget ? `${lupaTarget.lon},${lupaTarget.lat},${lupaTarget.size_km}` : '';
  const previousLupa = useRef<string | null>(null);
  const recenterRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    const before = previousLupa.current;
    previousLupa.current = lupaKey;
    if (lupaKey && lupaKey !== before && lupaTarget) {
      view(
        [lupaTarget.lon, lupaTarget.lat],
        zoomForWindow(lupaTarget.size_km, lupaTarget.lat),
        before === null || prefersReducedMotion(),
        2600,
      );
    } else if (!lupaKey && before) {
      recenterRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lupaKey]);

  const goHome = useCallback(() => {
    setModeState('stories');
    setStoryId(null);
    setDates(null);
    setStepState(0);
    setLayerChoice(null);
    setLupaReq(null);
    setCamera({ kind: 'cover', nonce: nonce.current++ });
  }, []);

  const openStory = useCallback(
    (id: string) => {
      if (stories.status !== 'ready') return;
      const target = stories.data.find((item) => item.id === id);
      if (!target) return;
      const aim = cameraFor(target);
      setModeState('stories');
      setStoryId(id);
      setDates(null);
      setStepState(0);
      setLayerChoice(null);
      setLupaReq(null);
      setPairState(0);
      view(aim.center, aim.zoom, prefersReducedMotion(), undefined, aim.fit);
    },
    [stories, view],
  );

  const resetExplore = useCallback(() => {
    setExStackId(null);
    setExDates(null);
    setExAoi(null);
    setLupaReq(null);
    setAoiNote(null);
    setAroundNote(null);
    setLayerChoice(null);
    preset.current = null;
  }, []);

  const setMode = useCallback(
    (next: Mode) => {
      if (next === 'stories') {
        goHome();
        return;
      }
      setModeState(next);
      setStoryId(null);
      setLupaReq(null);
      setLayerChoice(null);
      if (next === 'explore') {
        if (stack && exStackId) fitFootprint(stack, false);
        else if (exPoint) view(exPoint, 5.5, prefersReducedMotion());
        else view([-30, 14], GLOBE_ZOOM, prefersReducedMotion(), 1800);
      } else {
        view([-30, 14], GLOBE_ZOOM, prefersReducedMotion(), 1800);
      }
    },
    [goHome, stack, exStackId, exPoint, fitFootprint, view],
  );

  const setStep = useCallback(
    (index: number) => {
      if (!story) return;
      const bounded = Math.max(0, Math.min(steps.length - 1, index));
      setStepState(bounded);
      setLayerChoice(null);
      setLupaReq(null);
      dance.stop();
    },
    // `dance.stop` es estable por la forma en que lo expone useDance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [story, steps.length],
  );

  const setLayer = useCallback(
    (layer: MapLayer) => {
      setLayerChoice(layer);
      dance.stop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const pickScene = useCallback(
    (sceneId: string) => {
      if (!stack) return;
      const scene = stack.scenes.find((item) => item.id === sceneId);
      if (scene) setSelection((current) => pick(current, scene, stack.scenes));
    },
    [stack],
  );

  const compare = useCallback(
    (viewBounds: Bounds | null) => {
      if (!selection.before || !selection.after) return;
      const next = { before: selection.before, after: selection.after };
      if (mode === 'explore') {
        const choice = aoiFromView(viewBounds, footprintBox(stack), aoiMode);
        setExAoi(choice.aoi);
        setAoiNote(
          choice.reason === 'view'
            ? 'view'
            : choice.reason === 'full-mode'
              ? 'full'
              : choice.reason === 'view-covers'
                ? 'covers'
                : choice.reason === 'outside'
                  ? 'outside'
                  : 'full',
        );
        setExDates(next);
      } else {
        setDates(next);
      }
      setLupaReq(null);
      setLayerChoice((current) => current ?? 'change_hh');
      dance.stop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selection, mode, stack, aoiMode],
  );

  const probeAt = useCallback(
    (lon: number, lat: number) => {
      if (!mapChange) return;
      probeAbort.current?.abort();
      const controller = new AbortController();
      probeAbort.current = controller;
      setProbe({ point: [lon, lat], status: 'loading', result: null });
      api
        .probe(mapChange.id, lon, lat, controller.signal)
        .then((result) => setProbe({ point: [lon, lat], status: 'ready', result }))
        .catch((error: unknown) => {
          if (!isAbort(error)) setProbe({ point: [lon, lat], status: 'error', result: null });
        });
    },
    [mapChange],
  );

  const recenter = useCallback(() => {
    if (story) {
      const aim = cameraFor(story);
      view(aim.center, aim.zoom, false, undefined, aim.fit);
    } else if (mode === 'explore' && stack) {
      fitFootprint(stack, false);
    } else if (browseChange) {
      view(centerOfBounds(browseChange.bounds), 7, false);
    }
  }, [story, mode, stack, browseChange, fitFootprint, view]);
  recenterRef.current = recenter;

  // Lupa pedida por la persona
  const openLupa = useCallback(
    (center: LonLat | null) => {
      const point = center ?? (probe?.point ?? null);
      if (!point) return;
      setLupaReq({ lon: point[0], lat: point[1], size_km: lupaSize });
      dance.stop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lupaSize, probe],
  );

  const closeLupa = useCallback(() => {
    setLupaReq(null);
    // Si la lupa venía del paso de una historia, se sale del paso hacia el anterior.
    if (storyLupa) {
      const zoomStep = steps.findIndex((item) => item.layer === 'zoom');
      setStepState(Math.max(0, zoomStep - 1));
      setLayerChoice(null);
    }
  }, [storyLupa, steps]);

  const changeLupaSize = useCallback(
    (size: number) => {
      setLupaSize(size);
      setLupaReq((current) => (current ? { ...current, size_km: size } : current));
    },
    [],
  );

  // Explorar
  const pickPoint = useCallback(
    (lon: number, lat: number) => {
      resetExplore();
      setExPoint([lon, lat]);
      pendingAround.current = null;
    },
    [resetExplore],
  );

  const goToPoint = useCallback(
    (lon: number, lat: number) => {
      pickPoint(lon, lat);
      view([lon, lat], 5.5, prefersReducedMotion(), 2400);
    },
    [pickPoint, view],
  );

  const chooseStack = useCallback(
    (target: Stack) => {
      stackRef.current = target;
      setStack(target);
      setExDates(null);
      setExAoi(null);
      setLupaReq(null);
      setAoiNote(null);
      setLayerChoice(null);
      setExStackId(target.id);
      fitFootprint(target, prefersReducedMotion());
    },
    [fitFootprint],
  );

  // «Explorar aquí» desde un evento: elige la pila con pasadas a ambos lados de la fecha.
  useEffect(() => {
    const iso = pendingAround.current;
    if (mode !== 'explore' || !iso || stacksState.status !== 'ready' || exStackId) return;
    pendingAround.current = null;
    const list = stacksState.stacks;
    const withPair = list.find((item) => hasPairAround(item.scenes, iso));
    const partial = list.find((item) => datesAroundEvent(item.scenes, iso).before);
    const target = withPair ?? partial ?? null;
    if (!target) {
      setAroundNote('none');
      return;
    }
    const around = datesAroundEvent(target.scenes, iso);
    preset.current = around;
    setAroundNote(around.before && around.after ? 'pair' : 'before-only');
    chooseStack(target);
  }, [mode, stacksState, exStackId, chooseStack]);

  const changePlace = useCallback(() => {
    resetExplore();
    setExPoint(null);
    view([-30, 14], GLOBE_ZOOM, prefersReducedMotion(), 1800);
  }, [resetExplore, view]);

  const changeStack = useCallback(() => {
    resetExplore();
    if (exPoint) view(exPoint, 5.5, prefersReducedMotion(), 1800);
  }, [resetExplore, exPoint, view]);

  // En vivo
  const selectEvent = useCallback(
    (id: string) => {
      live.select({ kind: 'event', id });
      live.setTab('events');
      if (live.events.status === 'ready') {
        const found = live.events.data.find((item) => item.id === id);
        if (found) view([found.lon, found.lat], 5.5, prefersReducedMotion(), 2200);
      }
    },
    [live, view],
  );

  const selectUrgent = useCallback(
    (id: string) => {
      live.select({ kind: 'urgent', id });
      live.setTab('urgent');
      if (live.urgent.status === 'ready') {
        const found = live.urgent.data.find((item) => `${item.stack}|${item.datetime}` === id);
        if (found) view(found.center, 5.5, prefersReducedMotion(), 2200);
      }
    },
    [live, view],
  );

  const exploreFromLive = useCallback(() => {
    const event = live.selectedEvent;
    const urgent = live.selectedUrgent;
    const target = event
      ? { point: [event.lon, event.lat] as LonLat, date: event.date }
      : urgent
        ? { point: urgent.center, date: urgent.datetime }
        : null;
    if (!target) return;
    resetExplore();
    setModeState('explore');
    setStoryId(null);
    setExPoint(target.point);
    pendingAround.current = target.date;
    view(target.point, 6, prefersReducedMotion(), 2400);
  }, [live.selectedEvent, live.selectedUrgent, resetExplore, view]);

  const setPair = useCallback((index: number) => setPairState(index), []);

  const opticalDate = applied?.after ?? null;

  return {
    proj: start.proj,
    mode,
    stories,
    story,
    changeStory,
    interferogramStory,
    steps,
    stackId,
    stack,
    dates: applied,
    step: stepIndex,
    layer: rawLayer,
    mapLayer,
    opacity,
    camera,
    readingState,
    mapChange,
    browseChange,
    selection,
    probe,
    dance,
    earthdata,
    lupaTarget,
    lupaSize,
    setLupaSize: changeLupaSize,
    openLupa,
    closeLupa,
    explorePoint: mode === 'explore' ? exPoint : null,
    stacksState,
    lens,
    setLens: setExLens,
    aoiMode,
    setAoiMode,
    aoiNote,
    aroundNote,
    footprint,
    pickPoint,
    goToPoint,
    chooseStack,
    changePlace,
    changeStack,
    live,
    exploreFromLive,
    selectEvent,
    selectUrgent,
    interferograms,
    pair: pairIndex,
    setPair,
    basemap,
    setBasemap,
    opticalDate,
    analysing,
    setMode,
    openStory,
    goHome,
    setStep,
    setLayer,
    setOpacity,
    pickScene,
    compare,
    probeAt,
    recenter,
  };
}
