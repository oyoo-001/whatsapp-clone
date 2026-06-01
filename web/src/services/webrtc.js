import { getIceServers } from './api';

const DEBUG = true;
const log = (...args) => DEBUG && console.log('[WebRTC]', ...args);
const warn = (...args) => DEBUG && console.warn('[WebRTC]', ...args);

const PEER_TIMEOUT = 30000;
const ICE_RESTART_TIMEOUT = 5000;
const MAX_NEGOTIATION_RETRIES = 3;

class WebRTCService {
  constructor() {
    this.peerConnections = new Map();
    this.isInitiatorMap = new Map();
    this.pendingCandidates = new Map();
    this.negotiationLocks = new Map();
    this.negotiationRetries = new Map();
    this.localStream = null;
    this.iceServers = null;
    this.channel = null;
    this.isAudioOnly = false;
    this.localUserId = null;
    this.debug = DEBUG;

    this._callbacks = {
      onRemoteStream: null,
      onRemoteLeave: null,
      onTrackCountChange: null,
      onConnectionState: null,
      onIceState: null,
    };

    this._cachedVideoTrack = null;
    this._screenTrackInfo = null;
    this._remoteStreams = new Map();
  }

  on(event, cb) {
    if (event in this._callbacks) {
      this._callbacks[event] = cb;
    }
  }

  off(event) {
    if (event in this._callbacks) {
      this._callbacks[event] = null;
    }
  }

  async getIceConfig() {
    if (this.iceServers) return this.iceServers;
    try {
      const { data } = await getIceServers();
      this.iceServers = data.iceServers;
      log('ICE config loaded:', this.iceServers.length, 'servers');
    } catch {
      this.iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];
      log('Using fallback STUN servers');
    }
    return this.iceServers;
  }

  async startLocalStream(audioOnly = false, constraints = null) {
    this.isAudioOnly = audioOnly;

    const mediaConstraints = constraints || {
      audio: true, // Use basic 'true' for best compatibility across devices
      video: audioOnly ? false : {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 },
        facingMode: 'user'
      },
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      log('Local stream started:', this.localStream.getTracks().length, 'tracks');
      return this.localStream;
    } catch (err) {
      log('getUserMedia error:', err.name, err.message);
      throw err;
    }
  }

  replaceVideoTrack(newTrack) {
    if (!this.localStream) return;
    const oldTrack = this.localStream.getVideoTracks()[0];
    if (oldTrack) {
      this.localStream.removeTrack(oldTrack);
      oldTrack.stop();
    }
    this.localStream.addTrack(newTrack);
    this.peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(newTrack).catch((err) => warn('replaceTrack error:', err));
      }
    });
  }

  createPeerConnectionConfig() {
    return { iceServers: this.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }] };
  }

  async createPeerConnection(userId, socket, isInitiator) {
    if (this.peerConnections.has(userId)) {
      log('PC exists for', userId, '- skipping duplicate');
      return this.peerConnections.get(userId);
    }

    const config = this.createPeerConnectionConfig();
    const pc = new RTCPeerConnection(config);
    this.peerConnections.set(userId, pc);
    this.isInitiatorMap.set(userId, isInitiator);
    this.pendingCandidates.set(userId, this.pendingCandidates.get(userId) || []);
    this.negotiationLocks.set(userId, false);
    this.negotiationRetries.set(userId, 0);

    let connectionLostAt = null;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice-candidate', { to: userId, candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      log('Track received from', userId, 'kind:', event.track?.kind);
      if (!this._remoteStreams) this._remoteStreams = new Map();
      let stream = this._remoteStreams.get(userId);
      if (!stream && event.streams[0]) {
        stream = event.streams[0];
        this._remoteStreams.set(userId, stream);
      } else if (stream && event.track) {
        stream.addTrack(event.track);
      }
      if (this._callbacks.onRemoteStream && stream) {
        this._callbacks.onRemoteStream(userId, stream);
      }
    };

    pc.onnegotiationneeded = async () => {
      if (this.negotiationLocks.get(userId)) return;
      this.negotiationLocks.set(userId, true);
      try {
        await pc.setLocalDescription(await pc.createOffer());
        socket.emit('webrtc:offer', { to: userId, sdp: pc.localDescription.toJSON() });
      } catch (err) {
        warn('negotiationneeded error:', err);
      } finally {
        this.negotiationLocks.set(userId, false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      log('ICE state', userId, ':', state);
      if (this._callbacks.onIceState) {
        this._callbacks.onIceState(userId, state);
      }

      if (state === 'disconnected' || state === 'failed') {
        connectionLostAt = connectionLostAt || Date.now();
        if (Date.now() - connectionLostAt > ICE_RESTART_TIMEOUT) {
          log('ICE restart needed for', userId);
          this._restartIce(userId, pc, socket);
          connectionLostAt = null;
        }
      } else {
        connectionLostAt = null;
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      log('Connection state', userId, ':', state);
      if (this._callbacks.onConnectionState) {
        this._callbacks.onConnectionState(userId, state);
      }

      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (state === 'failed') {
          this._retryPeerConnection(userId, socket);
        } else {
          this._cleanupPeer(userId);
        }
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, this.localStream);
      });
    }

    if (isInitiator) {
      try {
        await pc.setLocalDescription(await pc.createOffer());
        socket.emit('webrtc:offer', { to: userId, sdp: pc.localDescription.toJSON() });
        log('Offer sent to', userId);
      } catch (err) {
        warn('Create offer error:', err);
      }
    }

    return pc;
  }

  async _restartIce(userId, pc, socket) {
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { to: userId, sdp: pc.localDescription.toJSON() });
      log('ICE restart initiated for', userId);
    } catch (err) {
      warn('ICE restart failed:', err);
    }
  }

  async _retryPeerConnection(userId, socket) {
    const retries = this.negotiationRetries.get(userId) || 0;
    if (retries >= MAX_NEGOTIATION_RETRIES) {
      log('Max retries reached for', userId);
      this._cleanupPeer(userId);
      return;
    }
    this.negotiationRetries.set(userId, retries + 1);
    log('Retrying peer connection for', userId, 'attempt', retries + 1);
    this._cleanupPeer(userId);
    await this.createPeerConnection(userId, socket, true);
  }

  async handleOffer(userId, sdp, socket) {
    let pc = this.peerConnections.get(userId);
    if (!pc) {
      log('Creating PC for incoming offer from', userId);
      pc = await this.createPeerConnection(userId, socket, false);
    }

    try {
      if (pc.signalingState !== 'stable') {
        log('Signaling state not stable for', userId, '-', pc.signalingState);
        if (pc.signalingState === 'have-local-offer') {
          if (sdp.type === 'offer' && pc.localDescription?.type === 'offer') {
            const isPolite = !this._isInitiator(userId);
            if (!isPolite) {
              log('Collision - impolite peer received offer, ignoring');
              return;
            }
            await pc.setLocalDescription({ type: 'rollback' });
          } else {
            return;
          }
        } else {
          return;
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      log('Remote description set for', userId, '-', sdp.type);

      if (sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { to: userId, sdp: pc.localDescription.toJSON() });
        log('Answer sent to', userId);
      }

      const candidates = this.pendingCandidates.get(userId) || [];
      if (candidates.length > 0) {
        log('Flushing', candidates.length, 'pending ICE candidates for', userId);
        this.pendingCandidates.set(userId, []);
        for (const candidate of candidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            warn('Failed to add flushed candidate:', err.message);
          }
        }
      }
    } catch (err) {
      warn('handleOffer error for', userId, ':', err.message);
    }
  }

  async handleAnswer(userId, sdp) {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      warn('No PC for answer from', userId);
      return;
    }

    try {
      if (pc.signalingState !== 'have-local-offer') {
        log('Ignoring answer for', userId, '- state:', pc.signalingState);
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      log('Remote description set from answer for', userId);
    } catch (err) {
      warn('handleAnswer error:', err.message);
    }
  }

  async handleIceCandidate(userId, candidate) {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      log('Queuing ICE candidate for', userId, '- no PC yet');
      const queue = this.pendingCandidates.get(userId) || [];
      queue.push(candidate);
      this.pendingCandidates.set(userId, queue);
      return;
    }

    if (!pc.remoteDescription) {
      log('Queuing ICE candidate for', userId, '- no remote description');
      const queue = this.pendingCandidates.get(userId) || [];
      queue.push(candidate);
      this.pendingCandidates.set(userId, queue);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      warn('addIceCandidate error for', userId, ':', err.message);
    }
  }

  _isInitiator(userId) {
    return this.isInitiatorMap.get(userId) === true;
  }

  _cleanupPeer(userId) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
    this.isInitiatorMap.delete(userId);
    this.pendingCandidates.delete(userId);
    this.negotiationLocks.delete(userId);
    this.negotiationRetries.delete(userId);
    if (this._remoteStreams) this._remoteStreams.delete(userId);

    if (this._callbacks.onRemoteLeave) {
      this._callbacks.onRemoteLeave(userId);
    }
    if (this._callbacks.onTrackCountChange) {
      this._callbacks.onTrackCountChange();
    }
  }

  toggleMic(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = enabled;
        log('Mic', enabled ? 'enabled' : 'disabled');
      });
    }
  }

  toggleCamera(enabled) {
    if (this.localStream && !this.isAudioOnly) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = enabled;
        log('Camera', enabled ? 'enabled' : 'disabled');
      });
    }
  }

  async switchCamera() {
    if (this.isAudioOnly || !this.localStream) return;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    const facingMode = videoTrack.getConstraints().facingMode === 'user' ? 'environment' : 'user';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
      });
      const newTrack = stream.getVideoTracks()[0];
      this.replaceVideoTrack(newTrack);
      log('Camera switched to', facingMode);
    } catch (err) {
      warn('Camera switch failed:', err.message);
      throw err;
    }
  }

  async startScreenShare() {
    if (!this.localStream) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      screenTrack.onended = () => {
        this.stopScreenShare().catch(() => {});
      };

      const videoSender = this._findVideoSender();
      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
      }

      this._screenTrackInfo = { track: screenTrack, stream: screenStream };
      log('Screen sharing started');
    } catch (err) {
      warn('Screen share failed:', err.message);
      throw err;
    }
  }

  async stopScreenShare() {
    if (!this._screenTrackInfo) return;
    const { track } = this._screenTrackInfo;
    track.stop();
    this._screenTrackInfo = null;

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
      });
      const newTrack = cameraStream.getVideoTracks()[0];
      this.replaceVideoTrack(newTrack);
      log('Screen share stopped, camera restored');
    } catch (err) {
      warn('Failed to restore camera:', err.message);
    }
  }

  _findVideoSender() {
    let sender = null;
    this.peerConnections.forEach((pc) => {
      const s = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (s) sender = s;
    });
    return sender;
  }

  getLocalVideoTrack() {
    return this.localStream?.getVideoTracks()[0] || null;
  }

  cleanup() {
    log('Cleaning up all peer connections');
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.isInitiatorMap.clear();
    this.pendingCandidates.clear();
    this.negotiationLocks.clear();
    this.negotiationRetries.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this._screenTrackInfo) {
      this._screenTrackInfo.track.stop();
      this._screenTrackInfo = null;
    }

    this.channel = null;
    this._remoteStreams.clear();
    Object.keys(this._callbacks).forEach((key) => {
      this._callbacks[key] = null;
    });

    log('Cleanup complete');
  }
}

export default new WebRTCService();
