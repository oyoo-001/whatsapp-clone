import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Trash2 } from 'lucide-react';
import { Colors } from '../styles/theme';

const VoiceRecorder = ({ onSend, onCancel }) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250);
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d >= 180) { stopRecording(); return d; }
          return d + 1;
        });
      }, 1000);
    } catch {}
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const sendRecording = () => {
    if (audioBlob) onSend(audioBlob, duration);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    onCancel();
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
      background: '#F0F2F5', zIndex: 10,
    }}>
      {!audioBlob ? (
        <>
          <button onClick={recording ? stopRecording : startRecording} style={{
            width: 44, height: 44, borderRadius: '50%',
            background: recording ? Colors.red : Colors.white,
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: recording ? '0 2px 12px rgba(229,57,53,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
            animation: recording ? 'pulse 1s ease infinite' : 'none',
          }}>
            {recording ? <Square size={16} color={Colors.white} /> : <Mic size={20} color={Colors.textPrimary} />}
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            {recording ? (
              <>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: Colors.red, animation: 'pulse 0.6s ease infinite' }} />
                <div style={{
                  flex: 1, height: 4, background: '#E0E0E0', borderRadius: 2, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${Math.min(duration / 180 * 100, 100)}%`,
                    background: `linear-gradient(90deg, ${Colors.primary}, ${Colors.secondary})`,
                    borderRadius: 2, transition: 'width 1s linear',
                  }} />
                </div>
                <span style={{ fontSize: 13, color: Colors.red, fontWeight: 600, minWidth: 40, textAlign: 'right' }}>
                  {fmt(duration)}
                </span>
                <button onClick={cancelRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: Colors.textHint, display: 'flex' }}>
                  <Trash2 size={18} />
                </button>
              </>
            ) : (
              <span style={{ fontSize: 13, color: Colors.textHint }}>Hold to record, release to send</span>
            )}
          </div>
        </>
      ) : (
        <>
          <button onClick={cancelRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: Colors.textHint, display: 'flex' }}>
            <Trash2 size={20} />
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: '#E8F5E9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mic size={18} color={Colors.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ width: '100%', height: 4, background: '#E0E0E0', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.min(duration / 180 * 100, 100)}%`,
                  background: Colors.primary, borderRadius: 2,
                }} />
              </div>
            </div>
            <span style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: 500, minWidth: 36, textAlign: 'right' }}>{fmt(duration)}</span>
          </div>
          <button onClick={sendRecording} style={{
            width: 44, height: 44, borderRadius: '50%', background: Colors.primary,
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(7,94,84,0.3)',
          }}>
            <Send size={18} color={Colors.white} />
          </button>
        </>
      )}
    </div>
  );
};

export default VoiceRecorder;