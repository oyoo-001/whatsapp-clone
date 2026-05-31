import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Radio, Users, Plus, X, Send, Share2, Settings,
  Copy, Check, Trash2, Link, Edit3, Camera, BadgeCheck,
} from 'lucide-react';
import { Colors } from '../styles/theme';
import useChannelStore from '../stores/channelStore';
import useAuthStore from '../stores/authStore';
import { channelsAPI, uploadAPI } from '../services/api';
import { renderTextWithLinks, extractUrls } from '../utils/links';
import LinkPreview from '../components/LinkPreview';

const ChannelPage = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { channels, followChannel, unfollowChannel } = useChannelStore();
  const [channel, setChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    const existing = channels.find(ch => String(ch.id) === String(channelId));
    if (existing) setChannel(existing);
    loadChannel();
    loadPosts();
  }, [channelId]);

  const loadChannel = async () => {
    try {
      const { data } = await channelsAPI.getChannel(channelId);
      setChannel(data.channel);
    } catch {}
  };

  const loadPosts = async () => {
    try {
      const { data } = await channelsAPI.getPosts(channelId);
      setPosts(data.posts || []);
    } catch {}
  };

  const handleToggleFollow = async () => {
    if (!channel) return;
    try {
      if (channel.isFollowing) {
        await unfollowChannel(channelId);
      } else {
        await followChannel(channelId);
      }
      setChannel(prev => ({ ...prev, isFollowing: !prev.isFollowing }));
    } catch {}
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    try {
      const { data } = await channelsAPI.createPost(channelId, { content: postContent.trim() });
      setPosts(prev => [...prev, data.post]);
      setPostContent('');
      setShowCreatePost(false);
    } catch {}
  };

  const handleUpdate = async () => {
    try {
      const { data } = await channelsAPI.updateChannel(channelId, {
        name: editName.trim() || channel.name,
        description: editDesc.trim() || null,
      });
      setChannel(prev => ({ ...prev, ...data.channel }));
      setEditingName(false);
      setEditingDesc(false);
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await channelsAPI.deleteChannel(channelId);
      navigate('/');
    } catch {}
  };

  const getLink = () => {
    const code = channel.inviteCode;
    return code ? `${window.location.origin}/channel/invite/${code}` : null;
  };

  const ensureInviteCode = async () => {
    if (channel.inviteCode) return channel.inviteCode;
    try {
      const { data } = await channelsAPI.regenerateInvite(channelId);
      setChannel(prev => ({ ...prev, inviteCode: data.inviteCode }));
      return data.inviteCode;
    } catch { return null; }
  };

  const handleCopyLink = async () => {
    const code = await ensureInviteCode();
    if (!code) return;
    const link = `${window.location.origin}/channel/invite/${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { data } = await uploadAPI.upload(file);
      const { data: updated } = await channelsAPI.updateChannel(channelId, { avatar: data.fileUrl });
      setChannel(prev => ({ ...prev, ...updated.channel }));
    } catch {}
    setUploadingAvatar(false);
    if (e.target) e.target.value = '';
  };

  const handleRegenerateInvite = async () => {
    try {
      const { data } = await channelsAPI.regenerateInvite(channelId);
      setChannel(prev => ({ ...prev, inviteCode: data.inviteCode }));
    } catch {}
  };

  const handleShare = async () => {
    const code = await ensureInviteCode();
    if (!code) return;
    const link = `${window.location.origin}/channel/invite/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: channel.name, text: `Join my channel "${channel.name}" on TuChat`, url: link });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  if (!channel) return null;

  const isOwner = channel.isOwner || channel.createdBy === user?.id;

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', width: '100%',
      background: Colors.white, position: 'relative',
      boxShadow: '0 0 40px rgba(0,0,0,0.06)',
    }}>
      <header style={{
        background: Colors.primary, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        paddingTop: 20,
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, cursor: 'pointer', color: Colors.white, padding: 8, display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: '#E8F5E9',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          overflow: 'hidden', position: 'relative',
        }}>
          {channel.avatar ? (
            <img src={channel.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Radio size={22} color={Colors.primary} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: Colors.white, display: 'flex', alignItems: 'center', gap: 4 }}>
            {channel.name}
            {channel.isVerified && <BadgeCheck size={16} color={Colors.accent} />}
          </h2>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
            {channel.followerCount || 0} followers
          </span>
        </div>
        {isOwner ? (
          <button onClick={() => { setEditName(channel.name); setEditDesc(channel.description || ''); setShowSettings(true); }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, cursor: 'pointer', color: Colors.white, padding: 8, display: 'flex' }}>
            <Settings size={20} />
          </button>
        ) : (
          <button onClick={handleToggleFollow} style={{
            padding: '8px 16px', borderRadius: 20, border: 'none',
            background: channel.isFollowing ? 'rgba(255,255,255,0.2)' : Colors.secondary,
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {channel.isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {channel.description && (
          <p style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 16, textAlign: 'center' }}>
            {channel.description}
          </p>
        )}

        {/* Share link section */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', background: '#F0F8FF', borderRadius: 12, marginBottom: 16,
        }}>
          <Link size={16} color={Colors.accent} />
          <span style={{
            flex: 1, fontSize: 13, color: Colors.textSecondary, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {channel.inviteCode ? `${window.location.origin}/channel/invite/${channel.inviteCode}` : 'Generating invite link...'}
          </span>
          <button onClick={handleCopyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? Colors.secondary : Colors.textHint, display: 'flex', padding: 4 }}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.textHint, display: 'flex', padding: 4 }}>
            <Share2 size={16} />
          </button>
        </div>

        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: Colors.textSecondary }}>
            <Radio size={48} color="#E9EDEF" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14 }}>No posts yet</p>
            {isOwner && <p style={{ fontSize: 12, marginTop: 4 }}>Create your first post</p>}
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} style={{
              padding: '14px 16px', background: Colors.lighterGrey,
              borderRadius: 12, marginBottom: 10,
            }}>
              <div style={{ fontSize: 12, color: Colors.textHint, marginBottom: 6 }}>
                {new Date(post.createdAt).toLocaleString()}
              </div>
              <p style={{ margin: 0, fontSize: 15, color: Colors.textPrimary, lineHeight: 1.5 }}>
                {renderTextWithLinks(post.content)}
              </p>
              {(() => { const u = extractUrls(post.content); return u.length > 0 ? <LinkPreview url={u[0]} /> : null; })()}
              {post.fileUrl && (
                post.messageType === 'image' ? (
                  <img src={post.fileUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }} />
                ) : post.messageType === 'video' ? (
                  <video src={post.fileUrl} controls style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }} />
                ) : null
              )}
            </div>
          ))
        )}
      </div>

      {isOwner && (
        <>
          {showCreatePost ? (
            <div style={{
              padding: '12px 16px', borderTop: '1px solid #E9EDEF',
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <input value={postContent} onChange={(e) => setPostContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreatePost(); }}
                placeholder="Write a post..."
                autoFocus
                style={{
                  flex: 1, padding: '10px 14px', border: '2px solid #E9EDEF', borderRadius: 24,
                  fontSize: 14, outline: 'none', fontFamily: 'inherit',
                }} />
              <button onClick={handleCreatePost} disabled={!postContent.trim()}
                style={{
                  width: 42, height: 42, borderRadius: '50%', border: 'none',
                  background: !postContent.trim() ? '#E9EDEF' : Colors.primary,
                  cursor: !postContent.trim() ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}>
                <Send size={18} />
              </button>
              <button onClick={() => setShowCreatePost(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.textHint }}>
                <X size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowCreatePost(true)} style={{
              position: 'absolute', bottom: 24, right: 24,
              width: 56, height: 56, borderRadius: '50%',
              background: Colors.secondary, border: 'none',
              cursor: 'pointer', color: Colors.white,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
            }}>
              <Plus size={24} />
            </button>
          )}
        </>
      )}

      {/* Settings sheet */}
      {showSettings && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setShowSettings(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: Colors.white, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480,
            maxHeight: '80vh', padding: '20px 24px', display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: Colors.textPrimary }}>Channel Settings</h3>
              <button onClick={() => setShowSettings(false)}
                style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarUpload} style={{ display: 'none' }} />
              <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} style={{
                display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none',
                padding: '10px 0', cursor: uploadingAvatar ? 'default' : 'pointer', textAlign: 'left', width: '100%',
              }}>
                <Camera size={18} color={Colors.textHint} />
                <span style={{ fontSize: 14, color: Colors.textPrimary }}>
                  {uploadingAvatar ? 'Uploading...' : channel.avatar ? 'Change Photo' : 'Add Photo'}
                </span>
              </button>

              {editingName ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') setEditingName(false); }}
                    placeholder="Channel name"
                    style={{
                      flex: 1, padding: '10px 14px', border: '2px solid #E9EDEF', borderRadius: 10,
                      fontSize: 14, outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary,
                    }} autoFocus />
                  <button onClick={handleUpdate} style={{ background: Colors.primary, border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: Colors.white, display: 'flex' }}>
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingName(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: Colors.textSecondary, display: 'flex' }}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setEditName(channel.name); setEditingName(true); }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none',
                  padding: '10px 0', cursor: 'pointer', textAlign: 'left', width: '100%',
                }}>
                  <Edit3 size={18} color={Colors.textHint} />
                  <span style={{ fontSize: 14, color: Colors.textPrimary }}>Rename Channel</span>
                </button>
              )}

              {editingDesc ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdate(); } if (e.key === 'Escape') setEditingDesc(false); }}
                    placeholder="Add a description..."
                    rows={3}
                    style={{
                      flex: 1, padding: '10px 14px', border: '2px solid #E9EDEF', borderRadius: 10,
                      fontSize: 14, outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary, resize: 'vertical',
                    }} autoFocus />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={handleUpdate} style={{ background: Colors.primary, border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: Colors.white, display: 'flex' }}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingDesc(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: Colors.textSecondary, display: 'flex' }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setEditDesc(channel.description || ''); setEditingDesc(true); }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none',
                  padding: '10px 0', cursor: 'pointer', textAlign: 'left', width: '100%',
                }}>
                  <Edit3 size={18} color={Colors.textHint} />
                  <span style={{ fontSize: 14, color: Colors.textPrimary }}>
                    {channel.description ? 'Edit Description' : 'Add Description'}
                  </span>
                </button>
              )}

              <button onClick={handleRegenerateInvite} style={{
                display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none',
                padding: '10px 0', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <Link size={18} color={Colors.textHint} />
                <span style={{ fontSize: 14, color: Colors.textPrimary }}>Reset Invite Link</span>
              </button>

              <button onClick={() => setShowDeleteConfirm(true)} style={{
                display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none',
                padding: '10px 0', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <Trash2 size={18} color={Colors.red} />
                <span style={{ fontSize: 14, color: Colors.red }}>Delete Channel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowDeleteConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: Colors.white, borderRadius: 20, padding: '32px 28px 24px',
            width: 320, animation: 'scaleIn 0.2s ease', textAlign: 'center',
          }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#FFF0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={28} color={Colors.red} />
            </div>
            <h3 style={{ fontSize: 18, margin: '0 0 4px', color: Colors.textPrimary, fontWeight: 600 }}>Delete channel?</h3>
            <p style={{ fontSize: 13, color: Colors.textSecondary, margin: '0 0 24px', lineHeight: 1.5 }}>
              This will delete <strong style={{ color: Colors.textPrimary }}>{channel.name}</strong> and all its posts. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{
                flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #E0E0E0',
                background: Colors.white, color: Colors.textPrimary, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleDelete} style={{
                flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                background: Colors.red, color: Colors.white, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelPage;
