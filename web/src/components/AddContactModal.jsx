import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, Phone, UserPlus, MessageCircle, Check, AlertCircle, AtSign } from 'lucide-react';
import { usersAPI } from '../services/api';
import { Colors } from '../styles/theme';

const formatPhone = (v) => {
  let digits = v.replace(/[^\d+]/g, '');
  if (digits.startsWith('+') && digits.length > 1) {
    return '+' + digits.slice(1).replace(/\D/g, '');
  }
  return digits.replace(/\D/g, '');
};

const MODES = [
  { key: 'phone', label: 'Phone', icon: Phone },
  { key: 'username', label: 'Username', icon: AtSign },
];

const AddContactModal = ({ open, onClose }) => {
  const [mode, setMode] = useState('phone');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const [isContact, setIsContact] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) return setError('Enter a search term');

    setLoading(true);
    setSearched(true);
    setSelectedResult(null);
    setResults([]);
    setAdded(false);
    setError('');

    try {
      if (mode === 'phone') {
        const cleaned = formatPhone(query);
        if (!cleaned) return setError('Enter a phone number');
        if (cleaned.length < 8) return setError('Number too short — include country code (e.g., +254712345678)');
        const { data } = await usersAPI.searchByPhone(cleaned);
        if (!data.user) {
          setError('No account found for this number');
        } else {
          setSelectedResult(data.user);
          setAdded(data.isContact || false);
          setIsContact(data.isContact || false);
        }
      } else {
        const { data } = await usersAPI.search(query);
        if (data.users.length === 0) {
          setError('No users found');
        } else {
          setResults(data.users);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed. Try again.');
    }
    setLoading(false);
  };

  const handleAddContact = async () => {
    const target = selectedResult;
    if (!target) return;
    setAdding(true);
    try {
      await usersAPI.addContact({ contactUserId: target.id });
      setAdded(true);
      setIsContact(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save contact');
    }
    setAdding(false);
  };

  const startChat = (user) => {
    onClose();
    setQuery('');
    setSelectedResult(null);
    setResults([]);
    setSearched(false);
    setAdded(false);
    setError('');
    navigate(`/chat/${user.id}`, { state: { user } });
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setQuery('');
      setSelectedResult(null);
      setResults([]);
      setSearched(false);
      setAdded(false);
      setError('');
    }, 200);
  };

  if (!open) return null;

  const getHue = (id) => (id * 60) % 360;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }} onClick={handleClose}>
      <div style={{
        background: Colors.white, borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480,
        maxHeight: '80vh', padding: '20px 24px 32px', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
        }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: Colors.textPrimary }}>Add Contact</h3>
          <button onClick={handleClose}
            style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {MODES.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setMode(key); setQuery(''); setError(''); setSearched(false); setSelectedResult(null); setResults([]); }} style={{
              flex: 1, padding: '8px 12px', borderRadius: 10, border: 'none',
              background: mode === key ? Colors.primary : '#F0F2F5',
              color: mode === key ? Colors.white : Colors.textPrimary,
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, background: Colors.lighterGrey,
          borderRadius: 14, padding: '6px 6px 6px 16',
          border: `2px solid ${error ? '#FECACA' : 'transparent'}`,
          transition: 'border-color 0.2s',
        }}>
          {mode === 'phone' ? (
            <Phone size={18} color={Colors.textHint} style={{ flexShrink: 0 }} />
          ) : (
            <Search size={18} color={Colors.textHint} style={{ flexShrink: 0 }} />
          )}
          <input value={query} onChange={(e) => { setQuery(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder={mode === 'phone' ? 'Phone number with country code' : 'Search by username'}
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: Colors.textPrimary, outline: 'none' }} autoFocus />
          <button onClick={handleSearch} disabled={loading || !query.trim()} style={{
            background: Colors.primary, border: 'none', borderRadius: 10,
            padding: '10px 18px', color: Colors.white, fontWeight: 600, fontSize: 13,
            cursor: loading || !query.trim() ? 'default' : 'pointer',
            opacity: loading || !query.trim() ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            <Search size={15} />
            Search
          </button>
        </div>

        {mode === 'phone' && !searched && (
          <p style={{ fontSize: 12, color: '#B0BEC5', margin: '8px 0 0', paddingLeft: 4 }}>
            Enter the full number with country code (e.g., +254712345678)
          </p>
        )}

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 120, marginTop: 4 }}>
          {error && !loading && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 16,
              padding: '12px 14px', background: '#FEF2F2', borderRadius: 12,
              color: '#B91C1C', fontSize: 13, fontWeight: 500,
              animation: 'fadeIn 0.2s ease',
            }}>
              <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F0F2F5', animation: 'pulse 1.5s ease infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: '50%', height: 12, background: '#F0F2F5', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} />
              </div>
            </div>
          )}

          {!loading && mode === 'username' && results.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {results.map((u, i) => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                  cursor: 'pointer', borderBottom: '0.5px solid #F0F2F5',
                  animation: `fadeInUp 0.2s ease ${i * 0.04}s both`,
                }} onClick={() => startChat(u)}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: `hsl(${getHue(u.id)}, 45%, 45%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: Colors.white, fontWeight: 700, fontSize: 16, flexShrink: 0,
                  }}>{u.username?.charAt(0).toUpperCase() || '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 15, color: Colors.textPrimary }}>{u.username}</div>
                    <div style={{ fontSize: 12, color: Colors.textSecondary }}>{u.phoneNumber}</div>
                  </div>
                  <MessageCircle size={18} color={Colors.primary} style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}

          {!loading && mode === 'username' && searched && results.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: Colors.textSecondary }}>
              <User size={48} color="#E9EDEF" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: Colors.textPrimary }}>No users found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Try a different username</p>
            </div>
          )}

          {!loading && mode === 'phone' && searched && !selectedResult && !error && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: Colors.textSecondary }}>
              <User size={48} color="#E9EDEF" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: Colors.textPrimary }}>User not found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>No account linked to this number</p>
            </div>
          )}

          {!loading && mode === 'phone' && selectedResult && (
            <div style={{
              marginTop: 16, borderRadius: 16, overflow: 'hidden',
              border: '1px solid #E8ECF0',
              animation: 'fadeInUp 0.25s ease',
            }}>
              <div onClick={() => startChat(selectedResult)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px',
                cursor: 'pointer', background: '#FAFBFC',
                borderBottom: '1px solid #E8ECF0',
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: '50%',
                  background: `hsl(${getHue(selectedResult.id)}, 45%, 45%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: Colors.white, fontWeight: 700, fontSize: 18, flexShrink: 0,
                }}>{selectedResult.username?.charAt(0).toUpperCase() || '?'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: Colors.textPrimary }}>{selectedResult.username}</div>
                  <div style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>{selectedResult.phoneNumber}</div>
                </div>
                <div style={{
                  background: '#E8F5E9', borderRadius: 20, padding: '6px 12px',
                  display: 'flex', alignItems: 'center', gap: 4, color: Colors.primary, fontSize: 12, fontWeight: 600,
                }}>
                  <MessageCircle size={14} />
                  Start Chat
                </div>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: Colors.textSecondary }}>
                  {added ? 'Already in your contacts' : 'Not in your contacts'}
                </span>
                {!added ? (
                  <button onClick={handleAddContact} disabled={adding} style={{
                    background: '#F0F2F5', border: 'none', borderRadius: 10,
                    padding: '8px 16px', color: Colors.textPrimary,
                    fontWeight: 600, fontSize: 13, cursor: adding ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, opacity: adding ? 0.6 : 1,
                  }}>
                    {adding ? 'Adding...' : <><UserPlus size={15} /> Add</>}
                  </button>
                ) : (
                  <span style={{ color: Colors.primary, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={15} /> Saved
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddContactModal;