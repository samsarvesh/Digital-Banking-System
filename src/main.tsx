import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket / HMR connection errors in the sandbox environment
if (typeof window !== "undefined") {
  window.addEventListener('error', (event) => {
    const msg = event.message || "";
    const isViteWebsocket = 
      msg.includes('websocket') || 
      msg.includes('WebSocket') || 
      msg.includes('vite') ||
      (event.error && (event.error.message || "").includes('WebSocket')) ||
      (event.target && (event.target.constructor?.name === 'WebSocket' || (event.target as any).localName === 'script' && ((event.target as any).src || '').includes('vite')));
      
    if (isViteWebsocket) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason && (reason.message || String(reason)) || "";
    const isViteWebsocket = 
      msg.includes('websocket') || 
      msg.includes('WebSocket') || 
      msg.includes('vite') || 
      msg.includes('closed without opened') ||
      !reason ||
      reason.constructor?.name === 'CloseEvent' || 
      reason.constructor?.name === 'Event' ||
      reason.target?.constructor?.name === 'WebSocket';

    if (isViteWebsocket) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

