import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { CONTEXT_IDS } from './context';
import { PARTS } from './nisarModel';
import { CHAPTERS, TOUR, chapterStart, clampStep, stepDuration, textKey, titleKey, totalMinutes } from './tour';

describe('recorrido guiado', () => {
  it('cada paso tiene título y texto en los dos idiomas', () => {
    for (const step of TOUR) {
      for (const key of [titleKey(step), textKey(step)]) {
        expect(es[key], `es.${key}`).toBeTruthy();
        expect(en[key], `en.${key}`).toBeTruthy();
      }
    }
  });

  it('no repite pasos y los capítulos van seguidos, en orden', () => {
    expect(new Set(TOUR.map((step) => step.id)).size).toBe(TOUR.length);
    const order = TOUR.map((step) => CHAPTERS.indexOf(step.chapter));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(CHAPTERS.map((chapter) => chapterStart(chapter))).toEqual([0, 8, 14, 26]);
    for (const chapter of CHAPTERS) {
      expect(es[`tour.chapter.${chapter}`], chapter).toBeTruthy();
      expect(en[`tour.chapter.${chapter}`], chapter).toBeTruthy();
    }
  });

  it('explica todas las partes del satélite, cada una sobre el modelo', () => {
    const explained = TOUR.filter((step) => step.part).map((step) => step.part);
    expect([...explained].sort()).toEqual([...PARTS].sort());
    for (const step of TOUR) {
      if (step.part) expect(step.figure, step.id).toBe('model');
      if (step.scene === 'satellite') expect(step.zoom, step.id).toBeGreaterThan(0);
      if (step.layer || step.probe || step.dance || step.context) expect(step.scene, step.id).toBe('story');
    }
  });

  it('enseña cada capa de datos y cada capa de contexto', () => {
    const layers = TOUR.map((step) => step.layer).filter(Boolean);
    for (const layer of ['after', 'swipe', 'change_hh', 'change_hv', 'classes', 'composite']) {
      expect(layers, layer).toContain(layer);
    }
    expect(TOUR.map((step) => step.context).filter(Boolean)).toEqual(CONTEXT_IDS);
  });

  it('en inglés las medidas van en pies y millas, no en metros', () => {
    for (const step of TOUR) {
      expect(en[textKey(step)], step.id).not.toMatch(/\d[\s ](m|km|cm|kg)\b/);
    }
    expect(en['tour.dim.reflector']).toBe('39 ft');
    expect(es['tour.dim.reflector']).toBe('12 m');
  });

  it('deja cada paso el tiempo que toma leerlo, entre 9 y 22 segundos', () => {
    expect(stepDuration('Corto.')).toBe(9000);
    expect(stepDuration('x'.repeat(200))).toBe(200 * 52 + 3000);
    expect(stepDuration('x'.repeat(2000))).toBe(22000);
    expect(stepDuration('Corto.', 7000)).toBe(16000);
    for (const step of TOUR) {
      for (const dictionary of [es, en]) {
        expect(dictionary[textKey(step)].length, step.id).toBeLessThanOrEqual(380);
      }
    }
  });

  it('dura menos de nueve minutos de principio a fin', () => {
    for (const dictionary of [es, en]) {
      const minutes = totalMinutes((step) => stepDuration(dictionary[textKey(step)]));
      expect(minutes).toBeGreaterThan(5);
      expect(minutes).toBeLessThan(9);
    }
  });

  it('no se sale del primer ni del último paso', () => {
    expect(clampStep(0, -1)).toBe(0);
    expect(clampStep(TOUR.length - 1, 1)).toBe(TOUR.length - 1);
    expect(clampStep(3, 1)).toBe(4);
  });
});
