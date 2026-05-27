import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Phone } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import socketService from '../services/socket';
import webrtcService from '../services/webrtc';
import { Colors } from '../styles/theme';

const GroupCallPage = () => {
  const { meetingId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const meetingName = state?.name || 'Group Meeting';
  const callType = state?.callType || 'video';
  const uid = currentUser?.id;

  const [participants, setParticipants] = useState([]);
  const [isVideo, setIsVideo] = useState(callType === 'video');
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const localRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    socketService.emit('meeting:create', { meetingId, name: meetingName });
    startStream();
    const u1 = socketService.on('meeting:participants', ({ participants: p }) => setParticipants(p));
    const u2 = socketService.on('meeting:user-joined', ({ userId, user }) =>
      setParticipants((prev) => [...prev.filter((p) => p.userId !== userId), { userId, user, audioEnabled: true, videoEnabled: true }])
    );
    const u3 = socketService.on('meeting:user-left', ({ userId }) =>
      setParticipants((prev) => prev.filter((p) => p.userId !== userId))
    );
    timerRef.current = setInterval(() => setDuration((p) => p + 1), 1000);
    return () => {
      socketService.emit('meeting:leave', { meetingId });
      webrtcService.cleanup();
      if (timerRef.current) clearInterval(timerRef.current);
      u1(); u2(); u3();
    };
  }, []);

  useEffect(() => {
    if (localRef.current && webrtcService.localStream)
      localRef.current.srcObject = webrtcService.localStream;
  }, [webrtcService.localStream]);

  const startStream = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
    } catch {}
  };

  const leaveCall = () => {
    socketService.emit('meeting:leave', { meetingId });
    socketService.emit('call:group-ended', { groupId: meetingId.replace(/^group-/, '') });
    webrtcService.cleanup();
    navigate('/');
  };

  const toggleMute = () => { webrtcService.toggleAudio(isMuted); setIsMuted(!isMuted); };
  const toggleVideo = () => { webrtcService.toggleVideo(!isVideo); setIsVideo(!isVideo); };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const getHue = (id) => (id * 60) % 360;

  return (
    <div style={{ height: '100vh', background: '#1a1a2e', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', paddingTop: 20,
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, color: Colors.white, padding: 8, cursor: 'pointer', display: 'flex' }}>
          ←
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: Colors.white, fontWeight: 600, fontSize: 15 }}>{meetingName}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {callType === 'voice' ? <Phone size={12} /> : <Video size={12} />}
            {callType === 'voice' ? 'Voice' : 'Video'} &middot; {fmt(duration)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
          <Users size={14} /> {participants.length + 1}
        </div>
      </header>

      <div style={{
        flex: 1, overflowY: 'auto', padding: 12,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 10, alignContent: 'start',
      }}>
        {/* Local */}
        <div style={tileStyle}>
          {isVideo && webrtcService.localStream ? (
            <video ref={localRef} autoPlay playsInline muted style={videoTileStyle} />
          ) : (
            <AvatarView name={currentUser?.username || 'You'} hue={getHue(uid)} label="You" />
          )}
          <div style={tileLabel}>
            {isMuted ? <MicOff size={12} /> : <Mic size={12} />} You
          </div>
        </div>

        {/* Remote participants */}
        {participants.filter((p) => p.userId !== uid).map((p) => (
          <div key={p.userId} style={tileStyle}>
            <AvatarView name={p.user?.username || 'User'} hue={getHue(p.userId)} label={p.user?.username} />
            <div style={tileLabel}>
              {!p.audioEnabled ? <MicOff size={12} /> : <Mic size={12} />} {p.user?.username}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 20px 32px', display: 'flex', justifyContent: 'center', gap: 24 }}>
        <CtrlBtn icon={isMuted ? MicOff : Mic} label={isMuted ? 'Unmute' : 'Mute'}
          active={isMuted} onClick={toggleMute} />
        <CtrlBtn icon={isVideo ? Video : VideoOff} label={isVideo ? 'Video' : 'Off'}
          active={!isVideo} onClick={toggleVideo} />
        <button onClick={leaveCall} style={{
          width: 56, height: 56, borderRadius: '50%', background: Colors.red,
          border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(229,57,53,0.4)',
        }}><PhoneOff size={24} color={Colors.white} /></button>
      </div>
    </div>
  );
};

const AvatarView = ({ name, hue, label }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', gap: 8,
  }}>
    <div style={{
      width: 52, height: 52, borderRadius: '50%',
      background: `hsl(${hue}, 40%, 50%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: Colors.white, fontWeight: 700, fontSize: 22,
    }}>{name?.charAt(0).toUpperCase()}</div>
    <span style={{ color: Colors.white, fontSize: 13 }}>{label}</span>
  </div>
);

const CtrlBtn = ({ icon: Icon, label, active, onClick }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <button onClick={onClick} style={{
      width: 48, height: 48, borderRadius: '50%',
      background: active ? '#E53935' : 'rgba(255,255,255,0.1)',
      border: 'none', cursor: 'pointer', color: Colors.white,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}><Icon size={20} /></button>
    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{label}</span>
  </div>
);

const tileStyle = {
  background: '#2a2a3e', borderRadius: 14, overflow: 'hidden',
  aspectRatio: '4/3', position: 'relative', minHeight: 160,
};

const videoTileStyle = {
  width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)',
};

const tileLabel = {
  position: 'absolute', bottom: 6, left: 8, background: 'rgba(0,0,0,0.5)',
  borderRadius: 6, padding: '3px 8px', fontSize: 11, color: Colors.white,
  display: 'flex', alignItems: 'center', gap: 4,
};

export default GroupCallPage;
