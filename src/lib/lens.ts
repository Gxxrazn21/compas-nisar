// Lentes: el backend entrega clases físicas; el nombre visible lo pone el terreno.
import type { ClassKey, Lang } from '../types';

export type LensId = 'general' | 'agua' | 'vegetacion' | 'hielo';

export const LENS_IDS: LensId[] = ['general', 'agua', 'vegetacion', 'hielo'];

type Names = Record<ClassKey, string>;

const ES: Record<LensId, Names> = {
  general: {
    agua_nueva: 'Caída fuerte hasta superficie oscura',
    agua_retirada: 'Subida fuerte desde superficie oscura',
    veg_inundada: 'Sube HH con HV estable',
    veg_perdida: 'Cae el retorno cruzado (HV)',
    veg_aumento: 'Sube el retorno cruzado (HV)',
    aumento: 'Aumento de retorno',
    disminucion: 'Disminución de retorno',
  },
  agua: {
    agua_nueva: 'Posible agua abierta nueva',
    agua_retirada: 'Posible retiro de agua',
    veg_inundada: 'Posible vegetación inundada',
    veg_perdida: 'Posible pérdida de vegetación',
    veg_aumento: 'Posible aumento de vegetación',
    aumento: 'Aumento de retorno',
    disminucion: 'Disminución de retorno',
  },
  vegetacion: {
    agua_nueva: 'Posible superficie lisa o inundada nueva',
    agua_retirada: 'Posible superficie que dejó de ser lisa o de estar inundada',
    veg_inundada: 'Sube HH con HV estable: posible riego o labranza',
    veg_perdida: 'Posible pérdida de vegetación, cosecha o quema',
    veg_aumento: 'Posible crecimiento de vegetación o cultivo',
    aumento: 'Aumento de retorno',
    disminucion: 'Disminución de retorno',
  },
  hielo: {
    agua_nueva: 'Posible agua de deshielo o nieve muy húmeda',
    agua_retirada: 'Posible recongelamiento o superficie que emergió',
    veg_inundada: 'Sube HH con HV estable',
    veg_perdida: 'Posible nieve húmeda',
    veg_aumento: 'Posible superficie más rugosa o descubierta',
    aumento: 'Aumento de retorno',
    disminucion: 'Disminución de retorno',
  },
};

const EN: Record<LensId, Names> = {
  general: {
    agua_nueva: 'Sharp drop to a dark surface',
    agua_retirada: 'Sharp rise from a dark surface',
    veg_inundada: 'HH up, HV steady',
    veg_perdida: 'Cross-pol return (HV) down',
    veg_aumento: 'Cross-pol return (HV) up',
    aumento: 'Return up',
    disminucion: 'Return down',
  },
  agua: {
    agua_nueva: 'Possible new open water',
    agua_retirada: 'Possible water retreat',
    veg_inundada: 'Possible flooded vegetation',
    veg_perdida: 'Possible vegetation loss',
    veg_aumento: 'Possible vegetation gain',
    aumento: 'Return up',
    disminucion: 'Return down',
  },
  vegetacion: {
    agua_nueva: 'Possible newly smooth or flooded surface',
    agua_retirada: 'Possible surface no longer smooth or flooded',
    veg_inundada: 'HH up, HV steady: possible irrigation or tillage',
    veg_perdida: 'Possible vegetation loss, harvest or burn',
    veg_aumento: 'Possible vegetation or crop growth',
    aumento: 'Return up',
    disminucion: 'Return down',
  },
  hielo: {
    agua_nueva: 'Possible meltwater or very wet snow',
    agua_retirada: 'Possible refreeze or newly exposed surface',
    veg_inundada: 'HH up, HV steady',
    veg_perdida: 'Possible wet snow',
    veg_aumento: 'Possible rougher or newly bare surface',
    aumento: 'Return up',
    disminucion: 'Return down',
  },
};

const NAMES: Record<Lang, Record<LensId, Names>> = { es: ES, en: EN };

export const LENS_LABEL: Record<Lang, Record<LensId, string>> = {
  es: {
    general: 'General',
    agua: 'Agua y humedales',
    vegetacion: 'Bosques y cultivos',
    hielo: 'Hielo y nieve',
  },
  en: {
    general: 'General',
    agua: 'Water and wetlands',
    vegetacion: 'Forests and crops',
    hielo: 'Ice and snow',
  },
};

export function asLens(value: string | undefined | null): LensId {
  return LENS_IDS.includes(value as LensId) ? (value as LensId) : 'general';
}

/** Nombre visible de una clase según el lente y el idioma. */
export function className(lens: string | undefined | null, key: ClassKey, lang: Lang): string {
  return NAMES[lang][asLens(lens)][key];
}
