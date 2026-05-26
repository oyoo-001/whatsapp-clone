import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, Video, PhoneMissed, ArrowLeft, PhoneIncoming, PhoneOutgoing,
} from 'lucide-react';
import { callsAPI } from '../services/api';
import useAuthStore from '../stores/authStore';
import { Colors } from '../styles/theme';

const CallLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await callsAPI.getHistory();
        setLogs(data.callLogs || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const getCallIcon = (log) => {
    const direction = log.callerId === currentUser.id ? 'outgoing' : 'incoming';
    if (log.callStatus === 'missed' || (log.callStatus === 'rejected' && direction === 'incoming')) {
      return { icon: PhoneMissed, color: Colors.red };
    }
    return { icon: direction === 'outgoing' ? PhoneOutgoing : PhoneIncoming, color: Colors.primary };
  };

  const getCallLabel = (log) => {
    const direction = log.callerId === currentUser.id ? 'outgoing' : 'incoming';
    switch (log.callStatus) {
      case 'missed': return direction === 'outgoing' ? 'No answer' : 'Missed';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      case 'answered': return log.duration ? `${Math.floor(log.duration / 60)}:${String(log.duration % 60).padStart(2, '0')}` : 'Connected';
      default: return log.callStatus;
    }
  };

  const getOtherUser = (log) => log.callerId === currentUser.id ? log.receiver : log.caller;

  const formatDate = (d) => {
    const date = new Date(d);
    const diff = Date.now() - date;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'Yesterday';
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', width: '100%', background: Colors.white }}>
      <header style={{ background: Colors.primary, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', color: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ color: Colors.white, fontSize: 18, fontWeight: 600, margin: 0 }}>Call Logs</h1>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 20 }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '0.5px solid #F0F2F5' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F0F2F5' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '40%', height: 12, background: '#F0F2F5', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ width: '30%', height: 10, background: '#F0F2F5', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: Colors.textSecondary }}>
            <Phone size={56} color="#E9EDEF" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 500, color: Colors.textPrimary }}>No call logs</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Your call history will appear here</p>
          </div>
        ) : (
          logs.map((log) => {
            const other = getOtherUser(log);
            const { icon: Icon, color } = getCallIcon(log);
            return (
              <div key={log.id} onClick={() => other && navigate(`/chat/${other.id}`, { state: { user: other } })}
                style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', borderBottom: '0.5px solid #F0F2F5' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EEF0F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} color={color} />
                </div>
                <div style={{ margin: '0 12px', flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15, color: Colors.textPrimary }}>
                    {other?.username || 'Unknown'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: color }}>
                    <Icon size={12} />
                    <span>{getCallLabel(log)}</span>
                    <span style={{ color: Colors.textHint }}>· {log.callType === 'video' ? 'Video' : 'Voice'} call</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: Colors.textSecondary, flexShrink: 0 }}>{formatDate(log.createdAt)}</span>
                <Phone size={14} color={Colors.primary} style={{ marginLeft: 8, flexShrink: 0 }} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CallLogsPage;