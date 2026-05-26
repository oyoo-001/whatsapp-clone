import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle, Search, Plus, MoreVertical, LogOut, User,
  Phone, PhoneIncoming, Video, Check, CheckCheck, Settings, Lock
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import socketService from '../services/socket';
import { playMessageSound } from '../services/notificationSound';
import { updateBadge, clearBadge, showNotification, requestNotificationPermission } from '../services/notificationUtils';
import NewChatModal from '../components/NewChatModal';
import AddContactModal from '../components/AddContactModal';
import { Colors } from '../styles/theme';
import NotificationPopup from '../components/NotificationPopup';

const TABS = ['All', 'Unread'];

const ChatListPage = () => {
  const { logout } = useAuthStore();
  const { conversations, fetchConversations, isLoading } = useChatStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [notifPopup, setNotifPopup] = useState(null);
  const [pinPrompt, setPinPrompt] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const typingTimers = useRef({});
  const navigate = useNavigate();

  const totalUnread = useMemo(() => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0), [conversations]);
  useEffect(() => { if (totalUnread > 0) updateBadge(totalUnread); else clearBadge(); }, [totalUnread]);

  useEffect(() => {
    requestNotificationPermission();
    fetchConversations();
  }, []);

  useEffect(() => {
    const u1 = socketService.on('chat:message', ({ from, message, user: sender }) => {
      playMessageSound();
      fetchConversations();
      showNotification(sender?.username || 'New Message', {
        body: message?.content || (message?.messageType === 'image' ? '📷 Photo' : message?.messageType === 'audio' ? '🎤 Voice note' : message?.messageType === 'video' ? '📹 Video' : message?.messageType === 'file' ? '📎 File' : 'Message'),
        icon: '/pwa-icon.svg',
        tag: 'new-message',
        silent: true,
      });
      if (from && localStorage.getItem('notifPopups') !== 'false') {
        setNotifPopup({ message, user: sender || { id: from, username: message?.sender?.username || 'User' } });
      }
    });
    const u2 = socketService.on('chat:delivered', () => { fetchConversations(); });
    const u3 = socketService.on('chat:read', () => { fetchConversations(); });
    const u4 = socketService.on('conversation:update', () => { fetchConversations(); });
    const u5 = socketService.on('chat:typing', ({ from, isTyping }) => {
      setTypingUsers((prev) => {
        const next = { ...prev, [from]: isTyping };
        return next;
      });
      if (isTyping) {
        if (typingTimers.current[from]) clearTimeout(typingTimers.current[from]);
        typingTimers.current[from] = setTimeout(() => {
          setTypingUsers((prev) => ({ ...prev, [from]: false }));
        }, 3000);
      }
    });
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const filtered = conversations.filter((c) => {
    const s = c.user.username.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'Unread') return s && c.unreadCount > 0;
    return s;
  });

  const formatTime = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const diff = Date.now() - date;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'Yesterday';
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const openChat = (conv) => {
    const chatPin = localStorage.getItem('chatPin');
    const lockedList = JSON.parse(localStorage.getItem('lockedChats') || '[]');
    if (chatPin && lockedList.includes(conv.user.id) && sessionStorage.getItem(`unlocked_${conv.user.id}`) !== 'true') {
      setPinPrompt(conv);
      setPinValue('');
      setPinError('');
      return;
    }
    navigate(`/chat/${conv.user.id}`, { state: { user: conv.user } });
  };

  const handlePinSubmit = () => {
    const stored = localStorage.getItem('chatPin');
    if (pinValue === stored && pinPrompt) {
      sessionStorage.setItem(`unlocked_${pinPrompt.user.id}`, 'true');
      const conv = pinPrompt;
      setPinPrompt(null);
      navigate(`/chat/${conv.user.id}`, { state: { user: conv.user } });
    } else {
      setPinError('Wrong PIN');
    }
  };

  const formatLastSeen = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = Date.now();
    const diff = now - date;
    if (diff < 60000) return 'last seen just now';
    if (diff < 3600000) return `last seen ${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 172800000) return 'last seen yesterday';
    return `last seen ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', width: '100%',
      background: Colors.white, position: 'relative',
      boxShadow: '0 0 40px rgba(0,0,0,0.06)',
      borderLeft: `1px solid ${Colors.border}`, borderRight: `1px solid ${Colors.border}`,
    }}>
      <header style={{
        background: Colors.primary, padding: '14px 16px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', paddingTop: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MessageCircle size={24} color={Colors.white} />
          <h1 style={{ color: Colors.white, fontSize: 18, fontWeight: 600, margin: 0 }}>WhatsApp</h1>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { icon: PhoneIncoming, label: 'Call Logs', onClick: () => navigate('/call-logs') },
            { icon: User, label: 'Profile', onClick: () => navigate('/profile') },
            { icon: MoreVertical, label: 'Menu', onClick: () => setShowMenu(!showMenu) },
          ].map(({ icon: Icon, label, onClick }) => (
            <button key={label} onClick={onClick} style={headerBtn} title={label}>
              <Icon size={20} />
            </button>
          ))}
        </div>
      </header>

      {showMenu && (
        <div style={{
          position: 'absolute', top: 70, right: 16, zIndex: 100,
          background: Colors.white, borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          padding: 6, minWidth: 180, animation: 'scaleIn 0.15s ease',
        }}>
          {[
            { icon: User, label: 'Profile', onClick: () => { navigate('/profile'); setShowMenu(false); } },
            { icon: PhoneIncoming, label: 'Call Logs', onClick: () => { navigate('/call-logs'); setShowMenu(false); } },
            { icon: MessageCircle, label: 'Contacts', onClick: () => { navigate('/contacts'); setShowMenu(false); } },
            { icon: User, label: 'Add Contact', onClick: () => { setShowAddContact(true); setShowMenu(false); } },
            { icon: Settings, label: 'Settings', onClick: () => { navigate('/settings'); setShowMenu(false); } },
            { icon: LogOut, label: 'Logout', onClick: () => { setShowMenu(false); logout(); }, color: Colors.red },
          ].map(({ icon: Icon, label, onClick, color }) => (
            <button key={label} onClick={onClick} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '12px 14px', background: 'none', border: 'none', borderRadius: 8,
              fontSize: 14, cursor: 'pointer', color: color || Colors.textPrimary,
            }}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '8px 16px', background: Colors.white }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: Colors.lighterGrey, borderRadius: 12, padding: '8px 14px',
        }}>
          <Search size={18} color={Colors.textHint} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start a new chat"
            style={{
              flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: Colors.textPrimary,
            }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, padding: '0 16px', background: Colors.white }}>
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 4px', marginRight: 20, background: 'none', border: 'none',
            borderBottom: activeTab === tab ? `2.5px solid ${Colors.primary}` : '2.5px solid transparent',
            color: activeTab === tab ? Colors.primary : Colors.textSecondary,
            fontWeight: activeTab === tab ? 600 : 400, fontSize: 14, cursor: 'pointer',
            transition: 'all 0.2s',
          }}>{tab}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: '20px 16px' }}>
            {[1,2,3,4,5].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '0.5px solid #F0F2F5' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#F0F2F5', animation: 'pulse 1.5s ease infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '40%', height: 12, background: '#F0F2F5', borderRadius: 4, marginBottom: 8, animation: 'pulse 1.5s ease infinite' }} />
                  <div style={{ width: '70%', height: 10, background: '#F0F2F5', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: Colors.textSecondary }}>
            <MessageCircle size={56} color="#E9EDEF" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 500, color: Colors.textPrimary }}>No conversations yet</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Tap + to start a new chat</p>
          </div>
        ) : (
          filtered.map((conv, i) => (
            <div key={conv.user.id}
              onClick={() => openChat(conv)}
              style={{
                display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer',
                borderBottom: '0.5px solid #F0F2F5', animation: `fadeInUp 0.3s ease ${i * 0.03}s both`,
              }}>
              <div style={{
                width: 50, height: 50, borderRadius: '50%',
                background: conv.user.avatar ? 'none' : `hsl(${conv.user.id * 40 % 360}, 45%, 45%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: Colors.white, fontWeight: 700, fontSize: 20, position: 'relative', flexShrink: 0,
                overflow: 'hidden',
              }}>
                {conv.user.avatar ? (
                  <img src={conv.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : conv.user.username.charAt(0).toUpperCase()}
                {conv.user.isOnline && <span style={onlineDotStyle} />}
              </div>
              <div style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500, fontSize: 16, color: Colors.textPrimary }}>{conv.user.username}</span>
                  <span style={{ fontSize: 11, color: Colors.textSecondary, flexShrink: 0 }}>
                    {formatTime(conv.lastMessage?.createdAt)}
                  </span>
                </div>
                {!conv.user.isOnline && conv.user.lastSeen && !typingUsers[conv.user.id] && (
                  <div style={{ fontSize: 11, color: Colors.textHint, marginTop: 1 }}>{formatLastSeen(conv.user.lastSeen)}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{
                    fontSize: 13, color: Colors.textSecondary, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {typingUsers[conv.user.id] ? (
                      <span style={{ color: Colors.accent, fontWeight: 500 }}>typing...</span>
                    ) : conv.lastMessage?.messageType === 'text'
                      ? conv.lastMessage.content
                      : conv.lastMessage ? `📎 ${conv.lastMessage.messageType}` : <span style={{ color: Colors.textHint }}>{conv.user.status || 'Hey there! I am using WhatsApp Clone'}</span>}
                  </span>
                  {conv.unreadCount > 0 ? (
                    <span style={unreadBadgeStyle}>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>
                  ) : conv.lastMessage?.senderId === conv.user.id ? null : conv.lastMessage?.isRead ? (
                    <CheckCheck size={14} color={Colors.accent} style={{ marginLeft: 8, flexShrink: 0 }} />
                  ) : conv.lastMessage?.isDelivered ? (
                    <CheckCheck size={14} color={Colors.textHint} style={{ marginLeft: 8, flexShrink: 0 }} />
                  ) : conv.lastMessage ? (
                    <Check size={14} color={Colors.textHint} style={{ marginLeft: 8, flexShrink: 0 }} />
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button onClick={() => setShowNewChat(true)} style={fabStyle}>
        <Plus size={24} />
      </button>

      <NewChatModal open={showNewChat} onClose={() => setShowNewChat(false)} />
      <AddContactModal open={showAddContact} onClose={() => setShowAddContact(false)} />

      {pinPrompt && (
        <div onClick={() => setPinPrompt(null)} style={{
          position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: Colors.white, borderRadius: 20, padding: 28, width: 300,
            animation: 'scaleIn 0.2s ease', textAlign: 'center',
          }}>
            <Lock size={36} color={Colors.primary} style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: 18, margin: '0 0 4px', color: Colors.textPrimary }}>Chat Locked</h3>
            <p style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 16 }}>
              Enter your PIN to open this chat
            </p>
            <input type="password" inputMode="numeric" maxLength={4} autoFocus
              value={pinValue}
              onChange={(e) => { setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              placeholder="• • • •"
              style={{
                width: '100%', padding: '14px', fontSize: 24, letterSpacing: 12, textAlign: 'center',
                border: pinError ? '2px solid #E53935' : '2px solid #E9EDEF', borderRadius: 12,
                outline: 'none', fontFamily: 'monospace',
              }} />
            {pinError && <p style={{ fontSize: 12, color: Colors.red, marginTop: 6 }}>{pinError}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setPinPrompt(null)} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                background: '#F0F2F5', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: Colors.textPrimary,
              }}>Cancel</button>
              <button onClick={handlePinSubmit} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                background: Colors.primary, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: Colors.white,
              }}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      {notifPopup && (
        <NotificationPopup
          message={notifPopup.message}
          user={notifPopup.user}
          onDismiss={() => setNotifPopup(null)}
          onClick={() => {
            const targetId = notifPopup.user.id;
            setNotifPopup(null);
            navigate(`/chat/${targetId}`, { state: { user: notifPopup.user } });
          }}
        />
      )}
    </div>
  );
};

const headerBtn = {
  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10,
  cursor: 'pointer', color: Colors.white, padding: 8, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};

const onlineDotStyle = {
  position: 'absolute', bottom: 0, right: 0, width: 13, height: 13,
  borderRadius: '50%', background: Colors.online, border: '2.5px solid white',
};

const unreadBadgeStyle = {
  background: Colors.secondary, color: Colors.white, borderRadius: '50%',
  minWidth: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, fontWeight: 700, padding: '0 5px', marginLeft: 8, flexShrink: 0,
};

const fabStyle = {
  position: 'absolute', bottom: 24, right: 20,
  width: 56, height: 56, borderRadius: '50%', background: Colors.secondary,
  border: 'none', cursor: 'pointer', color: Colors.white,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
  zIndex: 10,
};

export default ChatListPage;
