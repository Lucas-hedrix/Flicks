import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

window.addEventListener('error', (e) => {
  fetch('http://localhost:4000/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: e.message, stack: e.error?.stack })
  });
});
window.addEventListener('unhandledrejection', (e) => {
  fetch('http://localhost:4000/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: e.reason?.message || String(e.reason), stack: e.reason?.stack })
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
