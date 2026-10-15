import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { t, useLang } from './i18n';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import './styles.css';

const isDemo = !['localhost', '127.0.0.1'].includes(window.location.hostname);
function DemoBanner() {
  useLang();
  if (!isDemo) return null;
  return (
    <div role="status" data-testid="demo-banner" className="demo-banner">
      {t('نسخة تجريبية للعرض: لا تُدخل معلومات أو كلمات مرور حقيقية، والدفع وهمي.')}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DemoBanner />
    <App />
  </React.StrictMode>
);
