// Sección En vivo: eventos naturales (EONET) y adquisiciones urgentes de NISAR.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api, isAbort } from '../api';
import { filterEvents, groupUrgent, presentCategories } from '../lib/events';
import type { UrgentGroup } from '../lib/events';
import type { NaturalEvent } from '../types';

export const EVENT_DAYS = 20;

type Load<T> = { status: 'loading' } | { status: 'error'; detail: string } | { status: 'ready'; data: T };

export type LiveTab = 'events' | 'urgent';

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
  visibleEvents: NaturalEvent[];
  selection: LiveSelection;
  select: (selection: LiveSelection) => void;
  selectedEvent: NaturalEvent | null;
  selectedUrgent: UrgentGroup | null;
  reload: () => void;
}

export function useLive(enabled: boolean): Live {
  const [tab, setTab] = useState<LiveTab>('events');
  const [events, setEvents] = useState<Load<NaturalEvent[]>>({ status: 'loading' });
  const [urgent, setUrgent] = useState<Load<UrgentGroup[]>>({ status: 'loading' });
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [selection, select] = useState<LiveSelection>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const detail = (error: unknown) => (error instanceof ApiError ? error.detail : '');
    setEvents({ status: 'loading' });
    setUrgent({ status: 'loading' });
    api
      .events(EVENT_DAYS, controller.signal)
      .then((body) => setEvents({ status: 'ready', data: body.events }))
      .catch((error: unknown) => {
        if (!isAbort(error)) setEvents({ status: 'error', detail: detail(error) });
      });
    api
      .urgent(30, controller.signal)
      .then((scenes) => setUrgent({ status: 'ready', data: groupUrgent(scenes) }))
      .catch((error: unknown) => {
        if (!isAbort(error)) setUrgent({ status: 'error', detail: detail(error) });
      });
    return () => controller.abort();
  }, [enabled, attempt]);

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
  const visibleEvents = useMemo(
    () => (events.status === 'ready' ? filterEvents(events.data, hidden) : []),
    [events, hidden],
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
    visibleEvents,
    selection,
    select,
    selectedEvent,
    selectedUrgent,
    reload,
  };
}
