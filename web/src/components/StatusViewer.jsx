import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Trash2, Eye, MessageCircle } from 'lucide-react';
import { Colors } from '../styles/theme';
import useStatusStore from '../stores/statusStore';
import useAuthStore from '../stores/authStore';
import { statusAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { renderTextWithLinks, extractUrls } from '../utils/links';
import LinkPreview from './LinkPreview';

const STATUS_COLORS = [
  '#075E54', '#128C7E', '#25D366', '#34B7F1',
  '#E53935', '#FB8C00', '#8E24AA', '#3949AB',
  '#00ACC1', '#43A047', '#6D4C41', '#546E7A',
];

const StatusViewer = ({ statusGroup, onClose, initialIndex = 0 }) => {
  const { deleteStatus } = useStatusStore();
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [showViewers, setShowViewers] = useState(false);
  const timerRef = useRef(null);
  const viewedRef = useRef(new Set());

  const statuses = statusGroup?.statuses || [];
  const current = statuses[currentIndex];
  const isOwner = current?.userId === currentUser?.id;

  const duration = current?.mediaType === 'video' ? 15000 : 5000;

  const loadViewers = useCallback(async () => {
    if (!current?.id || !isOwner) return;
    try {
      const { data } = await statusAPI.getViewers(current.id);
      setViewers(data.viewers || []);
    } catch {}
  }, [current?.id, isOwner]);

  useEffect(() => {
    loadViewers();
  }, [loadViewers]);

  useEffect(() => {
    if (current?.id && !isOwner && !viewedRef.current.has(current.id)) {
      viewedRef.current.add(current.id);
      statusAPI.viewStatus(current.id).catch(() => {});
    }
  }, [current?.id, isOwner]);

  const advance = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(i => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, statuses.length, onClose]);

  useEffect(() => {
    setProgress(0);
    if (paused) return;

    const interval = 50;
    const step = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timerRef.current);
          advance();
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, paused, duration, advance]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setProgress(0);
    }
  };

  const handleNext = () => {
    advance();
  };

  const handleDelete = async () => {
    if (!current) return;
    await deleteStatus(current.id);
    if (statuses.length <= 1) {
      onClose();
    } else {
      setCurrentIndex(i => Math.min(i, statuses.length - 2));
    }
  };

  if (!current) return null;

  const bgColor = current.backgroundColor || STATUS_COLORS[currentIndex % STATUS_COLORS.length];

  if (showViewers) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100001,
        background: '#000', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px', paddingTop: 40 }}>
          <button onClick={() => setShowViewers(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff', padding: 8, display: 'flex' }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Viewed by ({viewers.length})</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {viewers.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 40, fontSize: 14 }}>No views yet</p>
          ) : (
            viewers.map((v) => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: v.avatar ? 'none' : `hsl(${((v.id || 0) * 40) % 360}, 45%, 45%)`,
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0,
                }}>
                  {v.avatar ? <img src={v.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : v.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <span style={{ color: '#fff', fontSize: 14, flex: 1 }}>{v.username || 'Unknown'}</span>
                <button onClick={() => { onClose(); navigate(`/chat/${v.id}`, { state: { user: v } }); }}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <MessageCircle size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', gap: 4, padding: '8px 8px 0', zIndex: 10 }}>
        {statuses.map((s, i) => (
          <div key={s.id} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: '#fff',
              width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
            }} />
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: statusGroup?.user?.avatar ? 'none' : `hsl(${((statusGroup?.user?.id || 0) * 40) % 360}, 45%, 45%)`,
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 16, border: '2px solid rgba(255,255,255,0.5)',
          }}>
            {statusGroup?.user?.avatar ? (
              <img src={statusGroup.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              statusGroup?.user?.username?.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{statusGroup?.user?.username || 'Unknown'}</span>
          {isOwner && viewers.length > 0 && (
            <button onClick={() => setShowViewers(true)} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 20,
              padding: '4px 12px', cursor: 'pointer', color: '#fff', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Eye size={14} /> {viewers.length}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isOwner && (
            <button onClick={handleDelete} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <X size={20} />
          </button>
        </div>
      </div>

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', position: 'relative',
        userSelect: 'none',
      }}>
        {current.mediaType === 'video' && current.mediaUrl ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video src={current.mediaUrl} autoPlay loop={paused} muted
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            {current.content && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 20px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
                <p style={{ color: '#fff', fontSize: 16, textAlign: 'center', margin: 0, wordBreak: 'break-word' }}>
                  {renderTextWithLinks(current.content)}
                </p>
                {(() => { const u = extractUrls(current.content); return u.length > 0 ? <LinkPreview url={u[0]} /> : null; })()}
              </div>
            )}
          </div>
        ) : current.mediaType === 'audio' && current.mediaUrl ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              {paused ? <Play size={48} color="#fff" /> : <Pause size={48} color="#fff" />}
            </div>
            <audio src={current.mediaUrl} autoPlay controls={false}
              ref={(el) => { if (el) { el.loop = false; } }} />
            <p style={{ color: '#fff', fontSize: 16, margin: 0 }}>Audio Status</p>
            {current.content && (
              <p style={{ color: '#fff', fontSize: 14, marginTop: 8, wordBreak: 'break-word' }}>
                {renderTextWithLinks(current.content)}
              </p>
            )}
            {(() => { const u = extractUrls(current.content); return u.length > 0 ? <LinkPreview url={u[0]} /> : null; })()}
          </div>
        ) : current.mediaType === 'image' && current.mediaUrl ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={current.mediaUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            {current.content && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 20px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
                <p style={{ color: '#fff', fontSize: 16, textAlign: 'center', margin: 0, wordBreak: 'break-word' }}>
                  {renderTextWithLinks(current.content)}
                </p>
                {(() => { const u = extractUrls(current.content); return u.length > 0 ? <LinkPreview url={u[0]} /> : null; })()}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: bgColor, padding: 40,
          }}>
            <p style={{
              color: '#fff', fontSize: 28, fontWeight: 600, textAlign: 'center',
              lineHeight: 1.5, margin: 0, wordBreak: 'break-word',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
              {renderTextWithLinks(current.content || 'Status')}
            </p>
            {(() => { const u = extractUrls(current.content); return u.length > 0 ? <LinkPreview url={u[0]} /> : null; })()}
          </div>
        )}

        {currentIndex > 0 && (
          <button onClick={handlePrev} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 5 }}>
            <ChevronLeft size={24} />
          </button>
        )}
        {currentIndex < statuses.length - 1 && (
          <button onClick={handleNext} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 5 }}>
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      <div style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>{current.createdAt ? new Date(current.createdAt).toLocaleString() : ''}</span>
        {!isOwner && (
          <button onClick={() => {
            onClose();
            const targetUser = statusGroup?.user;
            if (targetUser) {
              navigate(`/chat/${targetUser.id}`, { state: { user: targetUser } });
            }
          }} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 20,
            padding: '6px 14px', cursor: 'pointer', color: '#fff', fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <MessageCircle size={14} /> Reply
          </button>
        )}
      </div>
    </div>
  );
};

export default StatusViewer;
