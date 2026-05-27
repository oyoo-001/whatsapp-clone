import { useState, useEffect } from 'react';
import { X, MessageCircle, Phone } from 'lucide-react';
import { Colors } from '../styles/theme';

const NotificationPopup = ({ message, user, onDismiss, onClick, isCall }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => handleDismiss(), 4000);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => onDismiss?.(), 300);
  };

  return (
    <div onClick={onClick} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999999,
      transform: visible && !leaving ? 'translateY(0)' : 'translateY(-120%)',
      transition: 'transform 0.3s ease',
      padding: '8px 12px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
    }}>
      <div style={{
        background: Colors.primary, borderRadius: 14, padding: '10px 14px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', maxWidth: 480, margin: '0 auto',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: user?.avatar ? 'none' : `hsl(${(user?.id || 0) * 40 % 360}, 45%, 45%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: Colors.white, fontWeight: 700, fontSize: 14, overflow: 'hidden',
        }}>
          {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.username?.charAt(0).toUpperCase() || <MessageCircle size={16} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: Colors.white, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            {isCall && <Phone size={12} />} {user?.username || 'New message'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {message?.content || (message?.messageType !== 'text' ? `📎 ${message.messageType}` : '')}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); handleDismiss(); }} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
          width: 28, height: 28, cursor: 'pointer', color: Colors.white, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><X size={14} /></button>
      </div>
    </div>
  );
};

export default NotificationPopup;
