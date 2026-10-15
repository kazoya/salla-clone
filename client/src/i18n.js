// Arabic is the source language: t('نص عربي') returns the Arabic text, or its English entry when the language is English.
import { useSyncExternalStore } from 'react';
import en from './locales/en.json';

const KEY = 'lang';
const listeners = new Set();
let lang = (() => {
  try { const v = localStorage.getItem(KEY); if (v === 'ar' || v === 'en') return v; } catch {}
  return 'ar';
})();

function applyDocument() {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
}
applyDocument();

export function getLang() { return lang; }

export function setLang(next) {
  if (next !== 'ar' && next !== 'en') return;
  lang = next;
  try { localStorage.setItem(KEY, next); } catch {}
  applyDocument();
  listeners.forEach((fn) => fn());
}

export function toggleLang() { setLang(lang === 'ar' ? 'en' : 'ar'); }

export function t(ar) {
  if (lang !== 'en' || typeof ar !== 'string') return ar;
  return en[ar] ?? ar;
}

// Localized field from data, e.g. tf(product, 'name') -> product.nameEn in English, when present.
export function tf(obj, field) {
  if (!obj) return '';
  return (lang === 'en' && obj[`${field}En`]) || obj[field];
}

// Re-render the app when the language changes.
export function useLang() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => lang);
}
