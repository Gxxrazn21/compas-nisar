import { describe, expect, it } from 'vitest';
import { HYPOTHESIS_KEYS, hypothesisFor, polarizationGuide } from './hypotheses';
import { LENS_IDS } from './lens';

describe('hipótesis físicas', () => {
  it('hay contenido completo para las siete clases, en todos los lentes e idiomas', () => {
    expect(HYPOTHESIS_KEYS).toHaveLength(7);
    for (const key of HYPOTHESIS_KEYS) {
      for (const lens of LENS_IDS) {
        for (const lang of ['es', 'en'] as const) {
          const item = hypothesisFor(key, lens, lang);
          const where = `${key}/${lens}/${lang}`;
          expect(item.signal.length, where).toBeGreaterThan(10);
          if (item.mechanism !== null) expect(item.mechanism.length, where).toBeGreaterThan(20);
          expect(item.lead.length, where).toBeGreaterThan(5);
          expect(item.polarization.length, where).toBeGreaterThan(5);
          expect(item.check.length, where).toBeGreaterThan(30);
        }
      }
    }
  });

  it('cada hipótesis termina diciendo que es una pista', () => {
    for (const key of HYPOTHESIS_KEYS) {
      expect(hypothesisFor(key, 'general', 'es').check).toMatch(/^Es una pista, no una prueba/);
      expect(hypothesisFor(key, 'general', 'en').check).toMatch(/^This is a clue, not proof/);
    }
  });

  it('el español y el inglés tienen las mismas causas', () => {
    for (const key of HYPOTHESIS_KEYS) {
      const es = hypothesisFor(key, 'general', 'es');
      const en = hypothesisFor(key, 'general', 'en');
      expect(en.others.length).toBe(es.others.length);
    }
  });

  it('el lente solo reordena: las mismas causas en otro orden', () => {
    for (const key of HYPOTHESIS_KEYS) {
      const base = hypothesisFor(key, 'general', 'es');
      // Una causa puede llevar pegado su mecanismo al cambiar de lugar: se compara por el inicio.
      const first = (text: string) => (text.split('. ')[0] ?? '').replace(/\.$/, '');
      const all = [base.lead, ...base.others].map(first).sort();
      for (const lens of LENS_IDS) {
        const item = hypothesisFor(key, lens, 'es');
        expect([item.lead, ...item.others].map(first).sort()).toEqual(all);
      }
    }
  });

  it('en hielo van primero las causas de nieve; en cultivos, las agrícolas', () => {
    expect(hypothesisFor('agua_nueva', 'general', 'es').lead).toContain('Agua abierta nueva');
    expect(hypothesisFor('agua_nueva', 'hielo', 'es').lead).toBe('Nieve muy húmeda.');
    expect(hypothesisFor('agua_nueva', 'vegetacion', 'es').lead).toBe('Suelo recién alisado.');
    expect(hypothesisFor('veg_perdida', 'hielo', 'en').lead).toContain('wet snow');
    expect(hypothesisFor('veg_inundada', 'vegetacion', 'es').lead).toContain('riego');
    expect(hypothesisFor('veg_perdida', 'agua', 'es').lead).toContain('Cosecha');
  });

  it('sobre hielo, lo más probable nunca habla de vegetación ni de cultivos', () => {
    const vegetal = /ramas|hojas|cultivo|vegetaci|branches|leaves|crop|vegetation/i;
    for (const lang of ['es', 'en'] as const) {
      for (const key of ['veg_perdida', 'veg_aumento'] as const) {
        const item = hypothesisFor(key, 'hielo', lang);
        expect(item.lead, `${key}/${lang}`).not.toMatch(vegetal);
        // El mecanismo de vegetación no se presenta como el más probable: viaja con su causa.
        expect(item.mechanism, `${key}/${lang}`).toBeNull();
        expect(item.others.join(' '), `${key}/${lang}`).toMatch(vegetal);
      }
    }
  });

  it('en cultivos, el mecanismo del agua no acompaña a una causa agrícola', () => {
    const retreat = hypothesisFor('agua_retirada', 'vegetacion', 'es');
    expect(retreat.lead).toContain('arado');
    expect(retreat.mechanism).toBeNull();
    const flooded = hypothesisFor('veg_inundada', 'vegetacion', 'es');
    expect(flooded.lead).toContain('riego');
    expect(flooded.mechanism).toBeNull();
    expect(flooded.others.join(' ')).toContain('Doble rebote');
  });

  it('si el lente no cambia la causa principal, el mecanismo se muestra aparte', () => {
    expect(hypothesisFor('veg_perdida', 'general', 'es').mechanism).toContain('ramas');
    expect(hypothesisFor('veg_perdida', 'vegetacion', 'es').mechanism).toContain('ramas');
    expect(hypothesisFor('agua_nueva', 'hielo', 'es').mechanism).toContain('espejo');
  });

  it('las falsas alarmas conocidas aparecen', () => {
    const retreat = hypothesisFor('agua_retirada', 'general', 'es');
    expect([retreat.lead, ...retreat.others].join(' ')).toContain('Viento');
    const flooded = hypothesisFor('veg_inundada', 'general', 'en');
    expect(flooded.mechanism).toContain('Double bounce');
  });
});

describe('qué ve cada polarización', () => {
  it('describe HH, HV y las tres notas por terreno, en ambos idiomas', () => {
    for (const lang of ['es', 'en'] as const) {
      const guide = polarizationGuide('general', lang);
      expect(guide.hh.startsWith('HH')).toBe(true);
      expect(guide.hv.startsWith('HV')).toBe(true);
      expect(guide.notes).toHaveLength(3);
    }
  });
  it('el lente pone primero la nota de su terreno', () => {
    expect(polarizationGuide('hielo', 'es').notes[0]).toContain('hielo');
    expect(polarizationGuide('vegetacion', 'es').notes[0]).toContain('tierra');
    expect(polarizationGuide('agua', 'en').notes[0]).toContain('water');
  });
});
