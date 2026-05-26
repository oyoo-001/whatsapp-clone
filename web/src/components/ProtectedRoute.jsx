import { useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import socketService from '../services/socket';
import webrtcService from '../services/webrtc';
import useCallStore from '../stores/callStore';
import { playRingtone, stopRingtone } from '../services/notificationSound';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const { activeCall } = useCallStore();
  const navigate = useNavigate();
  const ringingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubIncoming = socketService.on('call:incoming', ({ from, callType, user, callLogId }) => {
      playRingtone();
      ringingRef.current = true;

      if (activeCall) {
        if (!window.confirm(`${user?.username || 'User'} is calling. Put current call on hold and answer?`)) return;
        if (webrtcService.localStream) {
          webrtcService.localStream.getAudioTracks().forEach((t) => (t.enabled = false));
        }
      }
      stopRingtone();
      ringingRef.current = false;
      navigate(`/call/${from}`, {
        state: { user, callType, isIncoming: true, callLogId },
      });
    });

    const unsubOffer = socketService.on('signal:offer', ({ from, offer }) => {
      webrtcService.bufferOffer(from, offer);
    });

    const unsubEnded = socketService.on('call:ended', () => {
      if (ringingRef.current) {
        stopRingtone();
        ringingRef.current = false;
      }
    });

    return () => { unsubIncoming(); unsubOffer(); unsubEnded(); };
  }, [isAuthenticated, activeCall]);

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;