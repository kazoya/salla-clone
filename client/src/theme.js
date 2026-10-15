// Light/dark theme: follows prefers-color-scheme until the user picks one, then keeps their choice.
import { useSyncExternalStore } from 'react';

const KEY = 'theme';
const listeners = new Set();
const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function stored() {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; } catch { return null; }
}
let theme = stored() || (media && media.matches ? 'dark' : 'light');

function apply() {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
apply();

media?.addEventListener?.('change', (e) => {
  if (stored()) return;
  theme = e.matches ? 'dark' : 'light';
  apply();
  listeners.forEach((fn) => fn());
});

export function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(KEY, theme); } catch {}
  apply();
  listeners.forEach((fn) => fn());
}

export function useTheme() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => theme);
}
