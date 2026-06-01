import { useEffect, useState, useRef, useCallback } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import socketService from '../services/socket';
import { callsAPI } from '../services/api';
import IncomingCallModal from './IncomingCallModal';
import { playRingtone, stopRingtone } from '../services/notificationSound';

const RING_TIMEOUT = 30000;

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [incomingCall, setIncomingCall] = useState(null);
  const ringingRef = useRef(false);
  const timerRef = useRef(null);
  const callLogIdRef = useRef(null);

  const clearIncoming = useCallback(() => {
    stopRingtone();
    ringingRef.current = false;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setIncomingCall(null);
    callLogIdRef.current = null;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (location.pathname.startsWith('/call/') || location.pathname.startsWith('/voice-call/') || location.pathname.startsWith('/video-call/') || location.pathname.startsWith('/group-call/')) return;

    const unsubIncoming = socketService.on('call:incoming', async ({ from, user, channelName, callType, startedAt }) => {
      playRingtone();
      ringingRef.current = true;
      setIncomingCall({ caller: user, callType, channelName, callerId: from, startedAt });

      try {
        const { data } = await callsAPI.initiateCall({
          receiverId: from,
          callType,
        });
        callLogIdRef.current = data.callLog.id;
      } catch {}

      timerRef.current = setTimeout(async () => {
        stopRingtone();
        ringingRef.current = false;
        if (callLogIdRef.current) {
          try { await callsAPI.updateCallStatus(callLogIdRef.current, 'missed'); } catch {}
        }
        socketService.emit('call:timeout', { to: from });
        setIncomingCall(null);
        callLogIdRef.current = null;
      }, RING_TIMEOUT);
    });

    const unsubEnded = socketService.on('call:ended', () => {
      clearIncoming();
    });

    const unsubAccepted = socketService.on('call:accepted', () => {
      clearIncoming();
    });

    return () => {
      unsubIncoming();
      unsubEnded();
      unsubAccepted();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, location.pathname, clearIncoming]);

  const handleAccept = async (channelName, callType) => {
    stopRingtone();
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const callerId = incomingCall?.callerId;
    const logId = callLogIdRef.current;
    if (logId) {
      try { await callsAPI.updateCallStatus(logId, 'answered'); } catch {}
    }
    setIncomingCall(null);
    callLogIdRef.current = null;
    socketService.emit('call:accept', { to: callerId, channelName });
    const route = callType === 'voice' ? 'voice-call' : 'video-call';
    navigate(`/${route}/${channelName}`, {
      state: {
        name: incomingCall?.caller?.username,
        callType,
        caller: false,
        remoteUserId: callerId,
        callLogId: logId,
        startedAt: incomingCall?.startedAt,
        remoteAvatar: incomingCall?.caller?.avatar || null,
      },
    });
  };

  const handleReject = () => {
    stopRingtone();
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (incomingCall) {
      if (callLogIdRef.current) {
        try { callsAPI.updateCallStatus(callLogIdRef.current, 'rejected'); } catch {}
      }
      socketService.emit('call:reject', { to: incomingCall.callerId });
    }
    setIncomingCall(null);
    callLogIdRef.current = null;
  };

  return (
    <>
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.caller}
          callType={incomingCall.callType}
          channelName={incomingCall.channelName}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
      {isAuthenticated ? children : <Navigate to="/login" replace />}
    </>
  );
};

export default ProtectedRoute;
