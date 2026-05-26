import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, PhoneOff, Video } from 'lucide-react';
import useCallStore from '../stores/callStore';
import webrtcService from '../services/webrtc';
import socketService from '../services/socket';
import { Colors } from '../styles/theme';

const OngoingCallBanner = () => {
  const { activeCall, clearActiveCall } = useCallStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [duration, setDuration] = useState(0);
  const onCallPageRef = useRef(false);

  onCallPageRef.current = location.pathname.startsWith('/call/');

  useEffect(() => {
    const unsub = socketService.on('call:ended', () => {
      if (onCallPageRef.current) return;
      webrtcService.cleanup();
      clearActiveCall();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeCall && !onCallPageRef.current) {
      const startTime = webrtcService.activeCallInfo?.startTime || Date.now();
      setDuration(Math.floor((Date.now() - startTime) / 1000));
      const timer = setInterval(() => {
        setDuration(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeCall, location.pathname]);

  if (!activeCall || onCallPageRef.current) return null;

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const returnToCall = () => {
    navigate(`/call/${activeCall.userId}`, {
      state: { user: activeCall.user, callType: activeCall.callType, returnToCall: true },
    });
  };

  const endCall = () => {
    webrtcService.cleanup();
    clearActiveCall();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #075E54, #128C7E)',
      padding: '8px 16px', display: 'flex', alignItems: 'center',
      gap: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      animation: 'slideDown 0.3s ease',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        background: activeCall.callType === 'video'
          ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.2)',
      }}>
        {activeCall.callType === 'video'
          ? <Video size={18} color="#fff" />
          : <Phone size={18} color="#fff" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
          {activeCall.user?.username || 'Unknown'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
          {fmt(duration)} &middot; {activeCall.callType === 'video' ? 'Video' : 'Voice'} call
        </div>
      </div>
      <button onClick={returnToCall} style={{
        padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.5)',
        background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13,
        fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        Return to call
      </button>
      <button onClick={endCall} style={{
        width: 32, height: 32, borderRadius: '50%', border: 'none',
        background: '#E53935', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <PhoneOff size={14} color="#fff" />
      </button>
    </div>
  );
};

export default OngoingCallBanner;