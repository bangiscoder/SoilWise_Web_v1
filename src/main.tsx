import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Prevent development-environment WebSocket errors (e.g. Vite HMR in cloud preview iframe / reverse proxy)
// from interrupting the application as an Unhandled Rejection.
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
