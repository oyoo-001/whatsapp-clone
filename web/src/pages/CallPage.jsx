import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2,
  Volume2, VolumeX, UserPlus, Users, Pause, Play,
} from 'lucide-react';
import socketService from '../services/socket';
import webrtcService from '../services/webrtc';
import { callsAPI } from '../services/api';
import useCallStore from '../stores/callStore';
import { Colors } from '../styles/theme';

const CallPage = () => {
  const { userId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const chatUser = state?.user;
  const callType = state?.callType || 'voice';
  const isIncoming = state?.isIncoming || false;
  const incomingCallLogId = state?.callLogId;
  const isReturning = state?.returnToCall || false;

  const uid = Number(userId);
  const { setActiveCall, clearActiveCall } = useCallStore();

  const [callState, setCallState] = useState(() => {
    if (isReturning) return 'connected';
    return isIncoming ? 'ringing' : 'calling';
  });
  const [isVideo, setIsVideo] = useState(callType === 'video');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [pip, setPip] = useState(true);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callLogId, setCallLogId] = useState(incomingCallLogId || null);
  const [participants, setParticipants] = useState(
    chatUser ? [{ id: uid, user: chatUser }] : []
  );
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const logRef = useRef(false);
  const acceptedRef = useRef(false);
  const startTimeRef = useRef(null);
  const callStateRef = useRef(callState);

  useEffect(() => {
    if (isReturning) {
      setCallState('connected');
      if (webrtcService.remoteStream) setRemoteStream(webrtcService.remoteStream);
      if (webrtcService.isCallActive) startTimer(webrtcService.activeCallInfo?.startTime || Date.now());
    } else {
      if (!isIncoming) startCall();
    }
    setupListeners();
    const pendingOffer = webrtcService.consumePendingOffer(uid);
    if (pendingOffer) {
      webrtcService.handleOffer(pendingOffer.from, pendingOffer.offer);
    }
    return () => {
      webrtcService.activeCallInfo = {
        userId: uid,
        user: chatUser,
        callLogId,
        startTime: startTimeRef.current,
      };
      webrtcService.onCallEnded = null;
      if (timerRef.current) clearInterval(timerRef.current);
      if (callStateRef.current === 'connected') {
        setActiveCall({
          userId: uid,
          user: chatUser,
          callType: isVideo ? 'video' : 'voice',
          duration,
          remoteStream,
          isMuted,
          isSpeakerOn,
          isVideo,
          isOnHold,
        });
      }
    };
  }, []);

  useEffect(() => { callStateRef.current = callState; }, [callState]);

  useEffect(() => {
    if (localRef.current && localStream)
      localRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream && isVideo)
      remoteRef.current.srcObject = remoteStream;
    if (audioRef.current && remoteStream && !isVideo)
      audioRef.current.srcObject = remoteStream;
  }, [remoteStream, isVideo]);

  useEffect(() => {
    if (callState === 'connected' && remoteStream) {
      setActiveCall({
        userId: uid,
        user: chatUser,
        callType: isVideo ? 'video' : 'voice',
        duration,
        remoteStream,
        isMuted,
        isSpeakerOn,
        isVideo,
        isOnHold,
      });
    } else if (callState !== 'connected') {
      clearActiveCall();
    }
  }, [callState, remoteStream, duration, isOnHold]);

  const setupListeners = () => {
    const handlers = [
      socketService.on('signal:offer', async ({ from, offer }) => {
        if (from === uid) await webrtcService.handleOffer(from, offer);
      }),
      socketService.on('signal:answer', async ({ from, answer }) => {
        if (from === uid) await webrtcService.handleAnswer(from, answer);
      }),
      socketService.on('signal:ice-candidate', async ({ from, candidate }) => {
        if (from === uid) await webrtcService.handleIceCandidate(from, candidate);
      }),
      socketService.on('call:accepted', ({ from, connectedAt }) => {
        if (from === uid) startTimer(connectedAt);
      }),
      socketService.on('call:connected', ({ connectedAt }) => {
        if (!startTimeRef.current) startTimer(connectedAt);
      }),
      socketService.on('call:ended', ({ from }) => {
        if (from === uid || participants.some((p) => p.id === from)) endCall();
      }),
      socketService.on('call:ringing', () => {
        if (!isIncoming) setCallState('ringing');
      }),
      socketService.on('call:participant-joined', ({ userId: puid, user }) => {
        setParticipants((prev) => {
          if (prev.some((p) => p.id === puid)) return prev;
          return [...prev, { id: puid, user }];
        });
      }),
      socketService.on('call:participant-left', ({ userId: puid }) => {
        setParticipants((prev) => prev.filter((p) => p.id !== puid));
      }),
    ];

    webrtcService.onRemoteStream = (id, s) => {
      if (id === uid) setRemoteStream(s);
    };
    webrtcService.onCallEnded = () => endCall();

    webrtcService.onOfferReady = (from) => {
      if (acceptedRef.current) {
        webrtcService.acceptCall(isVideo);
      }
    };

    return () => handlers.forEach((u) => u());
  };

  const startTimer = (connectedAt) => {
    startTimeRef.current = connectedAt;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - connectedAt) / 1000));
    }, 1000);
    setCallState('connected');
  };

  const startCall = async () => {
    try {
      const ok = await webrtcService.startCall(uid, isVideo);
      if (!ok) return navigate('/');
      if (webrtcService.localStream) setLocalStream(webrtcService.localStream);
      let logId = null;
      try {
        const { data } = await callsAPI.initiateCall({
          receiverId: uid,
          callType: isVideo ? 'video' : 'voice',
        });
        logId = data.callLog.id;
        setCallLogId(logId);
      } catch {}
      socketService.emit('call:start', {
        to: uid,
        callType: isVideo ? 'video' : 'voice',
        callLogId: logId,
      });
    } catch {
      clearActiveCall();
      navigate('/');
    }
  };

  const acceptCall = async () => {
    acceptedRef.current = true;
    setCallState('connected');
    const ok = await webrtcService.acceptCall(isVideo);
    if (!ok) return endCall();
    if (webrtcService.localStream) setLocalStream(webrtcService.localStream);
    socketService.emit('call:accept', { to: uid });
    if (callLogId) {
      try { await callsAPI.updateCallStatus(callLogId, 'answered'); } catch {}
    }
  };

  const endCall = async () => {
    socketService.emit('call:end', { to: uid });
    webrtcService.cleanup();
    clearActiveCall();
    if (timerRef.current) clearInterval(timerRef.current);
    if (callLogId && !logRef.current) {
      logRef.current = true;
      try {
        if (callStateRef.current === 'connected') {
          await callsAPI.updateCallStatus(callLogId, 'ended');
        } else {
          await callsAPI.updateCallStatus(callLogId, 'cancelled');
        }
      } catch {}
    }
    navigate('/');
  };

  const rejectCall = async () => {
    socketService.emit('call:reject', { to: uid });
    webrtcService.cleanup();
    clearActiveCall();
    if (callLogId) {
      try { await callsAPI.updateCallStatus(callLogId, 'rejected'); } catch {}
    }
    navigate('/');
  };

  const toggleMute = () => {
    webrtcService.toggleAudio(isMuted);
    setIsMuted(!isMuted);
    socketService.emit('call:toggle-audio', { to: uid, audioEnabled: isMuted });
  };

  const toggleVideo = async () => {
    const enabled = !isVideo;
    try {
      await webrtcService.toggleVideo(enabled);
      setIsVideo(enabled);
      socketService.emit('call:toggle-video', { to: uid, videoEnabled: enabled });
    } catch {}
  };

  const toggleSpeaker = () => {
    webrtcService.switchSpeaker(!isSpeakerOn);
    setIsSpeakerOn(!isSpeakerOn);
  };

  const toggleHold = () => {
    const hold = !isOnHold;
    setIsOnHold(hold);
    if (webrtcService.localStream) {
      webrtcService.localStream.getAudioTracks().forEach((t) => (t.enabled = !hold));
      webrtcService.localStream.getVideoTracks().forEach((t) => (t.enabled = !hold));
    }
    socketService.emit('call:toggle-audio', { to: uid, audioEnabled: !hold });
  };

  const addParticipant = () => {
    navigate('/contacts', {
      state: { returnTo: `/call/${uid}`, callType: isVideo ? 'video' : 'voice', activeCallId: callLogId },
    });
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      height: '100vh', background: '#0D1117', display: 'flex',
      flexDirection: 'column', position: 'relative', overflow: 'hidden',
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      {!isVideo && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 0,
          height: '100%', background: 'radial-gradient(ellipse at center bottom, rgba(7,94,84,0.15) 0%, transparent 70%)',
        }} />
      )}

      {remoteStream && isVideo ? (
        <video ref={remoteRef} autoPlay playsInline style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
        }} />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 1 }}>
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            background: `linear-gradient(135deg, hsl(${uid * 60 % 360}, 45%, 45%), hsl(${uid * 60 % 360 + 30}, 50%, 35%))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: Colors.white, fontSize: 48, fontWeight: 700,
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 80px rgba(7,94,84,0.2)',
          }}>{chatUser?.username?.charAt(0).toUpperCase()}</div>
          <h2 style={{ color: Colors.white, margin: '8px 0 0', fontSize: 24, fontWeight: 600 }}>{chatUser?.username}</h2>

          {participants.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              <Users size={14} />
              <span>{participants.length} participants</span>
            </div>
          )}

          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0, letterSpacing: '0.3px' }}>
            {callState === 'calling' ? 'Calling...' :
             callState === 'ringing' && !isIncoming ? 'Ringing...' :
             callState === 'ringing' ? 'Incoming call...' :
             callState === 'connected' ? fmt(duration) : ''}
          </p>
        </div>
      )}

      {!isVideo && remoteStream && (
        <audio ref={audioRef} autoPlay playsInline className="remote-audio" style={{ display: 'none' }} />
      )}

      {isVideo && localStream && pip && (
        <div style={{
          position: 'absolute', top: 20, right: 20, width: 120, height: 180,
          borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          border: '2px solid rgba(255,255,255,0.15)', cursor: 'pointer', zIndex: 10,
        }} onClick={() => setPip(!pip)}>
          <video ref={localRef} autoPlay playsInline muted style={{
            width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)',
          }} />
        </div>
      )}

      <div style={{
        padding: '20px 20px 48px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 20, zIndex: 10,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
      }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center' }}>
          {callState === 'ringing' && isIncoming ? (
            <CtrlBtn icon={<PhoneOff size={22} />} label="Decline" onClick={rejectCall}
              bg="#E53935" />
          ) : (
            <>
              <CtrlBtn icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                label={isMuted ? 'Unmute' : 'Mute'} onClick={toggleMute}
                active={isMuted} />
              <CtrlBtn icon={isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
                label={isSpeakerOn ? 'Speaker' : 'Earpiece'} onClick={toggleSpeaker}
                active={!isSpeakerOn} />
              {isVideo && (
                <CtrlBtn icon={isVideo ? <Video size={20} /> : <VideoOff size={20} />}
                  label={isVideo ? 'Video' : 'Off'} onClick={toggleVideo}
                  active={!isVideo} />
              )}
              <CtrlBtn icon={<UserPlus size={20} />} label="Add" onClick={addParticipant}
                bg="rgba(255,255,255,0.1)" />
              <CtrlBtn icon={isOnHold ? <Play size={20} /> : <Pause size={20} />}
                label={isOnHold ? 'Resume' : 'Hold'} onClick={toggleHold}
                active={isOnHold} />
              {isVideo && (
                <CtrlBtn icon={pip ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                  label={pip ? 'PiP' : 'Full'} onClick={() => setPip(!pip)} />
              )}
            </>
          )}
        </div>

        {callState === 'ringing' && isIncoming ? (
          <MainBtn icon={<Phone size={28} />} label="Accept" onClick={acceptCall}
            bg={Colors.green} boxShadow="0 4px 24px rgba(37,211,102,0.5)" />
        ) : (
          <MainBtn icon={<Phone size={28} style={{ transform: 'rotate(135deg)' }} />}
            label="End" onClick={endCall}
            bg={Colors.red} boxShadow="0 4px 24px rgba(229,57,53,0.5)" />
        )}
      </div>
    </div>
  );
};

const CtrlBtn = ({ icon, label, onClick, active, bg }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
    <button onClick={onClick} style={{
      width: 48, height: 48, borderRadius: '50%',
      background: active ? '#E53935' : (bg || 'rgba(255,255,255,0.1)'),
      border: 'none', cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: Colors.white,
      transition: 'all 0.2s', backdropFilter: active ? 'none' : 'blur(8px)',
    }}>{icon}</button>
    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 500 }}>{label}</span>
  </div>
);

const MainBtn = ({ icon, label, onClick, bg, boxShadow }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    <button onClick={onClick} style={{
      width: 72, height: 72, borderRadius: '50%',
      background: bg, border: 'none', cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: Colors.white,
      boxShadow: boxShadow || 'none', transition: 'all 0.2s',
    }}>{icon}</button>
    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600 }}>{label}</span>
  </div>
);

export default CallPage;