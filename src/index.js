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

// Initialize app after backend warmup
warmupBackend().then(() => {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
