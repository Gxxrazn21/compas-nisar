// Sección En vivo: eventos naturales (EONET) y adquisiciones urgentes de NISAR.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api, isAbort } from '../api';
import { filterEvents, groupUrgent, presentCategories } from '../lib/events';
import type { UrgentGroup } from '../lib/events';
import type { NaturalEvent } from '../types';
import { useSatellite } from './useSatellite';
import type { Satellite } from './useSatellite';

export const EVENT_DAYS = 20;
/** Con la sección abierta, los datos se vuelven a pedir solos cada diez minutos. */
export const REFRESH_MS = 10 * 60 * 1000;

type Load<T> = { status: 'loading' } | { status: 'error'; detail: string } | { status: 'ready'; data: T };

export type LiveTab = 'events' | 'urgent' | 'satellite';

export type LiveSelection = { kind: 'event'; id: string } | { kind: 'urgent'; id: string } | null;

export interface Live {
  tab: LiveTab;
  setTab: (tab: LiveTab) => void;
  events: Load<NaturalEvent[]>;
  urgent: Load<UrgentGroup[]>;
  hidden: ReadonlySet<string>;
  toggleCategory: (key: string) => void;
  showAll: () => void;
  categories: string[];
  /** Solo los eventos que siguen en curso (EONET los da por cerrados cuando terminan). */
  onlyOpen: boolean;
  toggleOnlyOpen: () => void;
  openCount: number;
  visibleEvents: NaturalEvent[];
  selection: LiveSelection;
  select: (selection: LiveSelection) => void;
  selectedEvent: NaturalEvent | null;
  selectedUrgent: UrgentGroup | null;
  reload: () => void;
  /** Hora de la última respuesta correcta de eventos (milisegundos), o `null` si aún no hay. */
  updatedAt: number | null;
  /** Hay una actualización en camino con datos anteriores todavía en pantalla. */
  refreshing: boolean;
  /** Lo que se ve es una copia anterior: el servicio no respondió en la última consulta. */
  stale: boolean;
  /** Órbita de NISAR: el satélite se dibuja en el mapa mientras la sección está abierta. */
  satellite: Satellite;
}

export function useLive(enabled: boolean): Live {
  const [tab, setTab] = useState<LiveTab>('events');
  const [events, setEvents] = useState<Load<NaturalEvent[]>>({ status: 'loading' });
  const [urgent, setUrgent] = useState<Load<UrgentGroup[]>>({ status: 'loading' });
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [selection, select] = useState<LiveSelection>(null);
  const [attempt, setAttempt] = useState(0);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const loaded = useRef({ events: false, urgent: false });
  const satellite = useSatellite(enabled);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const detail = (error: unknown) => (error instanceof ApiError ? error.detail : '');
    // Una actualización no borra lo que ya se ve: solo la primera carga muestra «Consultando…».
    if (!loaded.current.events) setEvents({ status: 'loading' });
    if (!loaded.current.urgent) setUrgent({ status: 'loading' });
    setRefreshing(loaded.current.events);
    api
      .events(EVENT_DAYS, controller.signal)
      .then((body) => {
        loaded.current.events = true;
        setEvents({ status: 'ready', data: body.events });
        setStale(body.stale === true);
        if (body.stale !== true) setUpdatedAt(Date.now());
        setRefreshing(false);
      })
      .catch((error: unknown) => {
        if (isAbort(error)) return;
        setRefreshing(false);
        if (loaded.current.events) setStale(true);
        else setEvents({ status: 'error', detail: detail(error) });
      });
    api
      .urgent(30, controller.signal)
      .then((scenes) => {
        loaded.current.urgent = true;
        setUrgent({ status: 'ready', data: groupUrgent(scenes) });
      })
      .catch((error: unknown) => {
        if (!isAbort(error) && !loaded.current.urgent) setUrgent({ status: 'error', detail: detail(error) });
      });
    return () => controller.abort();
  }, [enabled, attempt]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setAttempt((value) => value + 1), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);

  const toggleCategory = useCallback((key: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const showAll = useCallback(() => setHidden(new Set()), []);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const categories = useMemo(() => (events.status === 'ready' ? presentCategories(events.data) : []), [events]);
  const toggleOnlyOpen = useCallback(() => setOnlyOpen((value) => !value), []);
  const openCount = useMemo(
    () => (events.status === 'ready' ? events.data.filter((event) => !event.closed).length : 0),
    [events],
  );
  const visibleEvents = useMemo(
    () => (events.status === 'ready' ? filterEvents(events.data, hidden, onlyOpen) : []),
    [events, hidden, onlyOpen],
  );

  const selectedEvent = useMemo(
    () =>
      selection?.kind === 'event' && events.status === 'ready'
        ? (events.data.find((event) => event.id === selection.id) ?? null)
        : null,
    [selection, events],
  );
  const selectedUrgent = useMemo(
    () =>
      selection?.kind === 'urgent' && urgent.status === 'ready'
        ? (urgent.data.find((group) => `${group.stack}|${group.datetime}` === selection.id) ?? null)
        : null,
    [selection, urgent],
  );

  return {
    tab,
    setTab,
    events,
    urgent,
    hidden,
    toggleCategory,
    showAll,
    categories,
    onlyOpen,
    toggleOnlyOpen,
    openCount,
    visibleEvents,
    selection,
    select,
    selectedEvent,
    selectedUrgent,
    reload,
    updatedAt,
    refreshing,
    stale,
    satellite,
  };
}
