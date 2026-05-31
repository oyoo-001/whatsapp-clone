import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Radio, Users, ArrowLeft, LogIn, UserPlus, Check, Loader } from 'lucide-react';
import { Colors } from '../styles/theme';
import useAuthStore from '../stores/authStore';
import { channelsAPI, groupsAPI } from '../services/api';

const InvitePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  const [entity, setEntity] = useState(null);
  const [type, setType] = useState(null); // 'channel' | 'group'
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  const isChannel = location.pathname.startsWith('/channel/invite');

  useEffect(() => {
    loadEntity();
  }, [code, isChannel]);

  const loadEntity = async () => {
    setLoading(true);
    setType(isChannel ? 'channel' : 'group');
    try {
      if (isChannel) {
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
      setError('Invalid or expired invite link');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setJoining(true);
    try {
      if (isChannel) {
        await channelsAPI.joinByInvite(code);
      } else {
        await groupsAPI.joinByInvite(code);
      }
      setJoined(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to join';
      if (msg === 'Already following this channel' || msg === 'Already a member of this group') {
        setJoined(true);
      } else {
        setError(msg);
      }
    }
    setJoining(false);
  };

  const handleGoTo = () => {
    if (isChannel) {
      navigate(`/channels/${entity.id}`);
    } else {
      navigate(`/group-chat/${entity.id}`);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: Colors.white, maxWidth: 480, margin: '0 auto', gap: 16 }}>
        <Loader size={32} color={Colors.primary} className="spinner" />
        <p style={{ color: Colors.textSecondary, fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: Colors.white, maxWidth: 480, margin: '0 auto', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#FFF0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <MessageCircle size={36} color={Colors.red} />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, color: Colors.textPrimary }}>Invite Not Found</h2>
        <p style={{ color: Colors.textSecondary, fontSize: 14, margin: '0 0 24px' }}>{error}</p>
        <button onClick={() => navigate('/')} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: Colors.primary, color: Colors.white, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Go Home
        </button>
      </div>
    );
  }

  if (!entity) return null;

  const Icon = isChannel ? Radio : Users;
  const iconBg = isChannel ? '#E8F5E9' : '#E3F2FD';
  const iconColor = isChannel ? Colors.primary : '#1565C0';

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', width: '100%',
      background: Colors.white,
      boxShadow: '0 0 40px rgba(0,0,0,0.06)',
      borderLeft: `1px solid ${Colors.border}`,
      borderRight: `1px solid ${Colors.border}`,
    }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 40, textAlign: 'center',
        animation: 'fadeInUp 0.4s ease',
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: 28, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}>
          <Icon size={48} color={iconColor} />
        </div>

        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: Colors.textPrimary }}>
          {entity.name}
        </h1>

        {entity.description && (
          <p style={{ margin: '0 0 12px', fontSize: 14, color: Colors.textSecondary, maxWidth: 320, lineHeight: 1.5 }}>
            {entity.description}
          </p>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: Colors.textHint, marginBottom: 32,
        }}>
          <Users size={14} />
          <span>{isChannel ? `${entity.followerCount || 0} followers` : `${entity.memberCount || 0} members`}</span>
          {entity.creator?.username && (
            <>
              <span>·</span>
              <span>Created by {entity.creator.username}</span>
            </>
          )}
        </div>

        {joined ? (
          <button onClick={handleGoTo} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', borderRadius: 14, border: 'none',
            background: Colors.secondary, color: Colors.white,
            fontWeight: 700, fontSize: 16, cursor: 'pointer',
          }}>
            <MessageCircle size={20} />
            Go to {isChannel ? 'Channel' : 'Group'}
          </button>
        ) : (
          <button onClick={handleJoin} disabled={joining} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', borderRadius: 14, border: 'none',
            background: joining ? '#E9EDEF' : Colors.primary,
            color: joining ? Colors.textHint : Colors.white,
            fontWeight: 700, fontSize: 16, cursor: joining ? 'default' : 'pointer',
            boxShadow: '0 4px 16px rgba(7,94,84,0.3)',
          }}>
            {joining ? (
              <Loader size={20} className="spinner" />
            ) : isAuthenticated ? (
              <UserPlus size={20} />
            ) : (
              <LogIn size={20} />
            )}
            {joining ? 'Joining...' : isAuthenticated ? 'Join' : 'Login to Join'}
          </button>
        )}

        <button onClick={() => navigate('/')} style={{
          marginTop: 20, background: 'none', border: 'none',
          color: Colors.textHint, fontSize: 13, cursor: 'pointer',
          padding: '8px 16px',
        }}>
          {isAuthenticated ? 'Back to Home' : 'Go to Home'}
        </button>
      </div>
    </div>
  );
};

export default InvitePage;
