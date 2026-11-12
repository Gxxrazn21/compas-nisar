// Formateadores de fecha, área y decibelios en español e inglés.
import type { Lang } from '../types';

const LOCALE: Record<Lang, string> = { es: 'es-CO', en: 'en-US' };

function parseIso(iso: string): Date {
  // Las fechas del contrato son AAAA-MM-DD: se leen en UTC para que no corra el día.
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

/** «26 de junio de 2026» / «June 26, 2026». Sin año: «26 de junio» / «June 26». */
export function formatDate(iso: string, lang: Lang, withYear = true): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(parseIso(iso));
}

/** «26 jun» / «Jun 26»: para rótulos estrechos. */
export function formatDateShort(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: 'UTC', day: 'numeric', month: 'short' })
    .format(parseIso(iso))
    .replace('.', '');
}

export function formatMonth(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: 'UTC', month: 'short' })
    .format(parseIso(iso))
    .replace('.', '');
}

/** «Entre el 26 de junio y el 24 de octubre de 2026». El año se omite en la primera fecha si coincide. */
export function formatBetween(before: string, after: string, lang: Lang): string {
  const sameYear = before.slice(0, 4) === after.slice(0, 4);
  const first = formatDate(before, lang, !sameYear);
  const second = formatDate(after, lang, true);
  return lang === 'es' ? `Entre el ${first} y el ${second}` : `Between ${first} and ${second}`;
}

function group(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Número con separadores del idioma: 41.234 en español, 41,234 en inglés. */
export function formatNumber(value: number, lang: Lang, decimals = 0): string {
  const negative = value < 0;
  const [whole = '0', fraction] = Math.abs(value).toFixed(decimals).split('.');
  const thousands = lang === 'es' ? '.' : ',';
  const decimal = lang === 'es' ? ',' : '.';
  const body = group(whole, thousands) + (fraction ? decimal + fraction : '');
  return negative ? `−${body}` : body;
}

/** Área en km²: sin decimales desde 100 km², uno entre 1 y 100 y dos por debajo. */
export function formatArea(km2: number, lang: Lang): string {
  const decimals = km2 >= 100 ? 0 : km2 >= 1 ? 1 : 2;
  return `${formatNumber(km2, lang, decimals)} km²`;
}

export function formatPercent(pct: number, lang: Lang): string {
  return `${formatNumber(pct, lang, pct < 10 ? 1 : 0)} %`;
}

/** Decibelios con signo explícito opcional: «+3,2 dB», «−7,3 dB». */
export function formatDb(value: number, lang: Lang, signed = false): string {
  const text = formatNumber(value, lang, 1);
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${text} dB`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86_400_000);
}

/** «11 de noviembre, 23:40 UTC» / «November 11, 23:40 UTC»: para adquisiciones con hora. */
export function formatDateTime(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = new Intl.DateTimeFormat(LOCALE[lang], { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(date);
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  return `${day}, ${hour} UTC`;
}
