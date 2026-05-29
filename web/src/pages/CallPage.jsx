import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Smartphone } from 'lucide-react';
import webrtcService from '../services/webrtc';
import socketService from '../services/socket';
import useAuthStore from '../stores/authStore';
import { callsAPI } from '../services/api';
import { Colors } from '../styles/theme';
import { useWebRTCSignaling } from '../services/useWebRTC';

const CallPage = () => {
  const { channelName } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const callType = state?.callType || 'video';
  const isAudioOnly = callType === 'voice';
  const meetingName = state?.name || 'Call';
  const isCaller = state?.caller !== false;
  const remoteUserId = state?.remoteUserId || null;
  const startedAt = state?.startedAt || Date.now();
  const initialDuration = Math.floor((Date.now() - startedAt) / 1000);
  const remoteAvatar = state?.remoteAvatar || null;

  const [callState, setCallState] = useState(isCaller ? 'calling' : 'connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(isAudioOnly);
  const [remoteStream, setRemoteStream] = useState(null);
  const [duration, setDuration] = useState(Math.max(0, initialDuration));
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState(null);

  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const timerRef = useRef(null);
  const leftRef = useRef(false);
  const callLogIdRef = useRef(state?.callLogId || null);
  const startedAtRef = useRef(startedAt);
  const remoteUserIdRef = useRef(remoteUserId);

  const cleanupAndGoBack = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    webrtcService.cleanup();
    navigate(-1);
  }, [navigate]);

  const handleRemoteStream = useCallback((userId, stream) => {
    setRemoteStream(stream);
    setCallState('connected');
  }, []);

  const handleRemoteLeave = useCallback(() => {
    setRemoteStream(null);
    if (!leftRef.current) cleanupAndGoBack();
  }, [cleanupAndGoBack]);

  useWebRTCSignaling({
    channelName,
    isCaller,
    remoteUserId: remoteUserIdRef.current,
    onRemoteStream: handleRemoteStream,
    onRemoteLeave: handleRemoteLeave,
    onCallAccepted: useCallback(() => {
      setCallState('connected');
    }, []),
    onCallRejected: useCallback(() => {
      if (!leftRef.current && isCaller) cleanupAndGoBack();
    }, [isCaller, cleanupAndGoBack]),
    onCallEnded: useCallback(() => {
      if (!leftRef.current) cleanupAndGoBack();
    }, [cleanupAndGoBack]),
    onCallTimedout: useCallback(() => {
      if (!leftRef.current && isCaller) cleanupAndGoBack();
    }, [isCaller, cleanupAndGoBack]),
  });

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await webrtcService.startLocalStream(isAudioOnly);
        if (cancelled) return;
        if (localRef.current && webrtcService.localStream) {
          localRef.current.srcObject = webrtcService.localStream;
          localRef.current.muted = true;
        }
      } catch (err) {
        if (!cancelled) setError('Could not access camera/microphone. Please check permissions.');
      }
    };
    init();
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAudioOnly]);

  const handleLeave = async () => {
    if (leftRef.current) return;
    leftRef.current = true;
    if (callLogIdRef.current && callState === 'connected') {
      try { await callsAPI.updateCallStatus(callLogIdRef.current, 'ended'); } catch {}
    }
    if (remoteUserIdRef.current) {
      socketService.emit('call:end', { to: remoteUserIdRef.current });
    }
    webrtcService.cleanup();
    navigate(-1);
  };

  const toggleMute = () => {
    const next = !isMuted;
    webrtcService.toggleMic(!next);
    setIsMuted(next);
  };

  const toggleVideo = () => {
    if (isAudioOnly) return;
    const next = !isVideoOff;
    webrtcService.toggleCamera(!next);
    setIsVideoOff(next);
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await webrtcService.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await webrtcService.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch { setIsScreenSharing(false); }
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (error) {
    return (
      <div style={{
        height: '100vh', background: '#0D1117', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32,
      }}>
        <div style={{ color: '#E53935', fontSize: 48 }}>!</div>
        <h2 style={{ color: Colors.white, margin: 0, fontSize: 18 }}>Call Failed</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 14, margin: 0 }}>{error}</p>
        <button onClick={() => navigate(-1)} style={{
          padding: '10px 32px', borderRadius: 24, border: 'none',
          background: Colors.green, color: Colors.white, fontSize: 14,
          fontWeight: 600, cursor: 'pointer', marginTop: 8,
        }}>Go Back</button>
      </div>
    );
  }

  const statusText = callState === 'calling' ? 'Calling...'
    : callState === 'connecting' ? 'Connecting...'
    : callState === 'connected' ? fmt(duration)
    : 'Connecting...';

  return (
    <div style={{
      height: '100vh', background: '#0D1117', display: 'flex',
      flexDirection: 'column', fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {callState !== 'connected' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 5, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            {remoteAvatar ? (
              <img src={remoteAvatar} alt="" style={{
                width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
              }} />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: `linear-gradient(135deg, hsl(${((remoteUserId || 0) * 60) % 360}, 45%, 45%), hsl(${((remoteUserId || 0) * 60 + 30) % 360}, 50%, 35%))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: Colors.white, fontSize: 36, fontWeight: 700,
              }}>
                {(meetingName || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{meetingName}</div>
          </div>
        )}

        <header style={{
          padding: '12px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', zIndex: 10, paddingTop: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: callState === 'connected' ? Colors.green : '#FFC107',
            }} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{statusText}</span>
          </div>
        </header>

        <div style={{
          flex: 1, padding: 12, overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: remoteStream ? '1fr 1fr' : '1fr',
          gap: 10, alignContent: 'center',
        }}>
          <div style={{
            position: 'relative', borderRadius: 14, overflow: 'hidden',
            aspectRatio: '4/3', background: '#1a1a2e', minHeight: 200,
          }}>
            <video ref={localRef} autoPlay playsInline muted style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: isAudioOnly ? 'none' : 'scaleX(-1)',
            }} />
            {(isAudioOnly || isVideoOff) && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: `linear-gradient(135deg, hsl(${(currentUser?.id || 0) * 60 % 360}, 45%, 45%), hsl(${(currentUser?.id || 0) * 60 % 360 + 30}, 50%, 35%))`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: Colors.white, fontWeight: 700, fontSize: 28,
                }}>
                  {currentUser?.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>You</span>
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 8, left: 8,
              background: 'rgba(0,0,0,0.5)', borderRadius: 6,
              padding: '3px 8px', fontSize: 11, color: Colors.white,
            }}>You</div>
          </div>

          {remoteStream && (
            <div style={{
              position: 'relative', borderRadius: 14, overflow: 'hidden',
              aspectRatio: '4/3', background: '#1a1a2e', minHeight: 200,
            }}>
              <video ref={(el) => { if (el && remoteStream) el.srcObject = remoteStream; }} autoPlay playsInline style={{
                width: '100%', height: '100%', objectFit: 'cover',
              }} />
              <div style={{
                position: 'absolute', bottom: 8, left: 8,
                background: 'rgba(0,0,0,0.5)', borderRadius: 6,
                padding: '3px 8px', fontSize: 11, color: Colors.white,
              }}>{meetingName}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding: '16px 20px 40px', display: 'flex',
        justifyContent: 'center', gap: 20, alignItems: 'center',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
      }}>
        <CtrlBtn icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          label={isMuted ? 'Unmute' : 'Mute'} active={isMuted} onClick={toggleMute} />
        {!isAudioOnly && (
          <CtrlBtn icon={isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            label={isVideoOff ? 'Camera On' : 'Camera Off'} active={isVideoOff} onClick={toggleVideo} />
        )}
        <CtrlBtn icon={isScreenSharing ? <Smartphone size={20} /> : <Monitor size={20} />}
          label={isScreenSharing ? 'Stop Share' : 'Share'} active={isScreenSharing} onClick={toggleScreenShare} />
        <button onClick={handleLeave} style={{
          width: 56, height: 56, borderRadius: '50%', background: Colors.red,
          border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(229,57,53,0.5)',
        }}><PhoneOff size={24} color={Colors.white} /></button>
      </div>
    </div>
  );
};

const CtrlBtn = ({ icon, label, active, onClick }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <button onClick={onClick} style={{
      width: 48, height: 48, borderRadius: '50%',
      background: active ? '#E53935' : 'rgba(255,255,255,0.1)',
      border: 'none', cursor: 'pointer', color: Colors.white,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    }}>{icon}</button>
    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{label}</span>
  </div>
);

export default CallPage;
