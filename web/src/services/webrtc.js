import socketService from './socket';

const pendingOffers = new Map();

const CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

const AUDIO_CONSTRAINTS = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  video: false,
};

const VIDEO_CONSTRAINTS = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  video: { width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 }, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' },
};

class WebRTCService {
  constructor() {
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onRemoteStream = null;
    this.onCallEnded = null;
    this.pendingCandidates = [];
    this.pendingOffer = null;
    this.onOfferReady = null;
    this.activeCallInfo = null;
    this.remoteUserId = null;
  }

  async startCall(userId, isVideo) {
    this.remoteUserId = userId;
    this.pc = new RTCPeerConnection(CONFIG);
    this.setupPcListeners(userId, this.pc);

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(isVideo ? VIDEO_CONSTRAINTS : AUDIO_CONSTRAINTS);
    } catch { return false; }

    this.localStream.getTracks().forEach((t) => this.pc.addTrack(t, this.localStream));

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    socketService.emit('signal:offer', { to: userId, offer: this.pc.localDescription });
    this.addPendingCandidates(this.pc);
    return true;
  }

  async handleOffer(from, offer) {
    this.remoteUserId = from;

    if (!this.pc || this.pc.connectionState === 'closed') {
      this.pc = new RTCPeerConnection(CONFIG);
      this.setupPcListeners(from, this.pc);
    }

    this.pendingOffer = { from, offer };
    const desc = new RTCSessionDescription(offer);

    if (this.pc.localDescription) {
      await this.pc.setRemoteDescription(desc);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      socketService.emit('signal:answer', { to: from, answer: this.pc.localDescription });
      this.addPendingCandidates(this.pc);
    } else {
      await this.pc.setRemoteDescription(desc);
      if (this.onOfferReady) this.onOfferReady(from);
    }
  }

  async acceptCall(isVideo) {
    if (!this.pc || !this.pendingOffer) return false;

    const from = this.pendingOffer.from;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(isVideo ? VIDEO_CONSTRAINTS : AUDIO_CONSTRAINTS);
    } catch { return false; }

    this.localStream.getTracks().forEach((t) => {
      const sender = this.pc.getSenders().find((s) => s.track?.kind === t.kind && !s.track);
      if (sender) sender.replaceTrack(t);
      else this.pc.addTrack(t, this.localStream);
    });

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    socketService.emit('signal:answer', { to: from, answer: this.pc.localDescription });
    this.addPendingCandidates(this.pc);
    this.pendingOffer = null;
    return true;
  }

  async handleAnswer(from, answer) {
    if (this.pc) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      this.addPendingCandidates(this.pc);
    }
  }

  async handleIceCandidate(from, candidate) {
    const candidateObj = new RTCIceCandidate(candidate);
    if (!this.pc) { this.pendingCandidates.push(candidateObj); return; }
    try {
      if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
        await this.pc.addIceCandidate(candidateObj);
      } else {
        this.pendingCandidates.push(candidateObj);
      }
    } catch (e) { console.warn('ICE candidate add failed:', e); }
  }

  addPendingCandidates(pc) {
    pc = pc || this.pc;
    if (this.pendingCandidates.length > 0 && pc && pc.remoteDescription) {
      const cands = this.pendingCandidates.splice(0);
      cands.forEach((c) => pc.addIceCandidate(c).catch(() => {}));
    }
  }

  setupPcListeners(userId, pc) {
    let candidateBuffer = [];
    let candidateTimer = null;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        candidateBuffer.push(e.candidate);
        if (!candidateTimer) {
          candidateTimer = setTimeout(() => {
            candidateBuffer.forEach((c) => socketService.emit('signal:ice-candidate', { to: userId, candidate: c }));
            candidateBuffer = [];
            candidateTimer = null;
          }, 30);
        }
      }
    };

    pc.ontrack = (e) => {
      if (!this.remoteStream) {
        this.remoteStream = e.streams[0];
      } else {
        e.streams[0].getTracks().forEach((t) => {
          if (!this.remoteStream.getTracks().find((ot) => ot.id === t.id)) {
            this.remoteStream.addTrack(t);
          }
        });
      }
      if (this.onRemoteStream) this.onRemoteStream(userId, this.remoteStream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        if (this.onCallEnded) this.onCallEnded(userId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };
  }

  toggleAudio(enabled) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  async toggleVideo(enabled) {
    if (!this.pc || !this.localStream) return;
    const videoTracks = this.localStream.getVideoTracks();
    if (enabled && videoTracks.length === 0) {
      try {
        const vs = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 }, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' } });
        const vt = vs.getVideoTracks()[0];
        this.localStream.addTrack(vt);
        this.pc.addTrack(vt, this.localStream);
        const offer = await this.pc.createOffer({ iceRestart: true });
        await this.pc.setLocalDescription(offer);
        socketService.emit('signal:offer', { to: this.remoteUserId, offer: this.pc.localDescription });
      } catch (e) { console.warn('toggleVideo on fail:', e); }
    } else if (!enabled && videoTracks.length > 0) {
      videoTracks.forEach((t) => { t.stop(); this.localStream.removeTrack(t); });
      const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) this.pc.removeTrack(sender);
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      socketService.emit('signal:offer', { to: this.remoteUserId, offer: this.pc.localDescription });
    } else {
      videoTracks.forEach((t) => (t.enabled = enabled));
    }
  }

  switchSpeaker(toSpeaker) {
    if (this.remoteStream) {
      const audio = document.querySelector('audio.remote-audio');
      if (audio && audio.setSinkId) audio.setSinkId(toSpeaker ? 'speaker' : 'default').catch(() => {});
    }
  }

  get isCallActive() {
    return this.pc !== null && this.pc.connectionState !== 'closed' && this.pc.connectionState !== 'disconnected' && this.pc.connectionState !== 'failed';
  }

  bufferOffer(from, offer) { pendingOffers.set(from, { from, offer }); }

  consumePendingOffer(userId) {
    const offer = pendingOffers.get(userId);
    if (offer) pendingOffers.delete(userId);
    return offer;
  }

  cleanup() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    if (this.pc) this.pc.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.pendingCandidates = [];
    this.pendingOffer = null;
    this.activeCallInfo = null;
    this.remoteUserId = null;
  }
}

export default new WebRTCService();