import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, Radio, Loader, UserPlus, LogIn, MessageCircle } from 'lucide-react';
import { Colors } from '../styles/theme';
import useInvitePreviewStore from '../stores/invitePreviewStore';
import useAuthStore from '../stores/authStore';
import useChannelStore from '../stores/channelStore';
import { channelsAPI, groupsAPI } from '../services/api';

const InvitePreviewModal = () => {
  const { isOpen, type, code, close } = useInvitePreviewStore();
  const { isAuthenticated, user } = useAuthStore();
  const { channels } = useChannelStore();
  const navigate = useNavigate();
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!isOpen || !type || !code) return;
    setLoading(true);
    setError('');
    setEntity(null);
    setJoined(false);

    const fetchEntity = async () => {
      try {
        if (type === 'channel') {
          const { data } = await channelsAPI.getChannelByInviteCode(code);
          setEntity(data.channel);
          if (user) {
            const isFollower = data.channel.followers?.some(f => f.userId === user.id);
            if (isFollower) setJoined(true);
          }
        } else {
          const { data } = await groupsAPI.getGroupByInviteCode(code);
          setEntity(data.group);
          if (user) {
            const isMember = data.group.participants?.some(p => p.id === user.id);
            if (isMember) setJoined(true);
          }
        }
      } catch {
        setError('Channel/Group not found');
      }
      setLoading(false);
    };
    fetchEntity();
  }, [isOpen, type, code]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      close();
      navigate(`/login?redirect=/${type}/invite/${code}`);
      return;
    }
    setJoining(true);
    try {
      if (type === 'channel') {
        await channelsAPI.joinByInvite(code);
      } else {
        await groupsAPI.joinByInvite(code);
      }
      setJoined(true);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg === 'Already following this channel' || msg === 'Already a member of this group') {
        setJoined(true);
      } else {
        setError(msg || 'Failed to join');
      }
    }
    setJoining(false);
  };

  const handleGoTo = () => {
    close();
    if (type === 'channel') {
      navigate(`/channels/${entity.id}`);
    } else {
      navigate(`/group-chat/${entity.id}`);
    }
  };

  if (!isOpen) return null;

  const Icon = type === 'channel' ? Radio : Users;
  const accentColor = type === 'channel' ? Colors.primary : '#1565C0';
  const accentBg = type === 'channel' ? '#E8F5E9' : '#E3F2FD';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease',
    }} onClick={close}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '88%', maxWidth: 380,
        background: Colors.white, borderRadius: 24,
        padding: '32px 24px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        animation: 'scaleIn 0.25s ease',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
      }}>
        <button onClick={close} style={{
          position: 'absolute', top: 12, right: 12,
          background: '#F0F2F5', border: 'none', borderRadius: '50%',
          width: 32, height: 32, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: Colors.textHint,
        }}>
          <X size={16} />
        </button>

        {loading && (
          <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader size={32} color={Colors.primary} className="spinner" />
            <span style={{ fontSize: 14, color: Colors.textSecondary }}>Loading...</span>
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: '#FFF0F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <MessageCircle size={32} color={Colors.red} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: Colors.textPrimary, margin: '0 0 4px' }}>
              {error}
            </p>
            <p style={{ fontSize: 13, color: Colors.textSecondary, margin: 0 }}>
              This invite link may be invalid or expired.
            </p>
          </div>
        )}

        {entity && !loading && !error && (
          <>
            {entity.avatar ? (
              <div style={{
                width: 88, height: 88, borderRadius: 24, overflow: 'hidden',
                marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                flexShrink: 0,
              }}>
                <img src={entity.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{
                width: 88, height: 88, borderRadius: 24, background: accentBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}>
                <Icon size={40} color={accentColor} />
              </div>
            )}

            <h2 style={{
              margin: '0 0 4px', fontSize: 20, fontWeight: 700,
              color: Colors.textPrimary, textAlign: 'center',
            }}>
              {entity.name}
            </h2>

            {entity.description && (
              <p style={{
                margin: '0 0 12px', fontSize: 13, color: Colors.textSecondary,
                textAlign: 'center', lineHeight: 1.5, maxWidth: 300,
              }}>
                {entity.description}
              </p>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: Colors.textHint, marginBottom: 24,
            }}>
              <Users size={14} />
              <span>
                {type === 'channel'
                  ? `${entity.followerCount || 0} followers`
                  : `${entity.memberCount || 0} members`}
              </span>
            </div>

            {joined ? (
              <button onClick={handleGoTo} style={{
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                width: '100%', padding: '13px 0', borderRadius: 14, border: 'none',
                background: Colors.secondary, color: Colors.white,
                fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}>
                <MessageCircle size={18} />
                Go to {type === 'channel' ? 'Channel' : 'Group'}
              </button>
            ) : (
              <button onClick={handleJoin} disabled={joining} style={{
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                width: '100%', padding: '13px 0', borderRadius: 14, border: 'none',
                background: joining ? '#E9EDEF' : accentColor,
                color: joining ? Colors.textHint : Colors.white,
                fontWeight: 700, fontSize: 15, cursor: joining ? 'default' : 'pointer',
                boxShadow: joining ? 'none' : `0 4px 16px ${accentColor}60`,
              }}>
                {joining ? (
                  <Loader size={18} className="spinner" />
                ) : isAuthenticated ? (
                  <UserPlus size={18} />
                ) : (
                  <LogIn size={18} />
                )}
                {joining ? 'Joining...' : isAuthenticated ? 'Join' : 'Login to Join'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InvitePreviewModal;
