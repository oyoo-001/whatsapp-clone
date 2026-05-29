import { MessageSquare, Edit2, Trash2, Forward, X } from 'lucide-react';
import { Colors } from '../styles/theme';

const menuItems = [
  { icon: MessageSquare, label: 'Reply', action: 'reply', color: Colors.textPrimary },
  { icon: Edit2, label: 'Edit', action: 'edit', color: Colors.textPrimary },
  { icon: Forward, label: 'Forward', action: 'forward', color: Colors.textPrimary },
  { icon: Trash2, label: 'Delete', action: 'delete', color: Colors.red },
];

const MessageContextMenu = ({ open, onClose, onAction, isMine, position, message, isAdmin }) => {
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

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 99998,
    }}>
      <div style={{
        position: 'fixed',
        top: position?.y ? `${position.y}px` : '50%',
        left: position?.x ? `${position.x}px` : '50%',
        transform: position ? 'translate(-50%, 0)' : 'translate(-50%, -50%)',
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
