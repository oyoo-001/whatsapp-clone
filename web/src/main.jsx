import ReactDOM from 'react-dom/client';
import App from './App';

// Always unregister any stale SW in development to prevent cache issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
  if (import.meta.env.DEV) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
