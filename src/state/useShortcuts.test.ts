import { describe, expect, it } from 'vitest';
import { SHORTCUTS, shortcutFor } from './useShortcuts';
import { es } from '../i18n/es';

const key = (value: string, extra: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({
  key: value,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...extra,
});
const page = { tag: 'BODY', editable: false, interactive: false };

describe('atajos de teclado', () => {
  it('una tecla suelta dispara su atajo, sin importar mayúsculas', () => {
    expect(shortcutFor(key('2'), page)).toBe('explore');
    expect(shortcutFor(key('b'), page)).toBe('borders');
    expect(shortcutFor(key('B'), page)).toBe('borders');
    expect(shortcutFor(key('?'), page)).toBe('help');
    expect(shortcutFor(key(' '), page)).toBe('playPause');
    expect(shortcutFor(key('ArrowRight'), page)).toBe('next');
  });
  it('no actúa mientras se escribe ni con Ctrl, Alt o Meta', () => {
    expect(shortcutFor(key('b'), { ...page, tag: 'INPUT' })).toBeNull();
    expect(shortcutFor(key('m'), { ...page, editable: true })).toBeNull();
    expect(shortcutFor(key('d', { ctrlKey: true }), page)).toBeNull();
    expect(shortcutFor(key('0', { metaKey: true }), page)).toBeNull();
  });
  it('cede las flechas y el espacio al control enfocado, pero no las letras', () => {
    const button = { tag: 'BUTTON', editable: false, interactive: true };
    expect(shortcutFor(key('ArrowLeft'), button)).toBeNull();
    expect(shortcutFor(key(' '), button)).toBeNull();
    expect(shortcutFor(key('n'), button)).toBe('names');
  });
  it('teclas sin atajo no hacen nada', () => {
    expect(shortcutFor(key('q'), page)).toBeNull();
    expect(shortcutFor(key('Enter'), page)).toBeNull();
  });
  it('cada atajo de la ayuda tiene su texto', () => {
    for (const item of SHORTCUTS) expect(`help.key.${item.id}` in es, item.id).toBe(true);
  });
});
