import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { RESOURCE_GROUPS, RESOURCES, resourcesOf } from './resources';

describe('recursos del reto', () => {
  it('lista los catorce recursos sin repetir identificador ni enlace', () => {
    expect(RESOURCES).toHaveLength(14);
    expect(new Set(RESOURCES.map((resource) => resource.id)).size).toBe(14);
    expect(new Set(RESOURCES.map((resource) => resource.url)).size).toBe(14);
  });

  it('todos los enlaces son https', () => {
    for (const resource of RESOURCES) {
      expect(resource.url, resource.id).toMatch(/^https:\/\//);
    }
  });

  it('reparte nueve de NASA, tres de CSA y dos de CONAE', () => {
    expect(RESOURCE_GROUPS.map((group) => resourcesOf(group).length)).toEqual([9, 3, 2]);
  });

  it('cada recurso y cada grupo tiene sus textos en ambos idiomas', () => {
    const keys = [
      ...RESOURCES.flatMap((resource) => [`resources.${resource.id}.name`, `resources.${resource.id}.use`]),
      ...RESOURCE_GROUPS.map((group) => `resources.group.${group}`),
    ];
    for (const key of keys) {
      expect(es, key).toHaveProperty([key]);
      expect(en, key).toHaveProperty([key]);
    }
  });
});
