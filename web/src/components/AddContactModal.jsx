import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, Phone, UserPlus, MessageCircle, Check, AlertCircle } from 'lucide-react';
import { usersAPI } from '../services/api';
import { Colors } from '../styles/theme';

const formatPhone = (v) => {
  let digits = v.replace(/[^\d+]/g, '');
  if (digits.startsWith('+') && digits.length > 1) {
    return '+' + digits.slice(1).replace(/\D/g, '');
  }
  return digits.replace(/\D/g, '');
};

const AddContactModal = ({ open, onClose }) => {
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const [isContact, setIsContact] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    const cleaned = formatPhone(phone);
    if (!cleaned) return setError('Enter a phone number');
    if (cleaned.length < 8) return setError('Number too short — include country code (e.g., +254712345678)');

    setLoading(true);
    setSearched(true);
    setResult(null);
    setAdded(false);
    setError('');

    try {
      const { data } = await usersAPI.searchByPhone(cleaned);
      if (!data.user) {
        setResult(null);
        setError('No account found for this number');
      } else {
        setResult(data.user);
        setAdded(data.isContact || false);
        setIsContact(data.isContact || false);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed. Try again.');
    }
    setLoading(false);
  };

  const handleAddContact = async () => {
    if (!result) return;
    setAdding(true);
    try {
      await usersAPI.addContact({ contactUserId: result.id });
      setAdded(true);
      setIsContact(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save contact');
    }
    setAdding(false);
  };

  const startChat = () => {
    if (!result) return;
    onClose();
    setPhone('');
    setResult(null);
    setSearched(false);
    setAdded(false);
    setError('');
    navigate(`/chat/${result.id}`, { state: { user: result } });
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setPhone('');
      setResult(null);
      setSearched(false);
      setAdded(false);
      setError('');
    }, 200);
  };

  if (!open) return null;

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
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
        }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: Colors.textPrimary }}>Add Contact</h3>
          <button onClick={handleClose}
            style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
            <X size={18} />
          </button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, background: Colors.lighterGrey,
          borderRadius: 14, padding: '6px 6px 6px 16',
          border: `2px solid ${error ? '#FECACA' : 'transparent'}`,
          transition: 'border-color 0.2s',
        }}>
          <Phone size={18} color={Colors.textHint} style={{ flexShrink: 0 }} />
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Phone number with country code"
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: Colors.textPrimary, outline: 'none' }} autoFocus />
          <button onClick={handleSearch} disabled={loading || !phone.trim()} style={{
            background: Colors.primary, border: 'none', borderRadius: 10,
            padding: '10px 18px', color: Colors.white, fontWeight: 600, fontSize: 13,
            cursor: loading || !phone.trim() ? 'default' : 'pointer',
            opacity: loading || !phone.trim() ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            <Search size={15} />
            Search
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 120, marginTop: 4 }}>
          <p style={{ fontSize: 12, color: '#B0BEC5', margin: '8px 0 0', paddingLeft: 4 }}>
            Enter the full number with country code (e.g., +254712345678)
          </p>

          {error && !result && !loading && (
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

          {!loading && searched && !result && !error && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: Colors.textSecondary }}>
              <User size={48} color="#E9EDEF" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: Colors.textPrimary }}>User not found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>No account linked to this number</p>
            </div>
          )}

          {!loading && result && (
            <div style={{
              marginTop: 16, borderRadius: 16, overflow: 'hidden',
              border: '1px solid #E8ECF0',
              animation: 'fadeInUp 0.25s ease',
            }}>
              <div onClick={startChat} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px',
                cursor: 'pointer', background: '#FAFBFC',
                borderBottom: '1px solid #E8ECF0',
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: '50%',
                  background: `hsl(${result.id * 60 % 360}, 45%, 45%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: Colors.white, fontWeight: 700, fontSize: 18, flexShrink: 0,
                }}>{result.username?.charAt(0).toUpperCase() || '?'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: Colors.textPrimary }}>{result.username}</div>
                  <div style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>{result.phoneNumber}</div>
                </div>
                <div style={{
                  background: '#E8F5E9', borderRadius: 20, padding: '6px 12px',
                  display: 'flex', alignItems: 'center', gap: 4, color: Colors.primary, fontSize: 12, fontWeight: 600,
                }}>
                  <MessageCircle size={14} />
                  Chat
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
                    {adding ? 'Adding...' : <><UserPlus size={15} /> Save Contact</>}
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