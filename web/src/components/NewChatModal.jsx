import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MessageCircle, User } from 'lucide-react';
import { usersAPI } from '../services/api';
import { Colors } from '../styles/theme';

const NewChatModal = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const search = useCallback(async (q) => {
    setQuery(q);
    if (q.length < 2) return setResults([]);
    setLoading(true);
    try {
      const { data } = await usersAPI.search(q);
      setResults(data.users || []);
    } catch {}
    setLoading(false);
  }, []);

  const startChat = (user) => {
    onClose();
    setQuery('');
    setResults([]);
    navigate(`/chat/${user.id}`, { state: { user } });
  };

  if (!open) return null;

  const getHue = (id) => (id * 60) % 360;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }} onClick={onClose}>
      <div style={{
        background: Colors.white, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480,
        maxHeight: '80vh', padding: '20px 24px', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
        }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: Colors.textPrimary }}>New Chat</h3>
          <button onClick={() => { onClose(); setQuery(''); setResults([]); }}
            style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: Colors.lighterGrey, borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
          <Search size={18} color={Colors.textHint} />
          <input value={query} onChange={(e) => search(e.target.value)} placeholder="Search by phone number..."
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: Colors.textPrimary }} autoFocus />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 120 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 30 }}>
              {[1,2,3].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F0F2F5', animation: 'pulse 1.5s ease infinite' }} />
                  <div style={{ flex: 1 }}><div style={{ width: '60%', height: 12, background: '#F0F2F5', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} /></div>
                </div>
              ))}
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: Colors.textSecondary }}>
              <User size={40} color="#E9EDEF" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14 }}>No users found</p>
            </div>
          )}
          {results.map((u, i) => (
            <div key={u.id} onClick={() => startChat(u)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
              cursor: 'pointer', borderBottom: '0.5px solid #F0F2F5',
              animation: `fadeInUp 0.2s ease ${i * 0.04}s both`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `hsl(${getHue(u.id)}, 45%, 45%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: Colors.white, fontWeight: 700, fontSize: 16, flexShrink: 0,
              }}>{u.username?.charAt(0).toUpperCase() || '?'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 15 }}>{u.username}</div>
                <div style={{ fontSize: 12, color: Colors.textSecondary }}>{u.phoneNumber}</div>
              </div>
              <MessageCircle size={18} color={Colors.primary} style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
