import React from 'react';
import { t, useLang, toggleLang } from '../i18n';
import { useTheme, toggleTheme } from '../theme';

const Sun = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const Moon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export default function Toggles() {
  const lang = useLang();
  const theme = useTheme();
  return (
    <div className="toggles">
      <button type="button" className="icon-btn" onClick={toggleTheme} data-testid="theme-toggle"
        aria-label={t('تبديل المظهر')} title={theme === 'dark' ? t('الوضع الفاتح') : t('الوضع الداكن')}>
        {theme === 'dark' ? <Sun /> : <Moon />}
      </button>
      <button type="button" className="icon-btn lang-btn" onClick={toggleLang} data-testid="lang-toggle"
        aria-label={t('تبديل اللغة')} lang={lang === 'ar' ? 'en' : 'ar'}>
        {lang === 'ar' ? 'EN' : 'ع'}
      </button>
    </div>
  );
}
