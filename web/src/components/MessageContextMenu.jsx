import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Edit2, Trash2, Forward, X } from 'lucide-react';
import { Colors } from '../styles/theme';

const menuItems = [
  { icon: MessageSquare, label: 'Reply', action: 'reply', color: Colors.textPrimary },
  { icon: Edit2, label: 'Edit', action: 'edit', color: Colors.textPrimary },
  { icon: Forward, label: 'Forward', action: 'forward', color: Colors.textPrimary },
  { icon: Trash2, label: 'Delete', action: 'delete', color: Colors.red },
];

const PADDING = 12;

const MessageContextMenu = ({ open, onClose, onAction, isMine, position, message, isAdmin }) => {
  const menuRef = useRef(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!open || !position || !menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    let x = position.x;
    let y = position.y;

    // Horizontal: shift left by half width, clamp to viewport
    x -= rect.width / 2;
    if (x + rect.width > window.innerWidth - PADDING) {
      x = window.innerWidth - rect.width - PADDING;
    }
    if (x < PADDING) {
      x = PADDING;
    }

    // Vertical: if offscreen bottom, flip above
    if (y + rect.height > window.innerHeight - PADDING) {
      y = position.y - rect.height;
    }
    if (y < PADDING) {
      y = PADDING;
    }

    setAdjustedPos({ x, y });
  }, [open, position]);

  if (!open) return null;

const items = menuItems.filter((item) => {
  if (item.action === 'edit' && !isMine) return false;
  if (item.action === 'delete') {
    if (message?.isBroadcast) return !!isAdmin;
    if (!isMine) return false;
  }
  if (message?.isBroadcast && (item.action === 'reply' || item.action === 'forward' || item.action === 'edit')) {
    return false;
  }
  return true;
});

  const pos = position ? adjustedPos : null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 99998,
    }}>
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: pos ? `${pos.y}px` : '50%',
          left: pos ? `${pos.x}px` : '50%',
          transform: pos ? 'none' : 'translate(-50%, -50%)',
          background: Colors.white, borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          padding: 8, minWidth: 200,
          animation: 'scaleIn 0.15s ease',
          zIndex: 99999,
        }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px 4px', borderBottom: '1px solid #F0F2F5', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 500 }}>Message Actions</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: Colors.textHint }}>
            <X size={16} />
          </button>
        </div>
        {items.map(({ icon: Icon, label, action, color }) => (
          <button key={action} onClick={() => { onAction(action); onClose(); }} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            padding: '12px 14px', background: 'none', border: 'none', borderRadius: 8,
            fontSize: 14, cursor: 'pointer', color,
          }}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MessageContextMenu;