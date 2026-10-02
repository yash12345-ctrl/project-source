import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    const [resource, config] = args;
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
      const headers = new Headers((config?.headers as any) || {});
      headers.set('Authorization', `Bearer ${token}`);
      args[1] = { ...config, headers };
    }
  }

  const response = await originalFetch(...args);
  
  // Clone response so we can read body without consuming the original stream
  const clone = response.clone();
  try {
    const data = await clone.json();
    if (response.status === 401 && (data.code === 'SESSION_REVOKED' || data.code === 'INVALID_CREDENTIALS')) {
      // Wipe storage and kick out
      localStorage.clear();
      window.location.href = '/?error=Your portal password has changed. Please log in again.';
    }
  } catch (e) {
    // Ignore JSON parse errors for non-JSON responses
  }
  
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
