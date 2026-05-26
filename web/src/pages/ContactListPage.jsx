import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserPlus, X, User, MessageCircle, Plus, Trash2 } from 'lucide-react';
import useContactStore from '../stores/contactStore';
import AlertDialog from '../components/AlertDialog';
import { useToast } from '../components/Toast';
import { usersAPI } from '../services/api';
import { Colors } from '../styles/theme';

const ContactListPage = () => {
  const { contacts, fetchContacts, addContact, removeContact } = useContactStore();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dialog, setDialog] = useState({ open: false });
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => { fetchContacts().then(() => setLoading(false)); }, []);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) return setSearchResults([]);
    setSearching(true);
    try {
      const { data } = await usersAPI.search(q);
      setSearchResults(data.users || []);
    } catch {}
    setSearching(false);
  };

  const handleAddContact = async (userId) => {
    try {
      await addContact(userId);
      toast('Contact added', 'success');
      setSearchQuery('');
      setSearchResults([]);
    } catch { toast('Failed to add contact', 'error'); }
  };

  const confirmRemove = (contact) => {
    setDialog({
      open: true,
      title: 'Remove Contact',
      message: `Remove ${contact.contactUser?.username || 'this contact'} from your contacts?`,
      confirmLabel: 'Remove',
      type: 'danger',
      onConfirm: async () => {
        try { await removeContact(contact.id); toast('Contact removed', 'info'); }
        catch { toast('Failed to remove', 'error'); }
        setDialog({ open: false });
      },
      onCancel: () => setDialog({ open: false }),
    });
  };

  const startChat = (user) => {
    navigate(`/chat/${user.id}`, { state: { user } });
  };

  const getHue = (id) => (id * 60) % 360;

  return (
    <div style={{ minHeight: '100vh', background: Colors.white, maxWidth: 480, margin: '0 auto', borderLeft: '0.5px solid #E9EDEF', borderRight: '0.5px solid #E9EDEF' }}>
      <header style={{
        background: Colors.primary, padding: '14px 16px', display: 'flex',
        alignItems: 'center', gap: 12, paddingTop: 20,
      }}>
        <button onClick={() => navigate('/')} style={headerBtn}><ArrowLeft size={20} /></button>
        <h2 style={{ color: Colors.white, fontSize: 18, fontWeight: 600, margin: 0 }}>Contacts</h2>
      </header>

      <div style={{ padding: '12px 16px', animation: 'fadeInUp 0.3s ease' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: Colors.lighterGrey, borderRadius: 12, padding: '8px 14px',
        }}>
          <Search size={18} color={Colors.textHint} />
          <input value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users to add..."
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: Colors.textPrimary }} />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.textHint, padding: 2, display: 'flex' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {searchQuery.length >= 2 && (
          <div style={{ marginBottom: 20, animation: 'fadeIn 0.2s' }}>
            <h4 style={{ color: Colors.textSecondary, fontSize: 12, textTransform: 'uppercase', fontWeight: 700, margin: '8px 0', letterSpacing: '0.5px' }}>Search Results</h4>
            {searching ? (
              <p style={{ color: Colors.textSecondary, fontSize: 14 }}>Searching...</p>
            ) : searchResults.length === 0 ? (
              <p style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center', padding: 20 }}>No users found</p>
            ) : (
              searchResults.map((u) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #F0F2F5', animation: 'fadeInUp 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}
                    onClick={() => startChat(u)}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: `hsl(${getHue(u.id)}, 45%, 45%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: Colors.white, fontWeight: 700, fontSize: 16, flexShrink: 0,
                    }}>{u.username?.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 15 }}>{u.username}</div>
                      <div style={{ fontSize: 12, color: Colors.textSecondary }}>{u.phoneNumber}</div>
                    </div>
                  </div>
                  {!contacts.find((c) => c.contactUserId === u.id) && (
                    <button onClick={() => handleAddContact(u.id)} style={{
                      background: Colors.secondary, color: Colors.white, border: 'none',
                      borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}><Plus size={14} /> Add</button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div>
          <h4 style={{ color: Colors.textSecondary, fontSize: 12, textTransform: 'uppercase', fontWeight: 700, margin: '12px 0 8px', letterSpacing: '0.5px' }}>
            Contacts ({contacts.length})
          </h4>
          {loading ? (
            <div style={{ padding: '12px 0' }}>
              {[1,2,3,4].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F0F2F5', animation: 'pulse 1.5s ease infinite' }} />
                  <div style={{ flex: 1 }}><div style={{ width: '50%', height: 12, background: '#F0F2F5', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} /></div>
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: Colors.textSecondary }}>
              <UserPlus size={40} color="#E9EDEF" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14 }}>No contacts yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Search for users above to add</p>
            </div>
          ) : (
            contacts.map((contact, i) => {
              const user = contact.contactUser || contact;
              const addedUser = contact.addedBy || user;
              return (
                <div key={contact.id || user.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '0.5px solid #F0F2F5',
                  animation: `fadeInUp 0.2s ease ${i * 0.03}s both`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}
                    onClick={() => startChat(user)}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: `hsl(${getHue(user.id)}, 45%, 45%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: Colors.white, fontWeight: 700, fontSize: 16, position: 'relative', flexShrink: 0,
                    }}>
                      {user.username?.charAt(0).toUpperCase()}
                      {user.isOnline && <span style={{
                        position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
                        borderRadius: '50%', background: Colors.online, border: '2px solid white',
                      }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 15 }}>{user.username}</div>
                      <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                        {user.isOnline ? 
                          <span style={{ color: Colors.online }}>● online</span> 
                          : 'offline'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => startChat(user)} style={actionBtn} title="Chat">
                      <MessageCircle size={16} />
                    </button>
                    <button onClick={() => confirmRemove(contact)} style={{ ...actionBtn, color: Colors.red }} title="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AlertDialog {...dialog} />
    </div>
  );
};

const headerBtn = {
  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10,
  cursor: 'pointer', color: Colors.white, padding: 8, display: 'flex',
};

const actionBtn = {
  background: '#F0F2F5', border: 'none', borderRadius: 8, padding: 8,
  cursor: 'pointer', color: Colors.textSecondary, display: 'flex',
};

export default ContactListPage;
