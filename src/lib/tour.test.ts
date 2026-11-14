import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { PARTS } from './nisarModel';
import { CHAPTERS, TOUR, chapterStart, clampStep, stepDuration, textKey, titleKey } from './tour';

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
    expect(CHAPTERS.map((chapter) => chapterStart(chapter))).toEqual([0, 8, 11]);
  });

  it('explica todas las partes del satélite, cada una sobre el modelo', () => {
    const explained = TOUR.filter((step) => step.part).map((step) => step.part);
    expect([...explained].sort()).toEqual([...PARTS].sort());
    for (const step of TOUR) {
      if (step.part) expect(step.figure, step.id).toBe('model');
      if (step.scene === 'satellite') expect(step.zoom, step.id).toBeGreaterThan(0);
      if (step.layer || step.probe || step.dance) expect(step.scene, step.id).toBe('story');
    }
  });

  it('deja cada paso el tiempo que toma leerlo, entre 8 y 19 segundos', () => {
    expect(stepDuration('Corto.')).toBe(8000);
    expect(stepDuration('x'.repeat(200))).toBe(200 * 62 + 3200);
    expect(stepDuration('x'.repeat(2000))).toBe(19000);
    expect(stepDuration('Corto.', 7000)).toBe(15000);
    for (const step of TOUR) {
      for (const dictionary of [es, en]) {
        expect(dictionary[textKey(step)].length, step.id).toBeLessThanOrEqual(330);
      }
    }
  });

  it('no se sale del primer ni del último paso', () => {
    expect(clampStep(0, -1)).toBe(0);
    expect(clampStep(TOUR.length - 1, 1)).toBe(TOUR.length - 1);
    expect(clampStep(3, 1)).toBe(4);
  });
});
