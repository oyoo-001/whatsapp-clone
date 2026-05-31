import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Phone, Video, Users, Send, Settings, X, Check, CheckCheck,
  UserPlus, Trash2, Camera, Edit3, Shield, Info, LogOut,
  Paperclip, Smile, Mic, FileText, Image, ZoomIn, ZoomOut,
  Reply, XCircle, Forward, Link, Copy, Share2,
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useContactStore from '../stores/contactStore';
import useGroupStore from '../stores/groupStore';
import { uploadAPI, groupsAPI } from '../services/api';
import { renderTextWithLinks, extractUrls } from '../utils/links';
import LinkPreview from '../components/LinkPreview';
import { Colors } from '../styles/theme';
import EmojiPicker from '../components/EmojiPicker';
import VoiceRecorder from '../components/VoiceRecorder';
import MessageContextMenu from '../components/MessageContextMenu';
import ForwardModal from '../components/ForwardModal';
import socketService from '../services/socket';

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: Colors.white, padding: 6, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};

const overlay = {
  position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const sheet = {
  background: Colors.white, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480,
  maxHeight: '80vh', padding: '20px 24px', display: 'flex', flexDirection: 'column',
  animation: 'slideUp 0.3s ease',
};

const GroupChatPage = () => {
  const { groupId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const {
    getGroup, fetchGroups, getMessages, fetchMessages, addMessage,
    addMembers, removeMember, exitGroup, updateMemberRole, updateGroup, updateAvatar, deleteMessage,
    receiveMessage, removeMessage, markAsRead,
  } = useGroupStore();
  const { contacts, fetchContacts } = useContactStore();

  const group = state?.group || getGroup(groupId);
  const messages = getMessages(groupId);

  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const [role, setRole] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const avatarInputRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const inputRef = useRef(null);
  const typingTimeout = useRef(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [showEmoji, setShowEmoji] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [previewMsg, setPreviewMsg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [contextMessage, setContextMessage] = useState(null);
  const [contextPos, setContextPos] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showForward, setShowForward] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('me');
  const longPressTimer = useRef(null);
  const hasTriggered = useRef(false);
  const [activeGroupCall, setActiveGroupCall] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(`groupCall_${groupId}`)); } catch { return null; }
  });

  const saveGroupCall = (data) => {
    setActiveGroupCall(data);
    if (data) sessionStorage.setItem(`groupCall_${groupId}`, JSON.stringify(data));
    else sessionStorage.removeItem(`groupCall_${groupId}`);
  };

  useEffect(() => {
    if (!getGroup(groupId)) fetchGroups();
    fetchMessages(groupId);
    fetchContacts();
    markAsRead(groupId);
    groupsAPI.getGroup(groupId).then(({ data }) => setRole(data.role)).catch(() => {});

    const unsubMsg = socketService.on('group:message', ({ groupId: gId, message }) => {
      if (String(gId) !== String(groupId)) return;
      receiveMessage(gId, message);
    });

    const unsubDel = socketService.on('group:message-deleted', ({ groupId: gId, messageId }) => {
      if (String(gId) !== String(groupId)) return;
      removeMessage(gId, messageId);
    });

    const unsubTyping = socketService.on('chat:group-typing', ({ groupId: gId, from, isTyping, user }) => {
      if (String(gId) !== String(groupId)) return;
      setTypingUsers((prev) => {
        if (isTyping) return { ...prev, [from]: user?.username || 'User' };
        const next = { ...prev };
        delete next[from];
        return next;
      });
    });

    const unsubGrpUpd = socketService.on('group:updated', ({ groupId: gId }) => {
      if (String(gId) !== String(groupId)) return;
      fetchGroups();
    });
    const unsubAvatarUpd = socketService.on('group:avatar-updated', ({ groupId: gId }) => {
      if (String(gId) !== String(groupId)) return;
      fetchGroups();
    });
    const unsubRoleUpd = socketService.on('group:member-role-updated', ({ groupId: gId }) => {
      if (String(gId) !== String(groupId)) return;
      fetchGroups();
    });

    return () => { unsubMsg(); unsubDel(); unsubTyping(); unsubGrpUpd(); unsubAvatarUpd(); unsubRoleUpd(); };
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleContextAction = (action) => {
    if (!contextMessage) return;
    switch (action) {
      case 'reply':
        setReplyTo(contextMessage);
        inputRef.current?.focus();
        break;
      case 'forward':
        setForwardMessage(contextMessage);
        setShowForward(true);
        break;
      case 'delete':
        setDeleteMode('me');
        setShowDeleteConfirm(true);
        break;
    }
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleDeleteConfirm = async () => {
    if (!contextMessage) return;
    try {
      if (deleteMode === 'all') {
        await deleteMessage(groupId, contextMessage.id);
      } else {
        removeMessage(groupId, contextMessage.id);
      }
    } catch {}
    setShowDeleteConfirm(false);
    setContextMessage(null);
  };

  const isAdmin = role === 'admin';

  if (!group) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        maxWidth: 480, margin: '0 auto', width: '100%', background: Colors.white,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ color: Colors.textSecondary }}>Group not found</p>
        <button onClick={() => navigate('/')} style={{
          marginTop: 12, padding: '10px 20px', borderRadius: 10, border: 'none',
          background: Colors.primary, color: Colors.white, cursor: 'pointer', fontSize: 14,
        }}>Go Home</button>
      </div>
    );
  }

  const handleSend = () => {
    if (!text.trim()) return;
    addMessage(groupId, currentUser, text.trim(), 'text', null, replyTo);
    setText('');
    setReplyTo(null);
    socketService.emit('chat:group-typing', { groupId: Number(groupId), isTyping: false });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startCall = (callType) => {
    const channelName = `group-${groupId}-${Date.now()}`;
    const memberIds = group?.members?.map((m) => m.id || m.userId) || [];
    navigate(`/group-call/${channelName}`, {
      state: { groupName: group.name, callType, startedAt: Date.now(), memberIds, groupId },
    });
  };

  const getContactUserId = (c) => c.contactUser?.id || c.contactUserId || c.id;

  const toggleContact = (contact) => {
    const uid = getContactUserId(contact);
    setSelectedContacts((prev) =>
      prev.some((c) => getContactUserId(c) === uid)
        ? prev.filter((c) => getContactUserId(c) !== uid)
        : [...prev, contact]
    );
  };

  const handleAddMembers = async () => {
    const ids = selectedContacts.map((c) => getContactUserId(c));
    if (ids.length === 0) return;
    setAddingMembers(true);
    try {
      await addMembers(groupId, ids);
      setSelectedContacts([]);
      setShowAddMembers(false);
    } catch {}
    setAddingMembers(false);
  };

  const handleExitGroup = async () => {
    try {
      await exitGroup(groupId);
      navigate('/');
    } catch {
      alert('Failed to exit group');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!isAdmin) return;
    if (!window.confirm('Remove this member?')) return;
    try {
      await removeMember(groupId, userId);
    } catch {
      alert('Failed to remove member');
    }
  };

  const handleMakeAdmin = async (userId) => {
    if (!isAdmin) return;
    try {
      await updateMemberRole(groupId, userId);
    } catch {}
  };

  const handleRename = async () => {
    if (!editName.trim()) return;
    try {
      await updateGroup(groupId, { name: editName.trim() });
      setEditingName(false);
    } catch {}
  };

  const handleDescSave = async () => {
    try {
      await updateGroup(groupId, { description: editDesc.trim() || null });
      setEditingDesc(false);
    } catch {}
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { data } = await uploadAPI.upload(file);
      await updateAvatar(groupId, data.fileUrl);
    } catch {}
    setUploadingAvatar(false);
  };

  const [inviteCode, setInviteCode] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const handleGenerateInvite = async () => {
    try {
      const { data } = await groupsAPI.generateInvite(groupId);
      setInviteCode(data.inviteCode);
    } catch {}
  };

  const handleCopyInvite = () => {
    const link = `${window.location.origin}/group/invite/${inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  };

  const handleShareInvite = () => {
    const link = `${window.location.origin}/group/invite/${inviteCode}`;
    if (navigator.share) {
      navigator.share({ title: group.name, text: `Join "${group.name}" on TuChat`, url: link }).catch(() => {});
    } else {
      handleCopyInvite();
    }
  };

  useEffect(() => {
    if (showSettings && group?.inviteCode) {
      setInviteCode(group.inviteCode);
    } else if (showSettings && !inviteCode) {
      handleGenerateInvite();
    }
  }, [showSettings]);

  const handleDeleteMessage = async (messageId) => {
    if (!isAdmin) return;
    try {
      await deleteMessage(groupId, messageId);
    } catch {}
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setPreviewUrl(URL.createObjectURL(file));
    }
    if (e.target) e.target.value = '';
  };

  const handleCancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
  };

  const handleSendFile = async () => {
    if (!previewFile) return;
    setUploading(true);
    try {
      const { data } = await uploadAPI.upload(previewFile);
      const isImg = previewFile.type.startsWith('image/');
      const isVid = previewFile.type.startsWith('video/');
      const isAud = previewFile.type.startsWith('audio/');
      const msgType = isImg ? 'image' : isVid ? 'video' : isAud ? 'audio' : 'file';
      await addMessage(groupId, currentUser, previewFile.name, msgType, data.fileUrl);
    } catch {}
    setUploading(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
  };

  const handleEmojiSelect = (emoji, type) => {
    if (type === 'gif') {
      addMessage(groupId, currentUser, emoji, 'image', emoji);
      setShowEmoji(false);
      return;
    }
    setText((prev) => prev + emoji);
  };

  const handleVoiceSend = async (blob, duration) => {
    setUploading(true);
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      const { data } = await uploadAPI.upload(file);
      await addMessage(
        groupId, currentUser,
        `Voice note (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})`,
        'audio', data.fileUrl
      );
    } catch {}
    setUploading(false);
    setShowVoice(false);
  };

  const renderMessageContent = (msg, isMine) => {
    const isGif = msg.messageType === 'gif' || (msg.content?.startsWith('http') && msg.mimeType === 'image/gif');
    const isImage = msg.messageType === 'image' || msg.mimeType?.startsWith('image/');
    const isVideo = msg.messageType === 'video' || msg.mimeType?.startsWith('video/');
    const isAudio = msg.messageType === 'audio' || msg.mimeType?.startsWith('audio/');

    if (isGif && msg.content) {
      return (
        <img src={msg.content} alt="GIF" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, display: 'block' }} />
      );
    }
    if (isImage && msg.fileUrl) {
      return (
        <>
          <img src={msg.fileUrl} alt="Image" onClick={() => { setPreviewMsg(msg); setZoom(1); }}
            style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 6, display: 'block', cursor: 'pointer', objectFit: 'cover' }} />
          {msg.content && msg.content !== msg.fileUrl && (
            <div style={{ fontSize: 13, color: isMine ? Colors.white : Colors.textPrimary, padding: '2px 10px 6px' }}>{renderTextWithLinks(msg.content)}{(() => { const u = extractUrls(msg.content); return u.length > 0 ? <LinkPreview url={u[0]} /> : null; })()}</div>
          )}
        </>
      );
    }
    if (isVideo && msg.fileUrl) {
      return (
        <div style={{ padding: 4 }}>
          <video controls preload="metadata" style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 6, display: 'block' }}>
            <source src={msg.fileUrl} type={msg.mimeType || 'video/mp4'} />
          </video>
        </div>
      );
    }
    if (isAudio && msg.fileUrl) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', minWidth: 180 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: isMine ? 'rgba(255,255,255,0.25)' : '#E8F5E9',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Mic size={18} color={isMine ? Colors.white : Colors.primary} />
          </div>
          <audio controls preload="none" style={{ flex: 1, height: 36, minWidth: 140 }}>
            <source src={msg.fileUrl} type={msg.mimeType || 'audio/webm'} />
          </audio>
        </div>
      );
    }
    if (msg.messageType === 'file' && msg.fileUrl) {
      return (
        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: 8,
          background: isMine ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
          borderRadius: 8, textDecoration: 'none', color: 'inherit', minWidth: 160,
        }}>
          <FileText size={22} color={Colors.primary} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: Colors.textPrimary }}>
              {msg.content || 'File'}
            </div>
          </div>
        </a>
      );
    }
    if (msg.content) {
      const urls = extractUrls(msg.content);
      if (urls.length > 0) {
        return (
          <div>
            <p style={{ margin: 0, fontSize: 14, color: Colors.textPrimary, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {renderTextWithLinks(msg.content)}
            </p>
            <LinkPreview url={urls[0]} />
          </div>
        );
      }
    }
    return <p style={{ margin: 0, fontSize: 14, color: Colors.textPrimary, lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.content}</p>;
  };

  const getHue = (id) => (id * 60) % 360;

  const fmtTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const shouldShowDate = (msg, idx) => {
    if (idx === 0) return true;
    const prev = messages[idx - 1];
    return getDayStart(new Date(msg.createdAt)).getTime() !== getDayStart(new Date(prev.createdAt)).getTime();
  };

  const fmtDate = (d) => {
    const date = new Date(d);
    const now = new Date();
    const today = getDayStart(now);
    const msgDay = getDayStart(date);
    const diff = Math.round((today - msgDay) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const notInGroup = contacts.filter(
    (c) => !group.participants.some((p) => String(p.id) === String(getContactUserId(c)))
  );

  const avatarEl = (size, name, avatar, id) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: avatar ? 'none' : `hsl(${getHue(id || name.length * 30)}, 40%, 50%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: Colors.white, fontWeight: 700, fontSize: size * 0.4,
    }}>
      {avatar ? (
        <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : name?.charAt(0).toUpperCase() || '?'}
    </div>
  );

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', width: '100%', background: Colors.white,
    }}>
      <header style={{
        background: Colors.primary, padding: '10px 12px', display: 'flex',
        alignItems: 'center', gap: 8, paddingTop: 20, zIndex: 10,
      }}>
        <button onClick={() => navigate('/')} style={iconBtn}><ArrowLeft size={22} /></button>
        <div onClick={() => setShowGroupInfo(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {avatarEl(40, group.name, group.avatar, group.id)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: Colors.white, fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              {Object.keys(typingUsers).length > 0
                ? <span style={{ animation: 'pulse 1s ease infinite' }}>{Object.values(typingUsers)[0]} is typing...</span>
                : `${group.participants.length} participants`}
            </div>
          </div>
        </div>
        <button onClick={() => startCall('voice')} style={iconBtn} title="Voice call"><Phone size={18} /></button>
        <button onClick={() => startCall('video')} style={iconBtn} title="Video call"><Video size={18} /></button>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button onClick={() => setShowMenu((v) => !v)} style={iconBtn} title="More">
            <span style={{ fontWeight: 700, fontSize: 18 }}>⋮</span>
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 4, minWidth: 180,
              background: Colors.white, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              padding: '6px 0', zIndex: 100,
            }}>
              <button onClick={() => { setShowMenu(false); setShowGroupInfo(true); }} style={menuItem}>
                <Info size={18} color={Colors.textSecondary} /> Group Info
              </button>
              <button onClick={() => { setShowMenu(false); setShowMembers(true); }} style={menuItem}>
                <Users size={18} color={Colors.textSecondary} /> Members
              </button>
              {isAdmin && (
                <button onClick={() => { setShowMenu(false); setShowSettings(true); }} style={menuItem}>
                  <Settings size={18} color={Colors.textSecondary} /> Settings
                </button>
              )}
              <hr style={{ border: 'none', borderTop: '1px solid #F0F2F5', margin: '4px 0' }} />
              <button onClick={() => handleExitGroup()} style={{ ...menuItem, color: '#E53935' }}>
                <LogOut size={18} /> Exit Group
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Active group call banner */}
          {activeGroupCall && (
        <div style={{
          background: '#1B5E20', padding: '10px 16px', display: 'flex',
          alignItems: 'center', gap: 10, color: Colors.white,
        }}>
          <Phone size={16} />
          <span style={{ flex: 1, fontSize: 13 }}>
            {activeGroupCall.caller?.username || 'Someone'} started a {activeGroupCall.callType} call
          </span>
          <button onClick={() => {
            saveGroupCall(null);
            const channelName = `group-${groupId}-${Date.now()}`;
            const memberIds = group?.members?.map((m) => m.id || m.userId) || [];
            navigate(`/group-call/${channelName}`, {
              state: { groupName: group.name, callType: activeGroupCall.callType, startedAt: Date.now(), memberIds, groupId },
            });
          }} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
            padding: '6px 14px', color: Colors.white, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>Join</button>
        </div>
      )}

      {/* Group Info */}
      {showGroupInfo && (
        <div style={{ ...overlay }} onClick={() => setShowGroupInfo(false)}>
          <div {...{ onClick: (e) => e.stopPropagation(), style: { ...sheet, maxHeight: '90vh' } }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              {avatarEl(100, group.name, group.avatar, group.id)}
            </div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: Colors.textPrimary }}>{group.name}</h2>
              <p style={{ margin: 0, fontSize: 13, color: Colors.textSecondary }}>{group.participants.length} participants</p>
            </div>
            {group.description && (
              <div style={{ background: Colors.lighterGrey, borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: Colors.textPrimary, lineHeight: 1.5 }}>{group.description}</p>
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textSecondary, marginBottom: 8 }}>Members</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {group.participants.map((p) => {
                const memberRole = p.GroupMember?.role || 'member';
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid #F0F2F5' }}>
                    {avatarEl(40, p.username, p.avatar, p.id)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: Colors.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p.username}
                        {p.id === currentUser.id && <span style={{ fontSize: 11, color: Colors.textHint }}>(you)</span>}
                      </div>
                      {memberRole === 'admin' && (
                        <div style={{ fontSize: 11, color: Colors.primary, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Shield size={11} /> Admin
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowGroupInfo(false)} style={{
              marginTop: 12, padding: '12px', borderRadius: 12, border: 'none',
              background: Colors.primary, color: Colors.white, fontWeight: 600, fontSize: 15, cursor: 'pointer',
            }}>Close</button>
          </div>
        </div>
      )}

      {/* Members sheet */}
      {showMembers && (
        <div style={overlay} onClick={() => setShowMembers(false)}>
          <div {...{ onClick: (e) => e.stopPropagation(), style: sheet }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: Colors.textPrimary }}>Members ({group.participants.length})</h3>
              <button onClick={() => setShowMembers(false)}
                style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
                <X size={16} />
              </button>
            </div>
            {isAdmin && (
              <button onClick={() => { setShowMembers(false); setShowAddMembers(true); fetchContacts(); }} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: Colors.lighterGrey,
                border: 'none', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left', marginBottom: 12,
              }}>
                <UserPlus size={18} color={Colors.primary} />
                <span style={{ fontSize: 14, color: Colors.primary, fontWeight: 600 }}>Add Members</span>
              </button>
            )}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {group.participants.map((p) => {
                const memberRole = p.GroupMember?.role || 'member';
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid #F0F2F5' }}>
                    {avatarEl(40, p.username, p.avatar, p.id)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: Colors.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p.username}
                        {p.id === currentUser.id && <span style={{ fontSize: 11, color: Colors.textHint }}>(you)</span>}
                      </div>
                      {memberRole === 'admin' && (
                        <div style={{ fontSize: 11, color: Colors.primary, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Shield size={11} /> Admin
                        </div>
                      )}
                    </div>
                    {isAdmin && memberRole !== 'admin' && String(p.id) !== String(currentUser.id) && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => handleMakeAdmin(p.id)} style={{
                          background: '#E8F5E9', border: 'none', borderRadius: 8, padding: '6px 8px',
                          cursor: 'pointer', color: Colors.primary, display: 'flex',
                        }} title="Make admin">
                          <Shield size={14} />
                        </button>
                        <button onClick={() => handleRemoveMember(p.id)} style={{
                          background: '#FEE2E2', border: 'none', borderRadius: 8, padding: '6px 8px',
                          cursor: 'pointer', color: Colors.red, display: 'flex',
                        }} title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settings sheet */}
      {showSettings && isAdmin && (
        <div style={overlay} onClick={() => setShowSettings(false)}>
          <div {...{ onClick: (e) => e.stopPropagation(), style: sheet }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: Colors.textPrimary }}>Settings</h3>
              <button onClick={() => setShowSettings(false)}
                style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Change Photo */}
              <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} style={{ ...settingsBtn, opacity: uploadingAvatar ? 0.7 : 1 }}>
                {uploadingAvatar ? (
                  <span style={{ width: 16, height: 16, border: '2px solid #ddd', borderTopColor: Colors.primary, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                ) : (
                  <Camera size={18} color={Colors.textHint} />
                )}
                <span style={{ fontSize: 14, color: Colors.textPrimary }}>
                  {uploadingAvatar ? 'Uploading...' : 'Change Group Photo'}
                </span>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />

              {/* Rename */}
              {editingName ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
                    placeholder="Group name"
                    style={{
                      flex: 1, padding: '10px 14px', border: '2px solid #E9EDEF', borderRadius: 10,
                      fontSize: 14, outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary,
                    }} autoFocus />
                  <button onClick={handleRename} style={{ background: Colors.primary, border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: Colors.white, display: 'flex' }}>
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingName(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: Colors.textSecondary, display: 'flex' }}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setEditName(group.name); setEditingName(true); }} style={settingsBtn}>
                  <Edit3 size={18} color={Colors.textHint} />
                  <span style={{ fontSize: 14, color: Colors.textPrimary }}>Rename Group</span>
                </button>
              )}

              {/* Description */}
              {editingDesc ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDescSave(); } if (e.key === 'Escape') setEditingDesc(false); }}
                    placeholder="Add a group description..."
                    rows={3}
                    style={{
                      flex: 1, padding: '10px 14px', border: '2px solid #E9EDEF', borderRadius: 10,
                      fontSize: 14, outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary, resize: 'vertical',
                    }} autoFocus />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={handleDescSave} style={{ background: Colors.primary, border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: Colors.white, display: 'flex' }}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingDesc(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: Colors.textSecondary, display: 'flex' }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setEditDesc(group.description || ''); setEditingDesc(true); }} style={settingsBtn}>
                  <Info size={18} color={Colors.textHint} />
                  <span style={{ fontSize: 14, color: Colors.textPrimary }}>
                    {group.description ? 'Edit Group Description' : 'Add Group Description'}
                  </span>
                </button>
              )}

              {/* Invite Link */}
              <div style={{ padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Link size={18} color={Colors.textHint} />
                  <span style={{ fontSize: 14, color: Colors.textPrimary, fontWeight: 600 }}>Invite Link</span>
                </div>
                {inviteCode ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', background: '#F0F8FF', borderRadius: 10,
                  }}>
                    <span style={{
                      flex: 1, fontSize: 12, color: Colors.textSecondary, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {window.location.origin}/group/invite/{inviteCode}
                    </span>
                    <button onClick={handleCopyInvite} style={{ background: 'none', border: 'none', cursor: 'pointer', color: inviteCopied ? Colors.secondary : Colors.textHint, display: 'flex', padding: 4 }}>
                      {inviteCopied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button onClick={handleShareInvite} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.textHint, display: 'flex', padding: 4 }}>
                      <Share2 size={16} />
                    </button>
                  </div>
                ) : (
                  <button onClick={handleGenerateInvite} style={settingsBtn}>
                    <Link size={18} color={Colors.textHint} />
                    <span style={{ fontSize: 14, color: Colors.accent }}>Generate Invite Link</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Members sheet */}
      {showAddMembers && (
        <div style={overlay} onClick={() => setShowAddMembers(false)}>
          <div {...{ onClick: (e) => e.stopPropagation(), style: sheet }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: Colors.textPrimary }}>Add Members</h3>
              <button onClick={() => setShowAddMembers(false)}
                style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 100 }}>
              {notInGroup.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: Colors.textSecondary }}>
                  <Users size={40} color="#E9EDEF" style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 14 }}>All contacts are already in the group</p>
                </div>
              ) : notInGroup.map((c) => {
                const uid = getContactUserId(c);
                const name = c.contactUser?.username || c.username || 'User';
                const cavatar = c.contactUser?.avatar || c.avatar;
                const isSel = selectedContacts.some((s) => getContactUserId(s) === uid);
                return (
                  <div key={uid} onClick={() => toggleContact(c)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                    cursor: 'pointer', borderBottom: '0.5px solid #F0F2F5',
                  }}>
                    {avatarEl(40, name, cavatar, uid)}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: Colors.textPrimary }}>{name}</div>
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: 5, border: `2px solid ${isSel ? Colors.primary : '#D0D0D0'}`,
                      background: isSel ? Colors.primary : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {isSel && <Check size={14} color={Colors.white} />}
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedContacts.length > 0 && (
              <button onClick={handleAddMembers} disabled={addingMembers} style={{
                marginTop: 12, padding: '12px', borderRadius: 12, border: 'none',
                background: Colors.primary, color: Colors.white,
                fontWeight: 600, fontSize: 15, cursor: addingMembers ? 'default' : 'pointer',
                opacity: addingMembers ? 0.7 : 1,
              }}>
                {addingMembers ? 'Adding...' : `Add ${selectedContacts.length} member${selectedContacts.length > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Participant avatars strip */}
      <div style={{
        padding: '8px 16px', display: 'flex', gap: 6, overflowX: 'auto',
        borderBottom: '1px solid #F0F2F5',
      }}>
        {group.participants.map((p) => (
          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            {avatarEl(36, p.username, p.avatar, p.id)}
            <span style={{ fontSize: 10, color: Colors.textSecondary, maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</span>
          </div>
        ))}
        {isAdmin && (
          <button onClick={() => { setShowAddMembers(true); fetchContacts(); }} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: '#E8F5E9',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.primary,
            }}>
              <UserPlus size={16} />
            </div>
            <span style={{ fontSize: 10, color: Colors.primary }}>Add</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: Colors.chatBg, position: 'relative' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: Colors.textSecondary }}>
            <Users size={48} color="#E9EDEF" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const senderName = msg.sender?.username || msg.senderName || 'User';
          const senderId = msg.sender?.id || msg.senderId;
          return (
            <div key={msg.id} style={{ marginBottom: 8, position: 'relative' }}
              onMouseEnter={() => setHoveredMsg(msg.id)}
              onMouseLeave={() => setHoveredMsg(null)}>
              {shouldShowDate(msg, idx) && (
                <div style={{ textAlign: 'center', margin: '16px 0 12px' }}>
                  <span style={{
                    fontSize: 11, color: Colors.textHint, background: Colors.white, padding: '4px 12px',
                    borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}>{fmtDate(msg.createdAt)}</span>
                </div>
              )}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: senderId === currentUser.id ? 'flex-end' : 'flex-start',
                marginBottom: 2,
              }}>
                {senderId !== currentUser.id && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, marginLeft: 4 }}>
                    {avatarEl(20, senderName, msg.sender?.avatar, senderId)}
                    <span style={{ fontSize: 11, color: Colors.accent, fontWeight: 600 }}>{senderName}</span>
                  </div>
                )}
                <div style={{
                  position: 'relative', maxWidth: '75%', userSelect: 'none', WebkitUserSelect: 'none',
                }}
                  onMouseDown={(e) => {
                    hasTriggered.current = false;
                    longPressTimer.current = setTimeout(() => {
                      hasTriggered.current = true;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setContextMessage(msg);
                      setContextPos({ x: rect.left + rect.width / 2, y: rect.top });
                      setShowContextMenu(true);
                    }, 500);
                  }}
                  onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                  onMouseLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMessage(msg);
                    setContextPos({ x: e.clientX, y: e.clientY });
                    setShowContextMenu(true);
                  }}>
                  <div style={{
                    padding: msg.messageType === 'text' ? '8px 14px' : msg.messageType === 'audio' ? '6px 10px' : '4px',
                    borderRadius: 12,
                    background: senderId === currentUser.id ? Colors.sentMsg : Colors.receivedMsg,
                    borderBottomRightRadius: senderId === currentUser.id ? 4 : 12,
                    borderBottomLeftRadius: senderId === currentUser.id ? 12 : 4,
                    boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
                    border: replyTo?.id === msg.id ? `2px solid ${Colors.accent}` : 'none',
                    cursor: 'context-menu',
                    transition: 'border 0.15s ease',
                  }}>
                    {msg.replyToContent && (
                      <div style={{
                        borderLeft: `3px solid ${Colors.accent}`, paddingLeft: 8,
                        marginBottom: 4, marginTop: 2,
                        background: senderId === currentUser.id ? 'rgba(52,183,241,0.08)' : '#F0F7FF',
                        borderRadius: '0 4px 4px 0', padding: '4px 8px',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: Colors.accent, marginBottom: 2 }}>
                          {msg.replyToSenderId === currentUser.id ? 'You' : msg.replyToSenderName || 'User'}
                        </div>
                        <div style={{ fontSize: 12, color: Colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {msg.replyToContent}
                        </div>
                      </div>
                    )}
                    {renderMessageContent(msg, senderId === currentUser.id)}
                    <div style={{ fontSize: 10, color: Colors.textHint, textAlign: 'right', marginTop: msg.messageType === 'text' ? 2 : 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                      {fmtTime(msg.createdAt)}
                      {senderId === currentUser.id && (
                        msg._sending ? (
                          <span style={{ width: 12, height: 12, borderRadius: '50%', display: 'inline-block', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: Colors.textHint, animation: 'spin 0.7s linear infinite' }} />
                        ) : msg.isRead
                          ? <CheckCheck size={14} color={Colors.accent} />
                          : msg.isDelivered
                            ? <CheckCheck size={14} color={Colors.textHint} />
                            : <Check size={14} color={Colors.textHint} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {previewMsg && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <button onClick={() => { setPreviewMsg(null); setZoom(1); }} style={{
              position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer',
              color: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)', zIndex: 10,
            }}>
              <X size={22} />
            </button>
            <div style={{
              position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 12, background: 'rgba(0,0,0,0.6)', padding: '8px 16px',
              borderRadius: 24, backdropFilter: 'blur(8px)', zIndex: 10,
            }}>
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: Colors.white, padding: 4, display: 'flex',
              }}>
                <ZoomOut size={20} />
              </button>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: '40px', minWidth: 40, textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: Colors.white, padding: 4, display: 'flex',
              }}>
                <ZoomIn size={20} />
              </button>
            </div>
            <div onClick={() => setPreviewMsg(null)} style={{ position: 'absolute', inset: 0, cursor: 'pointer' }} />
            <img src={previewMsg.fileUrl} alt="Preview"
              style={{
                maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain',
                transform: `scale(${zoom})`, transition: 'transform 0.2s ease',
                zIndex: 2, cursor: 'zoom-in',
              }}
              onClick={(e) => { e.stopPropagation(); setZoom((z) => z >= 2 ? 1 : z + 0.5); }} />
          </div>
        )}
        {Object.keys(typingUsers).length > 0 && (
          <div style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, animation: 'fadeIn 0.2s' }}>
            <span style={{ display: 'flex', gap: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: Colors.textSecondary, animation: 'pulse 0.8s ease 0s infinite' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: Colors.textSecondary, animation: 'pulse 0.8s ease 0.2s infinite' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: Colors.textSecondary, animation: 'pulse 0.8s ease 0.4s infinite' }} />
            </span>
            {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageContextMenu open={showContextMenu} onClose={() => setShowContextMenu(false)}
        onAction={handleContextAction} isMine={contextMessage?.sender?.id === currentUser.id || contextMessage?.senderId === currentUser.id}
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
              {contextMessage?.sender?.id === currentUser.id && (
                <button onClick={() => setDeleteMode('all')} style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: deleteMode === 'all' ? `2px solid ${Colors.primary}` : '2px solid #E0E0E0',
                  background: deleteMode === 'all' ? '#E8F5E9' : Colors.white, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textPrimary }}>Delete for everyone</div>
                </button>
              )}
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

      {replyTo && (
        <div style={{
          background: Colors.lighterGrey, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
          borderTop: `1px solid ${Colors.border}`, animation: 'slideUp 0.15s ease',
        }}>
          <div style={{ color: Colors.accent, display: 'flex' }}>
            <Reply size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: Colors.accent }}>
              Replying to {replyTo?.sender?.id === currentUser.id || replyTo?.senderId === currentUser.id
                ? 'yourself'
                : replyTo?.sender?.username || replyTo?.senderName || 'User'}
            </div>
            <div style={{ fontSize: 13, color: Colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyTo?.replyToContent || replyTo?.content || 'File/Media'}
            </div>
          </div>
          <button onClick={handleCancelReply} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.textHint, padding: 4 }}>
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* File preview bar */}
      {previewFile && (
        <div style={{
          background: Colors.chatBg, padding: '8px 12px', display: 'flex',
          alignItems: 'center', gap: 10, borderTop: `1px solid ${Colors.border}`,
          animation: 'slideUp 0.15s ease',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, overflow: 'hidden',
            background: '#E8E8E8', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            {previewFile.type.startsWith('image/') ? (
              <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : previewFile.type.startsWith('video/') ? (
              <video src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Paperclip size={20} color={Colors.textHint} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {previewFile.name}
            </div>
            <div style={{ fontSize: 11, color: Colors.textHint }}>
              {(previewFile.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <button onClick={handleCancelPreview} disabled={uploading} style={{ background: 'none', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', color: Colors.textHint, padding: 4, display: 'flex' }}>
            <X size={18} />
          </button>
          <button onClick={handleSendFile} disabled={uploading} style={{
            background: uploading ? Colors.textHint : Colors.primary, border: 'none', borderRadius: '50%',
            width: 38, height: 38, cursor: uploading ? 'not-allowed' : 'pointer', color: Colors.white,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {uploading ? (
              <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: Colors.white, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      )}

      {/* Emoji picker */}
      <EmojiPicker open={showEmoji} onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />

      {/* Voice recorder */}
      {showVoice && (
        <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowVoice(false)} />
      )}

      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 6, padding: '8px 10px',
        background: Colors.inputBg, zIndex: 10,
      }}>
        <input ref={fileInputRef} type="file" onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" style={{ display: 'none' }} />
        <input ref={imageInputRef} type="file" onChange={handleFileSelect}
          accept="image/*" style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={() => fileInputRef.current?.click()} style={inputBtn} title="Attach file" disabled={uploading}>
            {uploading ? (
              <span style={{ width: 18, height: 18, border: '2px solid #ddd', borderTopColor: Colors.primary, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <Paperclip size={20} />
            )}
          </button>
        </div>
        <div style={{ flex: 1, background: Colors.white, borderRadius: 24, padding: '2px 14px', display: 'flex', alignItems: 'flex-end', gap: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <textarea ref={inputRef} value={text} onChange={(e) => {
            const val = e.target.value;
            setText(val);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            socketService.emit('chat:group-typing', { groupId: Number(groupId), isTyping: val.length > 0 });
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => {
              socketService.emit('chat:group-typing', { groupId: Number(groupId), isTyping: false });
            }, 2000);
          }} onKeyDown={handleKeyDown} rows={1}
            placeholder="Type a message..."
            style={{
              flex: 1, border: 'none', fontSize: 15, outline: 'none',
              fontFamily: 'inherit', background: 'transparent', padding: '8px 0',
              resize: 'none', maxHeight: 120, lineHeight: '20px', overflowY: 'auto',
            }} />
          <button onClick={() => setShowEmoji(!showEmoji)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: showEmoji ? Colors.primary : Colors.textHint, display: 'flex', marginBottom: 6 }}>
            <Smile size={20} />
          </button>
        </div>
        {text.trim() ? (
          <button onClick={handleSend} style={sendBtn}><Send size={18} /></button>
        ) : (
          !previewFile && (
            <button onClick={() => setShowVoice(true)} style={inputBtn} title="Voice note">
              <Mic size={20} />
            </button>
          )
        )}
      </div>
    </div>
  );
};

const inputBtn = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: Colors.textHint,
};

const sendBtn = {
  width: 44, height: 44, borderRadius: '50%', border: 'none',
  background: Colors.primary, cursor: 'pointer', color: Colors.white,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const menuItem = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
  border: 'none', background: 'none', cursor: 'pointer', width: '100%',
  fontSize: 14, color: Colors.textPrimary, textAlign: 'left',
};

const settingsBtn = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
  background: Colors.lighterGrey, border: 'none', borderRadius: 10,
  cursor: 'pointer', width: '100%', textAlign: 'left',
};

export default GroupChatPage;
