import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Phone, Video, Paperclip, Smile, Send, Mic,
  Check, CheckCheck, Info, MessageCircle, User, UserPlus,
  ShieldOff, ShieldBan, X, Lock,
  Reply, Edit3, XCircle
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import useContactStore from '../stores/contactStore';
import socketService from '../services/socket';
import { usersAPI, uploadAPI } from '../services/api';
import MessageBubble from '../components/MessageBubble';
import MessageContextMenu from '../components/MessageContextMenu';
import ForwardModal from '../components/ForwardModal';
import NotificationPopup from '../components/NotificationPopup';
import EmojiPicker from '../components/EmojiPicker';
import VoiceRecorder from '../components/VoiceRecorder';
import { playMessageSound } from '../services/notificationSound';
import AlertDialog from '../components/AlertDialog';
import { useToast } from '../components/Toast';
import { Colors } from '../styles/theme';

const ChatPage = () => {
  const { userId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const chatUser = state?.user;
  const { user: currentUser } = useAuthStore();
  const { messages, fetchMessages, sendMessage, isLoadingMessages, addMessage, markAsRead,
    replyTo, editMessage, forwardMessage,
    setReplyTo, setEditMessage, setForwardMessage,
    editMessageAction, deleteMessageAction } = useChatStore();
  const { addContact } = useContactStore();
  const toast = useToast();
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isContact, setIsContact] = useState(false);
  const [relationshipChecked, setRelationshipChecked] = useState(false);
  const [showContactPrompt, setShowContactPrompt] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextPos, setContextPos] = useState(null);
  const [contextMessage, setContextMessage] = useState(null);
  const [showForward, setShowForward] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('me');
  const [notifPopup, setNotifPopup] = useState(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeout = useRef(null);

  const uid = Number(userId);
  const formatLastSeen = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const diff = Date.now() - date;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'yesterday';
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };
  const [locked, setLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    const chatPin = localStorage.getItem('chatPin');
    if (chatPin) {
      const lockedList = JSON.parse(localStorage.getItem('lockedChats') || '[]');
      if (lockedList.includes(uid) && sessionStorage.getItem(`unlocked_${uid}`) !== 'true') {
        setLocked(true);
        return;
      }
    }
    if (uid) { fetchMessages(uid); markAsRead(uid); }
    useChatStore.getState().setupSocketListeners();
    checkRelationship();
  }, [uid]);

  const handlePinUnlock = () => {
    const stored = localStorage.getItem('chatPin');
    if (pinInput === stored) {
      sessionStorage.setItem(`unlocked_${uid}`, 'true');
      setLocked(false);
      if (uid) { fetchMessages(uid); markAsRead(uid); }
      useChatStore.getState().setupSocketListeners();
      checkRelationship();
    } else {
      setPinError('Wrong PIN');
    }
  };

  const lockChat = () => {
    const lockedList = JSON.parse(localStorage.getItem('lockedChats') || '[]');
    if (!lockedList.includes(uid)) {
      lockedList.push(uid);
      localStorage.setItem('lockedChats', JSON.stringify(lockedList));
      toast('Chat locked', 'info');
    }
  };

  const unlockChat = () => {
    let lockedList = JSON.parse(localStorage.getItem('lockedChats') || '[]');
    lockedList = lockedList.filter((id) => id !== uid);
    localStorage.setItem('lockedChats', JSON.stringify(lockedList));
    setLocked(false);
    toast('Chat unlocked', 'info');
  };

  const checkRelationship = async () => {
    try {
      const { data } = await usersAPI.getProfile(uid);
      setIsContact(data.isContact);
      if (data.isContact) {
        const contactsRes = await usersAPI.getContacts();
        const contact = contactsRes.data.contacts.find((c) => c.contactUserId === uid);
        if (contact) setIsBlocked(contact.isBlocked);
      }
    } catch {}
    setRelationshipChecked(true);
    if (!chatUser) {
      try {
        const { data } = await usersAPI.getProfile(uid);
        navigate(`/chat/${uid}`, { replace: true, state: { user: data.user } });
      } catch {}
    }
  };

  useEffect(() => {
    if (!isContact && relationshipChecked && chatUser && messages.length > 0) {
      const received = messages.some((m) => m.senderId === uid);
      if (received) setShowContactPrompt(true);
    }
  }, [messages, isContact, relationshipChecked]);

  useEffect(() => {
    const u1 = socketService.on('chat:message', ({ from, message, user: sender }) => {
      if (from === uid) addMessage(message);
      if (from !== currentUser.id) {
        playMessageSound();
        if (from !== uid && localStorage.getItem('notifPopups') !== 'false') {
          setNotifPopup({ message, user: sender || { id: from, username: message.sender?.username || 'User' } });
        }
      }
    });
    const u2 = socketService.on('chat:typing', ({ from, isTyping: t }) => {
      if (from === uid) setIsTyping(t);
    });
    return () => { u1(); u2(); };
  }, [uid]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  const handleContextAction = (action) => {
    if (!contextMessage) return;
    switch (action) {
      case 'reply':
        setReplyTo(contextMessage);
        inputRef.current?.focus();
        break;
      case 'edit':
        if (contextMessage.senderId === currentUser.id) {
          setEditMessage(contextMessage);
          setText(contextMessage.content || '');
          inputRef.current?.focus();
        }
        break;
      case 'forward':
        setForwardMessage(contextMessage);
        setShowForward(true);
        break;
      case 'delete':
        setShowDeleteConfirm(true);
        break;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!contextMessage) return;
    try {
      await deleteMessageAction(contextMessage.id, deleteMode);
      toast(deleteMode === 'all' ? 'Message deleted for everyone' : 'Message deleted for me', 'info');
    } catch {
      toast('Failed to delete message', 'error');
    }
    setShowDeleteConfirm(false);
    setContextMessage(null);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
    setEditMessage(null);
    setText('');
  };

  const handleSend = async (overrideContent) => {
    const content = overrideContent !== undefined ? overrideContent : text.trim();
    if (!content && !overrideContent) return;
    try {
      if (editMessage) {
        await editMessageAction(editMessage.id, content);
        setText('');
        return;
      }
      await sendMessage({ receiverId: uid, content, messageType: 'text' });
      socketService.emit('chat:typing', { to: uid, isTyping: false });
      setText('');
      setShowEmoji(false);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg?.includes('blocked')) toast('Cannot send — user is blocked', 'error');
      else toast('Failed to send message', 'error');
    }
  };

  const handleSendGif = (url) => {
    sendMessage({ receiverId: uid, content: url, messageType: 'image', mimeType: 'image/gif' })
      .catch(() => toast('Failed to send GIF', 'error'));
    setShowEmoji(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const onType = (val) => {
    setText(val);
    socketService.emit('chat:typing', { to: uid, isTyping: val.length > 0 });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketService.emit('chat:typing', { to: uid, isTyping: false });
    }, 2000);
  };

  const handleEmojiSelect = (emoji, type) => {
    if (type === 'gif') { handleSendGif(emoji); return; }
    setText((prev) => prev + emoji);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await uploadAPI.upload(file);
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      const isAud = file.type.startsWith('audio/');
      const msgType = isImg ? 'image' : isVid ? 'video' : isAud ? 'audio' : 'file';
      await sendMessage({
        receiverId: uid,
        content: file.name,
        messageType: msgType,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      });
      toast('File sent', 'success');
    } catch { toast('Failed to upload file', 'error'); }
    setUploading(false);
    if (e.target) e.target.value = '';
  };

  const handleVoiceSend = async (blob, duration) => {
    setUploading(true);
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      const { data } = await uploadAPI.upload(file);
      await sendMessage({
        receiverId: uid,
        content: `Voice note (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})`,
        messageType: 'audio',
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      });
    } catch { toast('Failed to send voice note', 'error'); }
    setUploading(false);
    setShowVoice(false);
  };

  const startCall = (type) => {
    navigate(`/call/${uid}`, { state: { user: chatUser, callType: type, isIncoming: false } });
  };

  const addToContacts = async () => {
    try {
      await addContact(uid);
      setIsContact(true);
      setShowContactPrompt(false);
      toast('Contact added', 'success');
    } catch { toast('Already in contacts', 'info'); }
    setShowActions(false);
  };

  const toggleBlock = async () => {
    try {
      await usersAPI.blockContact(uid);
      setIsBlocked(!isBlocked);
      toast(isBlocked ? 'User unblocked' : 'User blocked', 'info');
    } catch { toast('Failed to toggle block', 'error'); }
    setShowActions(false);
    setShowProfile(false);
  };

  if (locked) return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', width: '100%', background: Colors.primary, justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Lock size={48} color={Colors.white} style={{ marginBottom: 16, opacity: 0.8 }} />
        <h2 style={{ color: Colors.white, fontSize: 20, marginBottom: 8 }}>Chat Locked</h2>
        <p style={{ color: '#B2DFDB', fontSize: 13, marginBottom: 20 }}>Enter your PIN to open this chat</p>
        <input type="password" inputMode="numeric" maxLength={4} autoFocus
          value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handlePinUnlock()}
          placeholder="• • • •"
          style={{
            width: 200, padding: '14px', fontSize: 24, letterSpacing: 12, textAlign: 'center',
            border: '2px solid rgba(255,255,255,0.3)', borderRadius: 12, background: 'rgba(255,255,255,0.1)',
            outline: 'none', fontFamily: 'monospace', color: Colors.white,
          }} />
        {pinError && <p style={{ fontSize: 12, color: '#FF8A80', marginTop: 8 }}>{pinError}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
          <button onClick={() => navigate('/')} style={{
            padding: '10px 24px', borderRadius: 12, border: 'none',
            background: 'rgba(255,255,255,0.15)', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: Colors.white,
          }}>Back</button>
          <button onClick={handlePinUnlock} style={{
            padding: '10px 24px', borderRadius: 12, border: 'none',
            background: Colors.white, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: Colors.primary,
          }}>Unlock</button>
        </div>
      </div>
    </div>
  );

  if (!chatUser) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
      <div style={{ textAlign: 'center' }}>
        <Info size={40} color={Colors.lightGrey} style={{ marginBottom: 12 }} />
        <p>User not found</p>
        <button onClick={() => navigate('/')} style={{ marginTop: 16, background: Colors.primary, color: Colors.white, border: 'none', borderRadius: 10, padding: '10px 24px', cursor: 'pointer', fontSize: 14 }}>Go Back</button>
      </div>
    </div>
  );

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', width: '100%', background: Colors.chatBg,
      position: 'relative',
    }}>
      <header style={{
        background: Colors.primary, padding: '10px 12px', display: 'flex',
        alignItems: 'center', gap: 8, paddingTop: 20, zIndex: 10,
      }}>
        <button onClick={() => navigate('/')} style={iconBtn}>←</button>
        <div onClick={() => setShowProfile(true)} style={{
          width: 38, height: 38, borderRadius: '50%',
          background: chatUser?.avatar ? 'none' : `hsl(${uid * 40 % 360}, 40%, 50%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: Colors.white, fontWeight: 700, fontSize: 16, flexShrink: 0,
          cursor: 'pointer', overflow: 'hidden',
        }}>{chatUser?.avatar ? <img src={chatUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : chatUser.username.charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: Colors.white, fontWeight: 600, fontSize: 15 }}>{chatUser.username}</div>
          <div style={{ color: '#B2DFDB', fontSize: 11 }}>
            {isBlocked ? 'Blocked' : isTyping ? <span style={{ animation: 'pulse 1s ease infinite' }}>typing...</span> : chatUser.isOnline ? 'online' : chatUser.lastSeen ? `last seen ${formatLastSeen(chatUser.lastSeen)}` : 'offline'}
          </div>
        </div>
        <button onClick={() => startCall('voice')} style={iconBtn} title="Voice call"><Phone size={18} /></button>
        <button onClick={() => startCall('video')} style={iconBtn} title="Video call"><Video size={18} /></button>
        <button onClick={() => setShowActions(!showActions)} style={iconBtn} title="More">
          <span style={{ fontWeight: 700, fontSize: 18 }}>⋮</span>
        </button>
      </header>

      {showContactPrompt && (
        <div style={{
          background: '#F5FFEA', padding: '12px 16px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: 12,
          borderBottom: '1px solid #D4EDDA', animation: 'slideDown 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserPlus size={18} color={Colors.primary} />
            <span style={{ fontSize: 13, color: Colors.textPrimary }}>Not in your contacts</span>
          </div>
          <button onClick={addToContacts} style={{
            background: Colors.white, border: '1px solid #D4EDDA', borderRadius: 20,
            padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 12,
            color: Colors.primary, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
          }}>
            <UserPlus size={14} /> Save
          </button>
        </div>
      )}

      {showActions && (
        <div style={{
          position: 'absolute', top: 70, right: 12, zIndex: 100,
          background: Colors.white, borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          padding: 6, minWidth: 200, animation: 'scaleIn 0.15s ease',
        }}>
          <button onClick={() => { navigate('/contacts'); setShowActions(false); }} style={menuItem}>
            <User size={16} /> View Contact
          </button>
          {!isContact && (
            <button onClick={addToContacts} style={menuItem}>
              <UserPlus size={16} /> Add to Contacts
            </button>
          )}
          {localStorage.getItem('chatPin') && (
            <button onClick={() => {
              const lockedList = JSON.parse(localStorage.getItem('lockedChats') || '[]');
              if (lockedList.includes(uid)) unlockChat(); else lockChat();
              setShowActions(false);
            }} style={menuItem}>
              <Lock size={16} />
              {JSON.parse(localStorage.getItem('lockedChats') || '[]').includes(uid) ? 'Unlock Chat' : 'Lock Chat'}
            </button>
          )}
          <button onClick={toggleBlock} style={{ ...menuItem, color: Colors.red }}>
            {isBlocked ? <ShieldOff size={16} /> : <ShieldBan size={16} />}
            {isBlocked ? 'Unblock User' : 'Block User'}
          </button>
        </div>
      )}

      {showProfile && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
        }} onClick={() => setShowProfile(false)}>
          <div style={{
            background: Colors.white, borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480,
            padding: '24px 24px 40px', animation: 'slideUp 0.3s ease',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: Colors.textPrimary }}>Contact Info</h3>
              <button onClick={() => setShowProfile(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: chatUser?.avatar ? 'none' : `hsl(${uid * 40 % 360}, 40%, 50%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: Colors.white, fontWeight: 700, fontSize: 32, margin: '0 auto 12px',
                overflow: 'hidden',
              }}>{chatUser?.avatar ? <img src={chatUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : chatUser.username.charAt(0).toUpperCase()}</div>
              <h2 style={{ fontSize: 18, margin: 0, fontWeight: 600 }}>{chatUser.username}</h2>
              <p style={{ fontSize: 14, color: Colors.textSecondary, margin: '4px 0 0' }}>{chatUser.phoneNumber}</p>
              <p style={{ fontSize: 12, color: Colors.textHint, marginTop: 4 }}>{chatUser.status || 'Hey there! I am using WhatsApp Clone'}</p>
              <p style={{ fontSize: 11, color: Colors.textHint, marginTop: 2 }}>{chatUser.isOnline ? 'Online' : chatUser.lastSeen ? `Last seen ${formatLastSeen(chatUser.lastSeen)}` : ''}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => { startCall('voice'); setShowProfile(false); }} style={actionBtn}>
                <Phone size={18} /> Voice Call
              </button>
              <button onClick={() => { startCall('video'); setShowProfile(false); }} style={actionBtn}>
                <Video size={18} /> Video Call
              </button>
            </div>
            <button onClick={() => { toggleBlock(); setShowProfile(false); }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
              padding: '14px', marginTop: 12, background: '#FEF2F2', border: 'none', borderRadius: 12,
              color: Colors.red, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
              {isBlocked ? <ShieldOff size={18} /> : <ShieldBan size={18} />}
              {isBlocked ? 'Unblock User' : 'Block User'}
            </button>
          </div>
        </div>
      )}

      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px', position: 'relative',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='48' height='48' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M24 4 L28 12 L24 20 L20 12 Z' fill='%23D4C5B0' fill-opacity='0.12' /%3E%3C/svg%3E")`,
      }}>
        {isLoadingMessages ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{ display: 'flex', justifyContent: i % 2 ? 'flex-end' : 'flex-start', margin: '8px 0' }}>
                <div style={{ width: i % 2 ? 160 : 200, height: 40, background: Colors.lighterGrey, borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: Colors.textSecondary }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <MessageCircle size={28} color="#B0BEC5" />
            </div>
            <p style={{ fontSize: 14 }}>Send a message to start chatting</p>
            <p style={{ fontSize: 12, marginTop: 8, opacity: 0.6 }}>🔒 End-to-end encrypted</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 12, animation: 'fadeIn 0.3s' }}>
              <span style={{ background: '#E1F3FB', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: '#1C6B8C', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Info size={12} /> Messages are end-to-end encrypted
              </span>
            </div>
            {messages.map((msg, i) => (
              <div key={msg.id} style={{ animation: `fadeInUp 0.2s ease ${i * 0.02}s both` }}>
                <MessageBubble message={msg} isMine={msg.senderId === currentUser.id}
                  onLongPress={(message, pos) => { setContextMessage(message); setContextPos(pos); setShowContextMenu(true); }}
                  isReplying={replyTo?.id === msg.id}
                  isEditing={editMessage?.id === msg.id} />
              </div>
            ))}
          </>
        )}
        {isBlocked && (
          <div style={{ textAlign: 'center', padding: '20px', color: Colors.textSecondary, fontSize: 13 }}>
            <ShieldBan size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p>You have blocked this user</p>
          </div>
        )}
        {isTyping && !isBlocked && (
          <div style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, animation: 'fadeIn 0.2s' }}>
            <span style={{ display: 'flex', gap: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: Colors.textSecondary, animation: 'pulse 0.8s ease 0s infinite' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: Colors.textSecondary, animation: 'pulse 0.8s ease 0.2s infinite' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: Colors.textSecondary, animation: 'pulse 0.8s ease 0.4s infinite' }} />
            </span>
            {chatUser.username} is typing
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {showEmoji && (
        <EmojiPicker open={showEmoji} onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
      )}

      {notifPopup && (
        <NotificationPopup
          message={notifPopup.message}
          user={notifPopup.user}
          onDismiss={() => setNotifPopup(null)}
          onClick={() => {
            const targetId = notifPopup.user.id;
            setNotifPopup(null);
            if (targetId !== uid) navigate(`/chat/${targetId}`, { state: { user: notifPopup.user } });
          }}
        />
      )}

      <MessageContextMenu open={showContextMenu} onClose={() => setShowContextMenu(false)}
        onAction={handleContextAction} isMine={contextMessage?.senderId === currentUser.id}
        position={contextPos} message={contextMessage} />

      <ForwardModal open={showForward} onClose={() => { setShowForward(false); setForwardMessage(null); }} />

      {showDeleteConfirm && (
        <div onClick={() => setShowDeleteConfirm(false)} style={{
          position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: Colors.white, borderRadius: 16, padding: 24, width: 300,
            animation: 'scaleIn 0.2s ease',
          }}>
            <h3 style={{ fontSize: 17, marginBottom: 8, color: Colors.textPrimary }}>Delete Message</h3>
            <p style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 16 }}>Choose who to delete this message for</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setDeleteMode('me')} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: deleteMode === 'me' ? `2px solid ${Colors.primary}` : '2px solid #E0E0E0',
                background: deleteMode === 'me' ? '#E8F5E9' : Colors.white, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textPrimary }}>Delete for me</div>
              </button>
              <button onClick={() => setDeleteMode('all')} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: deleteMode === 'all' ? `2px solid ${Colors.primary}` : '2px solid #E0E0E0',
                background: deleteMode === 'all' ? '#E8F5E9' : Colors.white, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textPrimary }}>Delete for everyone</div>
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{
                flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                background: '#F0F2F5', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: Colors.textPrimary,
              }}>Cancel</button>
              <button onClick={handleDeleteConfirm} style={{
                flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                background: Colors.red, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: Colors.white,
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {(replyTo || editMessage) && (
        <div style={{
          background: Colors.lighterGrey, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
          borderTop: `1px solid ${Colors.border}`, animation: 'slideUp 0.15s ease',
        }}>
          <div style={{ color: editMessage ? Colors.secondary : Colors.accent, display: 'flex' }}>
            {editMessage ? <Edit3 size={16} /> : <Reply size={16} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: editMessage ? Colors.secondary : Colors.accent }}>
              {editMessage ? 'Editing' : `Replying to ${replyTo?.senderId === currentUser.id ? 'yourself' : chatUser?.username || '...'}`}
            </div>
            <div style={{ fontSize: 13, color: Colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {editMessage ? (editMessage.content || '') : (replyTo?.replyToContent || replyTo?.content || 'File/Media')}
            </div>
          </div>
          <button onClick={handleCancelReply} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.textHint, padding: 4 }}>
            <XCircle size={18} />
          </button>
        </div>
      )}

      {showVoice ? (
        <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowVoice(false)} />
      ) : !isBlocked && (
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 6, padding: '8px 10px',
          background: Colors.inputBg, zIndex: 10,
        }}>
          <input ref={fileInputRef} type="file" onChange={handleFileUpload} accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" style={{ display: 'none' }} />
          <input ref={imageInputRef} type="file" onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => fileInputRef.current?.click()} style={inputBtn} title="Attach file" disabled={uploading}>
              {uploading ? <span style={{ width: 18, height: 18, border: '2px solid #ddd', borderTopColor: Colors.primary, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Paperclip size={20} />}
            </button>
          </div>
          <div style={{ flex: 1, background: Colors.white, borderRadius: 24, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <input ref={inputRef} value={text} onChange={(e) => onType(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={editMessage ? 'Edit message...' : 'Type a message'}
              style={{
                flex: 1, border: 'none', fontSize: 15, outline: 'none',
                fontFamily: 'inherit', background: 'transparent', padding: '4px 0',
              }} />
            <button onClick={() => setShowEmoji(!showEmoji)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: showEmoji ? Colors.primary : Colors.textHint, display: 'flex' }}>
              <Smile size={20} />
            </button>
          </div>
          {text.trim() ? (
            <button onClick={() => handleSend()} style={sendBtn}><Send size={18} /></button>
          ) : (
            <button onClick={() => setShowVoice(true)} style={inputBtn}><Mic size={20} /></button>
          )}
        </div>
      )}
    </div>
  );
};

const iconBtn = {
  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10,
  cursor: 'pointer', color: Colors.white, padding: 8, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};

const inputBtn = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 8,
  color: Colors.grey, display: 'flex', borderRadius: '50%',
};

const sendBtn = {
  background: Colors.primary, border: 'none', borderRadius: '50%',
  width: 44, height: 44, cursor: 'pointer', color: Colors.white,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  boxShadow: '0 2px 8px rgba(7,94,84,0.3)',
};

const menuItem = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  padding: '11px 14px', background: 'none', border: 'none', borderRadius: 8,
  fontSize: 14, cursor: 'pointer', color: Colors.textPrimary,
};

const actionBtn = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '12px', background: '#F0F2F5', border: 'none', borderRadius: 12,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', color: Colors.textPrimary,
};

export default ChatPage;