import { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Colors } from '../styles/theme';

const TIMEOUT = 30;

const IncomingCallModal = ({ caller, callType, channelName, onAccept, onReject }) => {
  const [countdown, setCountdown] = useState(TIMEOUT);

  useEffect(() => {
    if (!caller) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [caller]);

  if (!caller) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(16px, 3vw, 24px)',
        padding: 'clamp(20px, 5vw, 40px)', borderRadius: 'clamp(16px, 3vw, 24px)',
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        width: 'clamp(280px, 85vw, 400px)',
      }}>
        {caller.avatar ? (
          <img src={caller.avatar} alt="" style={{
            width: 'clamp(60px, 12vw, 80px)', height: 'clamp(60px, 12vw, 80px)', borderRadius: '50%', objectFit: 'cover',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          }} />
        ) : (
          <div style={{
            width: 'clamp(60px, 12vw, 80px)', height: 'clamp(60px, 12vw, 80px)', borderRadius: '50%',
            background: `linear-gradient(135deg, hsl(${((caller?.id || 0) * 60) % 360}, 45%, 45%), hsl(${((caller?.id || 0) * 60 + 30) % 360}, 50%, 35%))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: Colors.white, fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700,
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          }}>
            {caller?.username?.charAt(0).toUpperCase() || '?'}
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: Colors.white, margin: 0, fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 600 }}>
            {caller?.username || 'Unknown'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
            Incoming {callType === 'video' ? 'video' : 'voice'} call
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', margin: '2px 0 0', fontSize: 'clamp(10px, 2vw, 12px)' }}>
            {countdown > 0 ? `Ringing for ${countdown}s` : 'Missed'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'clamp(24px, 6vw, 40px)', marginTop: 8 }}>
          <button onClick={onReject} style={{
            width: 'clamp(52px, 10vw, 64px)', height: 'clamp(52px, 10vw, 64px)', borderRadius: '50%', border: 'none',
            background: '#E53935', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(229,57,53,0.4)',
          }}>
            <PhoneOff size={24} color={Colors.white} />
          </button>
          <button onClick={() => onAccept(channelName, callType)} style={{
            width: 'clamp(52px, 10vw, 64px)', height: 'clamp(52px, 10vw, 64px)', borderRadius: '50%', border: 'none',
            background: Colors.green, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
          }}>
            {callType === 'video' ? <Video size={24} color={Colors.white} /> : <Phone size={24} color={Colors.white} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
