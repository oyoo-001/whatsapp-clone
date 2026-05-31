import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Radio } from 'lucide-react';
import useChannelStore from '../stores/channelStore';
import { Colors } from '../styles/theme';

const CreateChannelModal = ({ open, onClose }) => {
  const { createChannel } = useChannelStore();
  const navigate = useNavigate();
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!channelName.trim() || loading) return;
    setLoading(true);
    try {
      const channel = await createChannel(channelName.trim(), description.trim() || null);
      onClose();
      setChannelName('');
      setDescription('');
      navigate(`/channels/${channel.id}`, { state: { channel } });
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }} onClick={onClose}>
      <div style={{
        background: Colors.white, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480,
        maxHeight: '85vh', padding: '20px 24px', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
        }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: Colors.textPrimary }}>New Channel</h3>
          <button onClick={() => { onClose(); setChannelName(''); setDescription(''); }}
            style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
            <X size={18} />
          </button>
        </div>

        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: '#E8F5E9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Radio size={32} color={Colors.primary} />
        </div>

        <input value={channelName} onChange={(e) => setChannelName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          placeholder="Enter channel name"
          style={{
            padding: '14px 16px', border: '2px solid #E9EDEF', borderRadius: 12,
            fontSize: 16, outline: 'none', fontFamily: 'inherit', marginBottom: 12,
            color: Colors.textPrimary, textAlign: 'center',
          }}
          disabled={loading}
          autoFocus />

        <input value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          style={{
            padding: '14px 16px', border: '2px solid #E9EDEF', borderRadius: 12,
            fontSize: 14, outline: 'none', fontFamily: 'inherit', marginBottom: 20,
            color: Colors.textSecondary, textAlign: 'center',
          }}
          disabled={loading} />

        <button onClick={handleCreate} disabled={!channelName.trim() || loading} style={{
          padding: '14px', borderRadius: 12, border: 'none',
          background: !channelName.trim() || loading ? '#E9EDEF' : Colors.primary,
          color: !channelName.trim() || loading ? Colors.textHint : Colors.white,
          fontWeight: 600, fontSize: 16, cursor: !channelName.trim() || loading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading ? 'Creating...' : <><Radio size={18} /> Create Channel</>}
        </button>
      </div>
    </div>
  );
};

export default CreateChannelModal;
