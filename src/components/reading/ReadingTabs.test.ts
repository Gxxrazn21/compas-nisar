import { describe, expect, it } from 'vitest';
import { nextTabIndex, panelId, tabId } from './ReadingTabs';

describe('pestañas de la lectura', () => {
  it('las flechas dan la vuelta en ambos sentidos', () => {
    expect(nextTabIndex('ArrowRight', 0, 3)).toBe(1);
    expect(nextTabIndex('ArrowRight', 2, 3)).toBe(0);
    expect(nextTabIndex('ArrowLeft', 0, 3)).toBe(2);
    expect(nextTabIndex('ArrowLeft', 2, 3)).toBe(1);
  });
  it('Inicio y Fin saltan a los extremos', () => {
    expect(nextTabIndex('Home', 2, 3)).toBe(0);
    expect(nextTabIndex('End', 0, 3)).toBe(2);
  });
  it('otras teclas no se tocan', () => {
    expect(nextTabIndex('Tab', 0, 3)).toBeNull();
    expect(nextTabIndex('ArrowDown', 0, 3)).toBeNull();
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
  });
  it('cada pestaña y su panel se enlazan por identificador', () => {
    expect(tabId('lectura', 'punto')).toBe('lectura-tab-punto');
    expect(panelId('lectura', 'punto')).toBe('lectura-panel-punto');
  });
});
