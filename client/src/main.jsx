import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import './styles.css';

const isDemo = !['localhost', '127.0.0.1'].includes(window.location.hostname);
function DemoBanner() {
  if (!isDemo) return null;
  return (
    <div role="status" data-testid="demo-banner" style={{ background: '#fef3c7', color: '#78350f', padding: '10px 16px', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid #fcd34d' }}>
      نسخة تجريبية للعرض فقط: البيانات والصور تُحذف تلقائياً عند إعادة تشغيل الخادم. لا تُدخل معلومات أو كلمات مرور حقيقية، والدفع وهمي.
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
