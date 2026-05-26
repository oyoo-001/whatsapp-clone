import { useState } from 'react';
import { Search, Send, X } from 'lucide-react';
import useChatStore from '../stores/chatStore';
import { Colors } from '../styles/theme';

const ForwardModal = ({ open, onClose }) => {
  const { conversations, forwardMessageAction, forwardMessage } = useChatStore();
  const [search, setSearch] = useState('');

  if (!open) return null;

  const filtered = conversations.filter((c) =>
    c.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleForward = async (receiverId) => {
    try {
      await forwardMessageAction(forwardMessage.id, receiverId);
      onClose();
    } catch {}
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: Colors.white, borderRadius: '28px 28px 0 0', width: '100%',
        maxWidth: 480, padding: '20px 20px 40px', animation: 'slideUp 0.3s ease',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: Colors.textPrimary }}>Forward Message</h3>
          <button onClick={onClose} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
            <X size={18} />
          </button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: Colors.lighterGrey, borderRadius: 12, padding: '8px 14px', marginBottom: 12,
        }}>
          <Search size={18} color={Colors.textHint} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: Colors.textPrimary, outline: 'none' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((conv) => (
            <button key={conv.user.id} onClick={() => handleForward(conv.user.id)} style={{
              display: 'flex', alignItems: 'center', gap: 14, width: '100%',
              padding: '12px 8px', background: 'none', border: 'none', borderRadius: 12,
              cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `hsl(${conv.user.id * 40 % 360}, 45%, 45%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: Colors.white, fontWeight: 700, fontSize: 18, flexShrink: 0,
              }}>{conv.user.username.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 15, color: Colors.textPrimary }}>{conv.user.username}</div>
                <div style={{ fontSize: 12, color: Colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.lastMessage?.content || 'No messages'}
                </div>
              </div>
              <Send size={18} color={Colors.primary} />
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: Colors.textSecondary, fontSize: 14 }}>
              No conversations found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
