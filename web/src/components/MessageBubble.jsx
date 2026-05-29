import { useState, useRef } from 'react';
import { FileText, Mic, Image, X, Check, CheckCheck, Reply, Edit3, ZoomIn, ZoomOut, Verified } from 'lucide-react';
import { Colors } from '../styles/theme';

const MessageBubble = ({ message, isMine, onLongPress, onReply, isReplying, isEditing, onRetry }) => {
  const [imgError, setImgError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [zoom, setZoom] = useState(1);
  const longPressTimer = useRef(null);
  const hasTriggered = useRef(false);

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getFileIcon = () => <FileText size={22} color={Colors.primary} />;

  // Replaced separated const with functions using conditional checks
  const renderContent = () => {
    if (message.isDeleted) {
      return <span style={{ fontStyle: 'italic', opacity: 0.5, fontSize: 13 }}>This message was deleted</span>;
    }

    const isGif = message.messageType === 'gif' || (message.content?.startsWith('http') && (message.content?.includes('giphy.com') || message.content?.includes('media') || message.mimeType === 'image/gif'));

    if (isGif || (message.content?.startsWith('http') && message.mimeType === 'image/gif')) {
      return (
        <img src={message.content} alt="GIF" style={{
          maxWidth: '100%', maxHeight: 200, borderRadius: 6, display: 'block',
        }} />
      );
    }

    const isImage = message.messageType === 'image' || message.mimeType?.startsWith('image/');
    const isVideo = message.messageType === 'video' || message.mimeType?.startsWith('video/');
    const isAudio = message.messageType === 'audio' || message.mimeType?.startsWith('audio/');

    if (isImage && message.fileUrl) {
      if (imgError) {
        return <div style={{ padding: '20px', textAlign: 'center', color: Colors.textHint, fontSize: 13 }}>
          <Image size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
          <p>Image failed to load</p>
        </div>;
      }
      return (
        <>
          <img src={message.fileUrl} alt="Image" onClick={() => setShowPreview(true)}
            onError={() => setImgError(true)}
            style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 6, display: 'block', cursor: 'pointer', objectFit: 'cover' }} />
          {showPreview && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <button onClick={() => { setShowPreview(false); setZoom(1); }} style={{
                position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer',
                color: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)', zIndex: 10, transition: 'background 0.2s',
              }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
                <X size={22} />
              </button>
              <div style={{
                position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 12, background: 'rgba(0,0,0,0.6)', padding: '8px 16px',
                borderRadius: 24, backdropFilter: 'blur(8px)', zIndex: 10,
              }}>
                <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} style={zoomBtnStyle}>
                  <ZoomOut size={20} />
                </button>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: '40px', minWidth: 40, textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))} style={zoomBtnStyle}>
                  <ZoomIn size={20} />
                </button>
              </div>
              <div onClick={() => setShowPreview(false)} style={{
                position: 'absolute', inset: 0, cursor: 'pointer',
              }} />
              <img src={message.fileUrl} alt="Preview"
                style={{
                  maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain',
                  transform: `scale(${zoom})`, transition: 'transform 0.2s ease',
                  zIndex: 2, cursor: 'zoom-in',
                }}
                onClick={(e) => { e.stopPropagation(); setZoom((z) => z >= 2 ? 1 : z + 0.5); }} />
            </div>
          )}
        </>
      );
    }

    if (isVideo && message.fileUrl) {
      return (
        <video controls preload="metadata" style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 6, display: 'block' }}>
          <source src={message.fileUrl} type={message.mimeType || 'video/mp4'} />
        </video>
      );
    }

    if (isAudio && message.fileUrl) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', minWidth: 180 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: isMine ? 'rgba(255,255,255,0.25)' : '#E8F5E9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic size={18} color={isMine ? Colors.white : Colors.primary} />
          </div>
          <audio controls preload="none" style={{ flex: 1, height: 36, minWidth: 140 }}>
            <source src={message.fileUrl} type={message.mimeType || 'audio/webm'} />
          </audio>
          {message.fileSize && <span style={{ fontSize: 11, opacity: 0.6, whiteSpace: 'nowrap' }}>{formatSize(message.fileSize)}</span>}
        </div>
      );
    }

    if (message.messageType === 'file' && message.fileUrl) {
      return (
        <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px',
          background: isMine ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
          borderRadius: 8, textDecoration: 'none', color: 'inherit', minWidth: 160,
        }}>
          {getFileIcon()}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message.content || 'File'}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{message.mimeType} {formatSize(message.fileSize)}</div>
          </div>
        </a>
      );
    }

    if (message.messageType === 'contact') {
      return <div>{message.content}</div>;
    }

    if (message.content) {
      return message.content;
    }

    return null;
  };

  const handleMouseDown = (e) => {
    hasTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      hasTriggered.current = true;
      const rect = e.currentTarget.getBoundingClientRect();
      onLongPress?.(message, { x: rect.left + rect.width / 2, y: rect.top });
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    onLongPress?.(message, { x: e.clientX, y: e.clientY });
  };

  const borderColor = isReplying
    ? `2px solid ${Colors.accent}`
    : isEditing
      ? `2px solid ${Colors.secondary}`
      : 'none';

  return (
    <div style={{
      display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
      margin: '2px 0', paddingLeft: isMine ? 48 : 0, paddingRight: isMine ? 0 : 48,
    }}>
      <div onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{
          maxWidth: '75%',
          padding: message.fileUrl && !message.content && !message.isDeleted ? '3px' : '6px 12px 5px',
          borderRadius: '8px',
          background: message.isDeleted ? '#F5F5F5' : isMine ? Colors.sentMsg : Colors.receivedMsg,
          borderBottomRightRadius: isMine ? 4 : 8,
          borderBottomLeftRadius: isMine ? 8 : 4,
          boxShadow: '0 1px 1px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
          border: borderColor,
          cursor: 'context-menu',
          transition: 'border 0.15s ease',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}>
         {message.replyToContent && (
           <div style={{
             borderLeft: `3px solid ${Colors.accent}`, paddingLeft: 8,
             marginBottom: 4, marginTop: 2,
             background: isMine ? 'rgba(52,183,241,0.08)' : '#F0F7FF',
             borderRadius: '0 4px 4px 0', padding: '4px 8px',
           }}>
             <div style={{ fontSize: 11, fontWeight: 600, color: Colors.accent, marginBottom: 2 }}>
               <Reply size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
               Reply
             </div>
             <div style={{ fontSize: 12, color: Colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
               {message.replyToContent}
             </div>
           </div>
         )}
         {message.isBroadcast && !message.isDeleted && (
           <div style={{ fontSize: 11, color: Colors.accent, fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
             <Verified size={12} color={Colors.accent} style={{ flexShrink: 0 }} />
             Broadcast
           </div>
         )}
        {message.isForwarded && !message.isDeleted && (
          <div style={{ fontSize: 11, color: Colors.textHint, fontWeight: 500, marginBottom: 2 }}>
            Forwarded
          </div>
        )}
        <div style={{
          fontSize: 14.5, lineHeight: '20px', wordBreak: 'break-word',
          color: message.isDeleted ? Colors.textHint : Colors.textPrimary, whiteSpace: 'pre-wrap',
        }}>
          {renderContent()}
        </div>
        {(message.content && (message.fileUrl || message.messageType !== 'text')) ? (
          <div style={{ marginTop: 4 }} />
        ) : null}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          marginTop: message.content || message.messageType === 'audio' ? 1 : 4, gap: 3, float: 'right', marginLeft: 8,
        }}>
          {message.isEdited && !message.isDeleted && (
            <Edit3 size={11} color={Colors.textHint} style={{ marginRight: 2 }} />
          )}
          <span style={{ fontSize: 11, color: Colors.textHint }}>
            {formatTime(message.createdAt)}
          </span>
          {isMine && !message.isDeleted && (
            message._sending ? (
              <span style={{ fontSize: 10, color: Colors.textHint, display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
                  border: '2px solid rgba(0,0,0,0.1)', borderTopColor: Colors.textHint,
                  animation: 'spin 0.7s linear infinite',
                }} />
              </span>
            ) : message._failed ? (
              <span onClick={(e) => { e.stopPropagation(); onRetry?.(message); }}
                style={{ fontSize: 10, color: Colors.red, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                title="Failed — tap to retry">
                <span style={{ fontWeight: 700, fontSize: 13 }}>!</span>
              </span>
            ) : message._offline ? (
              <span style={{ fontSize: 10, color: Colors.textHint }}>pending</span>
            ) : message.isRead
              ? <CheckCheck size={14} color={Colors.accent} />
              : message.isDelivered
                ? <CheckCheck size={14} color={Colors.textHint} />
                : <Check size={14} color={Colors.textHint} />
          )}
        </div>
      </div>
    </div>
  );
};

const zoomBtnStyle = {
  width: 40, height: 40, borderRadius: '50%', border: 'none',
  background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.2s',
};

export default MessageBubble;