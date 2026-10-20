import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Prevent development-environment WebSocket errors (e.g. Vite HMR in cloud preview iframe / reverse proxy)
// from interrupting the application as an Unhandled Rejection or Uncaught Error.
window.addEventListener('error', (event) => {
  const msg = (event && (event.message || (event.error && event.error.message))) || '';
  if (
    typeof msg === 'string' &&
    (msg.includes('WebSocket') || msg.includes('closed without opened') || msg.includes('failed to connect'))
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = event.reason ? String(event.reason?.message || event.reason) : '';
  if (
    reasonStr.includes('WebSocket') ||
    reasonStr.includes('failed to connect to websocket') ||
    reasonStr.includes('closed without opened')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
);
