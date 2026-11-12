import { describe, expect, it } from 'vitest';
import { en } from './en';
import { es } from './es';
import { interpolate, localize } from './index';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('diccionarios', () => {
  it('español e inglés tienen exactamente las mismas claves', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });
  it('cada clave usa los mismos marcadores en ambos idiomas', () => {
    for (const key of Object.keys(es) as Array<keyof typeof es>) {
      expect(placeholders(en[key]), key).toEqual(placeholders(es[key]));
    }
  });
  it('ningún texto queda vacío', () => {
    for (const key of Object.keys(es) as Array<keyof typeof es>) {
      expect(es[key].trim().length, `es.${key}`).toBeGreaterThan(0);
      expect(en[key].trim().length, `en.${key}`).toBeGreaterThan(0);
    }
  });
});

describe('interpolación', () => {
  it('reemplaza marcadores y deja intactos los desconocidos', () => {
    expect(interpolate('Paso {n} de {total}', { n: 2, total: 4 })).toBe('Paso 2 de 4');
    expect(interpolate('Hola {x}', {})).toBe('Hola {x}');
  });
  it('elige el idioma de un texto bilingüe', () => {
    expect(localize({ es: 'hola', en: 'hello' }, 'en')).toBe('hello');
    expect(localize('solo', 'en')).toBe('solo');
    expect(localize(undefined, 'es')).toBe('');
  });
});
