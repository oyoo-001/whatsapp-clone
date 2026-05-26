import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: { bg: '#DCF8C6', border: '#25D366', icon: '#25D366' },
  error: { bg: '#FFEBEE', border: '#E53935', icon: '#E53935' },
  info: { bg: '#E3F2FD', border: '#2196F3', icon: '#2196F3' },
  warning: { bg: '#FFF8E1', border: '#FF9800', icon: '#FF9800' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{
        position: 'fixed', top: 16, right: 16, zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360,
      }}>
        {toasts.map((t) => {
          const Icon = icons[t.type];
          const c = colors[t.type];
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 12, padding: '12px 16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              animation: 'slideInRight 0.3s ease',
            }}>
              <Icon size={18} color={c.icon} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, color: '#111B21', lineHeight: 1.4 }}>{t.message}</span>
              <button onClick={() => removeToast(t.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: '#667781', display: 'flex',
              }}><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
