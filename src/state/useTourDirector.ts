// Director del recorrido guiado: en cada paso lleva la aplicación real a la vista que el paso
// explica (sigue a NISAR, abre una historia, enciende una capa o un contexto, mide un punto, pone
// la danza). Lo que depende de datos que aún no llegan (las historias, la comparación) se intenta
// de nuevo en cada repintado hasta que se puede hacer.
import { useEffect, useRef } from 'react';
import { centerOfBounds } from '../lib/camera';
import { CONTEXT_IDS, DEFAULT_OPACITY } from '../lib/context';
import type { ContextId } from '../lib/context';
import type { TourStep } from '../lib/tour';
import { isChangeStory } from '../types';
import type { Compas } from './useCompas';
import type { Dance } from './useDance';
import type { Tour } from './useTour';

/** Historia con la que el recorrido enseña la aplicación, si el servidor la tiene. */
const PREFERRED_STORY = 'mojana';

function quietDance(dance: Dance) {
  if (dance.phase === 'series' || dance.phase === 'preload') dance.cancel();
  else if (dance.active) dance.stop();
}

/** Lo que se puede pedir de inmediato al entrar en el paso. */
function stage(step: TourStep, compas: Compas) {
  const { live } = compas;
  switch (step.scene) {
    case 'satellite':
      // La cámara no se toca aquí: mientras dure la escena, el mapa sigue a NISAR (ver Stage).
      if (compas.mode !== 'live') compas.setMode('live');
      live.setTab('satellite');
      live.select(null);
      break;
    case 'cover':
      compas.goHome();
      break;
    case 'explore':
      if (compas.mode !== 'explore') compas.setMode('explore');
      break;
    case 'live':
      if (compas.mode !== 'live') {
        compas.setMode('live');
        live.setTab('events');
        live.select(null);
      } else {
        compas.setLiveTab('events');
      }
      break;
    case 'story':
      break;
  }
}

/** Lo que espera a los datos. Devuelve `true` cuando el paso ya quedó montado (o no se puede montar). */
function finish(step: TourStep, compas: Compas): boolean {
  if (step.scene !== 'story') return true;

  if (compas.stories.status === 'error') return true;
  if (compas.stories.status !== 'ready') return false;
  if (!compas.changeStory) {
    const list = compas.stories.data;
    const pick = list.find((item) => item.id === PREFERRED_STORY && isChangeStory(item)) ?? list.find(isChangeStory);
    if (!pick) return true;
    compas.openStory(pick.id);
    return false;
  }
  if (step.layer && compas.layer !== step.layer) {
    compas.setLayer(step.layer);
    return false;
  }
  if (step.probe) {
    const change = compas.mapChange;
    if (!change) return compas.readingState.status === 'error';
    const lupa = compas.changeStory.lupa;
    const point = lupa ? ([lupa.lon, lupa.lat] as const) : centerOfBounds(change.bounds);
    compas.probeAt(point[0], point[1]);
    return true;
  }
  if (step.dance) {
    const { dance } = compas;
    if (dance.phase === 'error') return true;
    if (!dance.available) return false;
    if (dance.phase === 'idle') dance.start();
    return true;
  }
  return true;
}

export function useTourDirector(tour: Tour, compas: Compas) {
  const staged = useRef('');
  const done = useRef('');
  /** Capas de contexto que encendió el recorrido: son las únicas que él mismo apaga. */
  const lit = useRef(new Set<ContextId>());

  // Sin dependencias a propósito: lo pendiente se reintenta en cada repintado, y las marcas
  // evitan repetir lo que ya se hizo.
  useEffect(() => {
    const step = tour.step;
    const context = (wanted: ContextId | null) => {
      for (const id of CONTEXT_IDS) {
        if (id === wanted) {
          if (compas.context[id] === undefined) compas.setContextLayer(id, DEFAULT_OPACITY[id]);
          lit.current.add(id);
        } else if (lit.current.has(id)) {
          compas.setContextLayer(id, null);
          lit.current.delete(id);
        }
      }
    };
    if (!step) {
      if (staged.current) {
        staged.current = '';
        done.current = '';
        quietDance(compas.dance);
        context(null);
      }
      return;
    }
    const key = `${tour.run}:${step.id}`;
    if (staged.current !== key) {
      staged.current = key;
      if (!step.dance) quietDance(compas.dance);
      context(step.context ?? null);
      stage(step, compas);
    }
    if (done.current !== key && finish(step, compas)) done.current = key;
  });
}
