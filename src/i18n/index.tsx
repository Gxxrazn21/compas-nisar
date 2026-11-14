// Contexto de idioma: diccionarios, interpolación y recuerdo de la elección en localStorage.
// El idioma principal es el inglés; el español se elige en la barra superior o con #lang=es.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Lang, Localized } from '../types';
import { en } from './en';
import { es } from './es';
import type { Key } from './es';

const DICTIONARIES: Record<Lang, Record<Key, string>> = { es, en };
const STORAGE_KEY = 'compas.lang';
export const DEFAULT_LANG: Lang = 'en';

export type Vars = Record<string, string | number>;

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function localize(value: Localized | undefined | null, lang: Lang): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || value.es || '';
}

function readStoredLang(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'es' || stored === 'en' ? stored : null;
  } catch {
    return null;
  }
}

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: Key, vars?: Vars) => string;
  loc: (value: Localized | undefined | null) => string;
}

const Context = createContext<I18n | null>(null);

export function I18nProvider({ initial, children }: { initial: Lang | null; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const first = initial ?? readStoredLang() ?? DEFAULT_LANG;
    // Antes del primer render: las peticiones iniciales ya salen con el idioma correcto (ver api.ts).
    document.documentElement.lang = first;
    return first;
  });

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento: la elección vale solo para esta sesión.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = DICTIONARIES[lang]['doc.title'];
  }, [lang]);

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => interpolate(DICTIONARIES[lang][key], vars),
      loc: (text) => localize(text, lang),
    }),
    [lang, setLang],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(Context);
  if (!value) throw new Error('useI18n debe usarse dentro de I18nProvider');
  return value;
}
