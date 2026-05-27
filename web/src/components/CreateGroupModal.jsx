import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users } from 'lucide-react';
import useGroupStore from '../stores/groupStore';
import { Colors } from '../styles/theme';

const CreateGroupModal = ({ open, onClose }) => {
  const { createGroup } = useGroupStore();
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!groupName.trim() || loading) return;
    setLoading(true);
    try {
      const group = await createGroup(groupName.trim());
      onClose();
      setGroupName('');
      navigate(`/group-chat/${group.id}`, { state: { group } });
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
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: Colors.textPrimary }}>New Group</h3>
          <button onClick={() => { onClose(); setGroupName(''); }}
            style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
            <X size={18} />
          </button>
        </div>

        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: Colors.lighterGrey,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Users size={32} color={Colors.textHint} />
        </div>

        <input value={groupName} onChange={(e) => setGroupName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          placeholder="Enter group name"
          style={{
            padding: '14px 16px', border: '2px solid #E9EDEF', borderRadius: 12,
            fontSize: 16, outline: 'none', fontFamily: 'inherit', marginBottom: 20,
            color: Colors.textPrimary, textAlign: 'center',
          }}
          disabled={loading}
          autoFocus />

        <button onClick={handleCreate} disabled={!groupName.trim() || loading} style={{
          padding: '14px', borderRadius: 12, border: 'none',
          background: !groupName.trim() || loading ? '#E9EDEF' : Colors.primary,
          color: !groupName.trim() || loading ? Colors.textHint : Colors.white,
          fontWeight: 600, fontSize: 16, cursor: !groupName.trim() || loading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading ? 'Creating...' : <><Users size={18} /> Create Group</>}
        </button>
      </div>
    </div>
  );
};

export default CreateGroupModal;
