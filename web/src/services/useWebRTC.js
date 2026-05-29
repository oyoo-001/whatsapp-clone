import { useEffect, useRef, useState } from 'react';
import webrtcService from './webrtc';
import socketService from './socket';

export function useLocalStream(audioOnly = false) {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    webrtcService.startLocalStream(audioOnly)
      .then((s) => {
        if (!cancelled) {
          setStream(s);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not access media devices');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [audioOnly]);

  return { stream, error, loading };
}

export function useWebRTCSignaling({ channelName, isCaller, remoteUserId, onRemoteStream, onRemoteLeave, onCallAccepted, onCallRejected, onCallEnded, onCallTimedout }) {
  const connectedRef = useRef(false);
  const remoteUserIdRef = useRef(remoteUserId);
  remoteUserIdRef.current = remoteUserId;
  const callbacksRef = useRef({ onRemoteStream, onRemoteLeave, onCallAccepted, onCallRejected, onCallEnded, onCallTimedout });
  callbacksRef.current = { onRemoteStream, onRemoteLeave, onCallAccepted, onCallRejected, onCallEnded, onCallTimedout };

  const createPeerConnectionAsCaller = useRef(() => {
    const uid = remoteUserIdRef.current;
    if (!uid) return;
    webrtcService.createPeerConnection(uid, socketService, true)
      .then(() => webrtcService.createDataChannel?.(uid))
      .catch((err) => console.error('Failed to create PC as caller:', err));
  });

  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    let unsubs = [];

    const u1 = socketService.on('webrtc:offer', async ({ from, sdp }) => {
      const exists = webrtcService.peerConnections.has(from);
      if (!exists) {
        await webrtcService.createPeerConnection(from, socketService, false);
      }
      await webrtcService.handleOffer(from, sdp, socketService);
    });
    unsubs.push(u1);

    const u2 = socketService.on('webrtc:answer', async ({ from, sdp }) => {
      await webrtcService.handleAnswer(from, sdp);
    });
    unsubs.push(u2);

    const u3 = socketService.on('webrtc:ice-candidate', async ({ from, candidate }) => {
      await webrtcService.handleIceCandidate(from, candidate);
    });
    unsubs.push(u3);

    const u4 = socketService.on('call:accepted', ({ from }) => {
      createPeerConnectionAsCaller.current();
      if (callbacksRef.current.onCallAccepted) callbacksRef.current.onCallAccepted(from);
    });
    unsubs.push(u4);

    const u5 = socketService.on('call:rejected', () => {
      if (callbacksRef.current.onCallRejected) callbacksRef.current.onCallRejected();
    });
    unsubs.push(u5);

    const u6 = socketService.on('call:ended', () => {
      if (callbacksRef.current.onCallEnded) callbacksRef.current.onCallEnded();
    });
    unsubs.push(u6);

    const u7 = socketService.on('call:timedout', () => {
      if (callbacksRef.current.onCallTimedout) callbacksRef.current.onCallTimedout();
    });
    unsubs.push(u7);

    webrtcService.on('onRemoteStream', (userId, stream) => {
      if (callbacksRef.current.onRemoteStream) callbacksRef.current.onRemoteStream(userId, stream);
    });

    webrtcService.on('onRemoteLeave', (userId) => {
      if (callbacksRef.current.onRemoteLeave) callbacksRef.current.onRemoteLeave(userId);
    });

    return () => {
      unsubs.forEach((u) => u());
      webrtcService.off('onRemoteStream');
      webrtcService.off('onRemoteLeave');
      connectedRef.current = false;
    };
  }, [channelName]);
}

export function useGroupSignaling({ channelName, memberIds, localUserId }) {
  const joinedRef = useRef(false);
  const [participants, setParticipants] = useState([]);
  const [groupError, setGroupError] = useState(null);

  useEffect(() => {
    let unsubs = [];
    let cancelled = false;

    const join = () => {
      if (!joinedRef.current && localUserId) {
        joinedRef.current = true;
        socketService.emit('webrtc:group-join', { channel: channelName });
      }
    };

    const u1 = socketService.on('webrtc:room-users', async ({ users }) => {
      if (cancelled) return;
      const currentParticipants = [];
      for (const u of users) {
        if (u.userId !== localUserId) {
          currentParticipants.push({ id: u.userId, user: u.user });
          const exists = webrtcService.peerConnections.has(u.userId);
          if (!exists) {
            await webrtcService.createPeerConnection(u.userId, socketService, true);
          }
        }
      }
      if (!cancelled) setParticipants(currentParticipants);
    });
    unsubs.push(u1);

    const u2 = socketService.on('webrtc:group-user-joined', async ({ userId: uid, user }) => {
      if (cancelled || uid === localUserId) return;
      const exists = webrtcService.peerConnections.has(uid);
      if (!exists) {
        await webrtcService.createPeerConnection(uid, socketService, true);
      }
      if (!cancelled) {
        setParticipants((prev) => {
          if (prev.some((p) => p.id === uid)) return prev;
          return [...prev, { id: uid, user }];
        });
      }
    });
    unsubs.push(u2);

    const u3 = socketService.on('webrtc:group-user-left', ({ userId: uid }) => {
      if (cancelled || uid === localUserId) return;
      webrtcService._cleanupPeer(uid);
      if (!cancelled) {
        setParticipants((prev) => prev.filter((p) => p.id !== uid));
      }
    });
    unsubs.push(u3);

    const u4 = socketService.on('webrtc:offer', async ({ from, sdp }) => {
      if (cancelled || from === localUserId) return;
      const exists = webrtcService.peerConnections.has(from);
      if (!exists) {
        await webrtcService.createPeerConnection(from, socketService, false);
      }
      await webrtcService.handleOffer(from, sdp, socketService);
    });
    unsubs.push(u4);

    const u5 = socketService.on('webrtc:room-full', ({ message }) => {
      if (!cancelled) setGroupError(message);
    });
    unsubs.push(u5);

    const u6 = socketService.on('webrtc:answer', async ({ from, sdp }) => {
      if (cancelled || from === localUserId) return;
      await webrtcService.handleAnswer(from, sdp);
    });
    unsubs.push(u6);

    const u7 = socketService.on('webrtc:ice-candidate', async ({ from, candidate }) => {
      if (cancelled || from === localUserId) return;
      await webrtcService.handleIceCandidate(from, candidate);
    });
    unsubs.push(u7);

    join();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
      socketService.emit('webrtc:group-leave', { channel: channelName });
      joinedRef.current = false;
    };
  }, [channelName, localUserId]);

  return { participants, setParticipants, groupError };
}
