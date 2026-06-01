import { useState, useRef } from 'react';
import { X, Image, Video, Mic, Type, Camera } from 'lucide-react';
import { Colors } from '../styles/theme';
import useStatusStore from '../stores/statusStore';
import { uploadAPI } from '../services/api';

const STATUS_COLORS = [
  '#075E54', '#128C7E', '#25D366', '#34B7F1',
  '#E53935', '#FB8C00', '#8E24AA', '#3949AB',
  '#00ACC1', '#43A047', '#6D4C41', '#546E7A',
  '#D81B60', '#5E35B1', '#1E88E5', '#00897B',
];

const CreateStatusModal = ({ open, onClose }) => {
  const { createStatus } = useStatusStore();
  const [step, setStep] = useState('type'); // 'type' | 'media'
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState(STATUS_COLORS[0]);
  const [mediaType, setMediaType] = useState('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const reset = () => {
    setStep('type');
    setContent('');
    setBgColor(STATUS_COLORS[0]);
    setMediaType('text');
    setMediaUrl('');
    setMediaFile(null);
    setAudioBlob(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = (type) => {
    setMediaType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaUrl(URL.createObjectURL(file));
    setStep('media');
    setMediaType(file.type.startsWith('video') ? 'video' : 'image');
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setMediaUrl(URL.createObjectURL(blob));
        setMediaType('audio');
        setStep('media');
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 30000);
    } catch {}
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePublish = async () => {
    if (loading) return;
    setLoading(true);
    try {
      let url = mediaUrl || null;
      if (url && url.startsWith('blob:')) {
        const blob = audioBlob || mediaFile;
        if (blob) {
          const ext = mediaType === 'audio' ? 'webm' : mediaType === 'video' ? 'mp4' : 'jpg';
          const file = new File([blob], `status-${Date.now()}.${ext}`, { type: blob.type });
          const { data } = await uploadAPI.upload(file);
          url = data.fileUrl;
        }
      }

      await createStatus({
        content: mediaType === 'text' ? content : null,
        mediaUrl: url,
        mediaType,
        backgroundColor: mediaType === 'text' ? bgColor : null,
      });

      handleClose();
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
    }} onClick={handleClose}>
      <div style={{
        background: Colors.white, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480,
        maxHeight: '90vh', padding: '20px 24px', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease',
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: Colors.textPrimary }}>
            {step === 'media' ? 'Preview Status' : 'Create Status'}
          </h3>
          <button onClick={handleClose}
            style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textSecondary }}>
            <X size={18} />
          </button>
        </div>

        {/* Step: Choose type */}
        {step === 'type' && (
          <>
            {/* Text status */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                Text Status
              </label>
              <textarea value={content} onChange={(e) => setContent(e.target.value.slice(0, 500))}
                placeholder="What's on your mind?"
                style={{
                  width: '100%', minHeight: 100, padding: 14, border: '2px solid #E9EDEF', borderRadius: 12,
                  fontSize: 16, outline: 'none', fontFamily: 'inherit', resize: 'vertical',
                  background: bgColor, color: '#fff',
                }} />
              <div style={{ textAlign: 'right', fontSize: 11, color: Colors.textHint, marginTop: 4 }}>{content.length}/500</div>
            </div>

            {/* Color picker */}
            <label style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Background Color
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {STATUS_COLORS.map((c) => (
                <button key={c} onClick={() => setBgColor(c)} style={{
                  width: 36, height: 36, borderRadius: '50%', background: c, border: bgColor === c ? '3px solid #333' : 'none',
                  cursor: 'pointer', outline: bgColor === c ? '2px solid #fff' : 'none',
                }} />
              ))}
            </div>

            {/* Media buttons */}
            <label style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Add Media
            </label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button onClick={() => handleFileSelect('image')} style={mediaBtnStyle}>
                <Image size={20} color="#1565C0" />
                <span>Photo</span>
              </button>
              <button onClick={() => handleFileSelect('video')} style={mediaBtnStyle}>
                <Video size={20} color="#E53935" />
                <span>Video</span>
              </button>
              <button onClick={isRecording ? handleStopRecording : handleStartRecording} style={{
                ...mediaBtnStyle, background: isRecording ? '#FFF0F0' : '#F0F2F5',
              }}>
                <Mic size={20} color={isRecording ? '#E53935' : '#667781'} />
                <span>{isRecording ? 'Recording...' : 'Audio'}</span>
              </button>
            </div>

            {isRecording && (
              <div style={{ textAlign: 'center', padding: 8, color: '#E53935', fontSize: 13, fontWeight: 600, animation: 'pulse 1s infinite' }}>
                Recording audio...
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />

            <button onClick={() => {
              if (content.trim()) {
                setMediaType('text');
                setStep('media');
              }
            }} disabled={!content.trim()} style={{
              padding: '14px', borderRadius: 12, border: 'none', width: '100%',
              background: !content.trim() && !mediaFile && !audioBlob ? '#E9EDEF' : Colors.primary,
              color: !content.trim() && !mediaFile && !audioBlob ? Colors.textHint : Colors.white,
              fontWeight: 600, fontSize: 16, cursor: !content.trim() && !mediaFile && !audioBlob ? 'default' : 'pointer',
            }}>
              Preview
            </button>
          </>
        )}

        {/* Step: Preview */}
        {step === 'media' && (
          <>
            <div style={{
              width: '100%', minHeight: 300, borderRadius: 16, overflow: 'hidden', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: mediaType === 'text' ? bgColor : '#000',
              position: 'relative',
            }}>
              {mediaType === 'video' && mediaUrl ? (
                <video src={mediaUrl} controls style={{ maxWidth: '100%', maxHeight: 350 }} />
              ) : mediaType === 'audio' ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Mic size={36} color="#fff" />
                  </div>
                  {mediaUrl && <audio src={mediaUrl} controls style={{ width: '100%' }} />}
                  <p style={{ color: '#fff', marginTop: 12, fontSize: 14 }}>Audio Status</p>
                </div>
              ) : mediaType === 'image' && mediaUrl ? (
                <img src={mediaUrl} alt="" style={{ maxWidth: '100%', maxHeight: 350, objectFit: 'contain' }} />
              ) : (
                <p style={{ color: '#fff', fontSize: 24, fontWeight: 600, textAlign: 'center', padding: 40 }}>
                  {content || 'Status'}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('type')} style={{
                flex: 1, padding: '14px', borderRadius: 12, border: '1px solid #E0E0E0',
                background: Colors.white, color: Colors.textPrimary, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>
                Edit
              </button>
              <button onClick={handlePublish} disabled={loading} style={{
                flex: 2, padding: '14px', borderRadius: 12, border: 'none',
                background: loading ? '#E9EDEF' : Colors.primary, color: loading ? Colors.textHint : Colors.white,
                fontWeight: 600, fontSize: 16, cursor: loading ? 'default' : 'pointer',
              }}>
                {loading ? 'Publishing...' : 'Publish Status'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const mediaBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: '#F0F2F5', border: 'none', borderRadius: 12,
  padding: '12px 16px', cursor: 'pointer', fontSize: 13,
  color: Colors.textPrimary, fontWeight: 500, flex: 1,
  justifyContent: 'center',
};

export default CreateStatusModal;
