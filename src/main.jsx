import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

// Auto-reload on chunk fetch failure after new deployment
window.addEventListener('vite:preloadError', () => {
  const retryKey = 'vite_preload_retry';
  const lastRetry = sessionStorage.getItem(retryKey);
  const now = Date.now();
  if (!lastRetry || now - parseInt(lastRetry, 10) > 15000) {
    sessionStorage.setItem(retryKey, now.toString());
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

