import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Smartphone, Users } from 'lucide-react';
import webrtcService from '../services/webrtc';
import socketService from '../services/socket';
import useAuthStore from '../stores/authStore';
import { Colors } from '../styles/theme';
import { useGroupSignaling } from '../services/useWebRTC';

const GroupCallPage = () => {
  const { channelName } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const callType = state?.callType || 'video';
  const isAudioOnly = callType === 'voice';
  const groupName = state?.groupName || 'Group Call';
  const memberIds = state?.memberIds || [];
  const localUserId = currentUser?.id;

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(isAudioOnly);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState(null);

  const localRef = useRef(null);
  const leftRef = useRef(false);
  const videoRefs = useRef({});

  const { participants, groupError } = useGroupSignaling({ channelName, memberIds, localUserId });

  const cleanupAndGoBack = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    webrtcService.cleanup();
    navigate(-1);
  }, [navigate]);

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
        if (!cancelled) setError('Could not access camera/microphone. Please ensure you have granted permission in your device settings.');
      }
    };
    init();

    webrtcService.on('onRemoteStream', (userId, stream) => {
      if (cancelled) return;
      setRemoteStreams((prev) => ({ ...prev, [userId]: stream }));
    });

    webrtcService.on('onRemoteLeave', (userId) => {
      if (cancelled) return;
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      delete videoRefs.current[userId];
    });

    return () => {
      cancelled = true;
      webrtcService.off('onRemoteStream');
      webrtcService.off('onRemoteLeave');
    };
  }, [isAudioOnly]);

  useEffect(() => {
    participants.forEach((p) => {
      const ref = videoRefs.current[p.id];
      if (ref && remoteStreams[p.id]) {
        ref.srcObject = remoteStreams[p.id];
      }
    });
  }, [participants, remoteStreams]);

  const handleLeave = () => {
    cleanupAndGoBack();
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

  const effectiveError = error || groupError;

  if (effectiveError) {
    return (
      <div style={{
        height: '100vh', background: '#0D1117', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32,
      }}>
        <div style={{ color: '#E53935', fontSize: 48 }}>!</div>
        <h2 style={{ color: Colors.white, margin: 0, fontSize: 18 }}>Group Call Failed</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 14, margin: 0 }}>{effectiveError}</p>
        <button onClick={() => navigate(-1)} style={{
          padding: '10px 32px', borderRadius: 24, border: 'none',
          background: Colors.green, color: Colors.white, fontSize: 14,
          fontWeight: 600, cursor: 'pointer', marginTop: 8,
        }}>Go Back</button>
      </div>
    );
  }

  const allParticipants = [
    { id: localUserId, isLocal: true, user: currentUser },
    ...participants.filter((p) => p.id !== localUserId),
  ];
  const participantCount = allParticipants.length;

  return (
    <div style={{
      height: '100vh', background: '#0D1117', display: 'flex',
      flexDirection: 'column', fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          padding: '12px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', zIndex: 10, paddingTop: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{groupName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            <Users size={14} />
            <span>{participantCount}</span>
          </div>
        </header>

        {participantCount > 5 && (
          <div style={{
            margin: '0 12px 8px', padding: '8px 12px', background: 'rgba(255,193,7,0.15)',
            borderRadius: 10, border: '1px solid rgba(255,193,7,0.3)',
            fontSize: 12, color: '#FFC107', textAlign: 'center',
          }}>
            Mesh call with {participantCount} participants — quality may degrade. Limit is 6.
          </div>
        )}

        <div style={{
          flex: 1, padding: 12, overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: participantCount <= 2 ? '1fr 1fr' : 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 10, alignContent: 'center',
        }}>
          {allParticipants.map((p) => {
            const isLocal = p.id === localUserId;
            const stream = isLocal ? null : remoteStreams[p.id];
            const hasVideo = isLocal ? !isVideoOff && !isAudioOnly : !!stream;

            return (
              <div key={p.id} style={{
                position: 'relative', borderRadius: 14, overflow: 'hidden',
                aspectRatio: '4/3', background: '#1a1a2e', minHeight: 160,
              }}>
                {isLocal ? (
                  <video ref={localRef} autoPlay playsInline muted style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transform: isAudioOnly ? 'none' : 'scaleX(-1)',
                  }} />
                ) : stream ? (
                  <video ref={(el) => { videoRefs.current[p.id] = el; if (el) el.srcObject = stream; }}
                    autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}

                {(!hasVideo) && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: `linear-gradient(135deg, hsl(${(p.id || 0) * 60 % 360}, 45%, 45%), hsl(${(p.id || 0) * 60 % 360 + 30}, 50%, 35%))`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: Colors.white, fontWeight: 700, fontSize: 22,
                    }}>
                      {(p.user?.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                      {isLocal ? 'You' : (p.user?.username || `User ${p.id}`)}
                    </span>
                  </div>
                )}
                <div style={{
                  position: 'absolute', bottom: 6, left: 6,
                  background: 'rgba(0,0,0,0.5)', borderRadius: 6,
                  padding: '2px 6px', fontSize: 10, color: Colors.white,
                }}>{isLocal ? 'You' : (p.user?.username || `User ${p.id}`)}</div>
              </div>
            );
          })}
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

export default GroupCallPage;
