import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './AppWithSocket';
import reportWebVitals from './reportWebVitals';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Health check to warm up backend (prevent cold start issues)
async function warmupBackend() {
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      await fetch(`${BASE_URL.replace('/api', '')}/api/health`, { signal: controller.signal });
      clearTimeout(timeout);
      return true;
    } catch (err) {
      if (i === maxRetries - 1) {
        console.warn('Backend warmup failed, continuing anyway');
        return false;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((error) => {
        console.warn('⚠️ [PWA] Service Worker 등록 실패:', error);
      });
  });
}

// 앱은 즉시 렌더링, 백엔드 warmup은 백그라운드에서 실행
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);
warmupBackend(); // 백그라운드 실행 (렌더링 블로킹 없음)

// Disabled for performance in development
// reportWebVitals();
