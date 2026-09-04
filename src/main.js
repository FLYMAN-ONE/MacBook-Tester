import '@fontsource-variable/inter';
import './styles/theme.css';
import './styles/app.css';
import { mountShell } from './core/shell.js';

const shell = mountShell(document.getElementById('app'));
shell.start();

// Service worker solo in produzione: in dev romperebbe l'HMR di Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline non disponibile: nessun problema, l'app funziona comunque online */
    });
  });
}
