import { Platform, PermissionsAndroid } from 'react-native';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
} from 'react-native-webrtc';
import socketService from './socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'credential',
    },
  ],
  iceCandidatePoolSize: 10,
};

class WebRTCService {
  constructor() {
    this.peerConnections = new Map();
    this.localStream = null;
    this.screenStream = null;
    this.onRemoteStream = null;
    this.onCallEnded = null;
    this.onConnectionStateChange = null;
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        return (
          grants['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }
    return true;
  }

  async getLocalStream(video = true, audio = true) {
    try {
      const sourceInfos = await mediaDevices.enumerateDevices();
      const facing = 'user';

      this.localStream = await mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: video
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
              facingMode: facing,
            }
          : false,
      });

      return this.localStream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }

  async getScreenStream() {
    try {
      this.screenStream = await mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      return this.screenStream;
    } catch (error) {
      console.error('Error getting screen stream:', error);
      throw error;
    }
  }

  createPeerConnection(userId, isCaller = false) {
    if (this.peerConnections.has(userId)) {
      this.closeConnection(userId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('signal:ice-candidate', {
          to: userId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (this.onRemoteStream) {
        this.onRemoteStream(userId, event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, pc.connectionState);
      }
      if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        this.closeConnection(userId);
        if (this.onCallEnded) {
          this.onCallEnded(userId);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE state with ${userId}: ${pc.iceConnectionState}`);
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          pc.addTrack(track, this.localStream);
        }
      });
    }

    this.peerConnections.set(userId, pc);
    return pc;
  }

  async startCall(userId, isVideo = true) {
    try {
      const pc = this.createPeerConnection(userId, true);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });

      await pc.setLocalDescription(offer);

      socketService.emit('signal:offer', {
        to: userId,
        offer: { type: offer.type, sdp: offer.sdp },
      });

      return pc;
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  async handleOffer(from, offer) {
    try {
      const pc = this.createPeerConnection(from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.emit('signal:answer', {
        to: from,
        answer: { type: answer.type, sdp: answer.sdp },
      });

      return pc;
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  async handleAnswer(from, answer) {
    try {
      const pc = this.peerConnections.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(from, candidate) {
    try {
      const pc = this.peerConnections.get(from);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      throw error;
    }
  }

  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  async switchCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack._switchCamera();
      }
    }
  }

  closeConnection(userId) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
  }

  cleanup() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
  }
}

export default new WebRTCService();
