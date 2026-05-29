import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RTCView } from 'react-native-webrtc';
import { Colors, Fonts, Spacing, BorderRadius } from '../constants';
import webrtcService from '../services/webrtc';
import socketService from '../services/socket';
import useAuthStore from '../store/authStore';

const CallScreen = ({ route, navigation }) => {
  const { user: callUser, callType: initialCallType, isIncoming } = route.params;
  const { user: currentUser } = useAuthStore();
  const [callState, setCallState] = useState(isIncoming ? 'ringing' : 'calling');
  const [isVideo, setIsVideo] = useState(initialCallType === 'video');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    startCall();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    const unsubOffer = socketService.on('signal:offer', async ({ from, offer }) => {
      if (from === callUser.id) {
        await webrtcService.handleOffer(from, offer);
      }
    });
    const unsubAnswer = socketService.on('signal:answer', async ({ from, answer }) => {
      if (from === callUser.id) {
        await webrtcService.handleAnswer(from, answer);
      }
    });
    const unsubIce = socketService.on('signal:ice-candidate', async ({ from, candidate }) => {
      if (from === callUser.id) {
        await webrtcService.handleIceCandidate(from, candidate);
      }
    });
    const unsubEnded = socketService.on('call:ended', ({ from }) => {
      if (from === callUser.id) {
        endCall();
      }
    });
    const unsubReject = socketService.on('call:rejected', ({ from }) => {
      if (from === callUser.id) {
        Alert.alert('Call Rejected', `${callUser.username} rejected the call`);
        navigation.goBack();
      }
    });

    webrtcService.onRemoteStream = (userId, stream) => {
      if (userId === callUser.id) {
        setRemoteStream(stream);
      }
    };

    webrtcService.onCallEnded = (userId) => {
      if (userId === callUser.id) {
        endCall();
      }
    };

    return () => {
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubEnded();
      unsubReject();
    };
  }, []);

  const startCall = async () => {
    try {
      const hasPermission = await webrtcService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Camera and microphone permissions are required');
        navigation.goBack();
        return;
      }

      const stream = await webrtcService.getLocalStream(isVideo, true);
      setLocalStream(stream);

      if (!isIncoming) {
        socketService.emit('call:start', { to: callUser.id, callType: isVideo ? 'video' : 'voice' });
        await webrtcService.startCall(callUser.id, isVideo);
        setCallState('calling');
      } else {
        const s = await webrtcService.getLocalStream(isVideo, true);
        setLocalStream(s);
      }

      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start call:', error);
      Alert.alert('Error', 'Failed to start call');
      navigation.goBack();
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await webrtcService.getLocalStream(isVideo, true);
      setCallState('connected');
      socketService.emit('call:accept', { to: callUser.id });

      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const rejectCall = () => {
    socketService.emit('call:reject', { to: callUser.id });
    cleanup();
    navigation.goBack();
  };

  const endCall = () => {
    socketService.emit('call:end', { to: callUser.id });
    cleanup();
    navigation.goBack();
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    webrtcService.cleanup();
  };

  const toggleMute = () => {
    webrtcService.toggleAudio(!isMuted);
    setIsMuted(!isMuted);
    socketService.emit('call:toggle-audio', { to: callUser.id, audioEnabled: !isMuted });
  };

  const toggleVideo = () => {
    webrtcService.toggleVideo(!isVideo);
    setIsVideo(!isVideo);
    socketService.emit('call:toggle-video', { to: callUser.id, videoEnabled: !isVideo });
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStateText = () => {
    switch (callState) {
      case 'calling': return 'Calling...';
      case 'ringing': return 'Incoming...';
      case 'connected': return formatDuration(callDuration);
      default: return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.remoteVideo}>
        {remoteStream ? (
          <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideoStream} objectFit="cover" />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            {callUser.avatar ? (
              <Image source={{ uri: callUser.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {callUser.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.userName}>{callUser.username}</Text>
            <Text style={styles.callState}>{getCallStateText()}</Text>
          </View>
        )}
      </View>

      <View style={styles.localVideoContainer}>
        {localStream && isVideo && (
          <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" />
        )}
      </View>

      {callState === 'ringing' ? (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={rejectCall}>
            <View style={[styles.controlIcon, styles.rejectCall]}>
              <Ionicons name="call" size={28} color={Colors.white} />
            </View>
            <Text style={styles.controlLabel}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={acceptCall}>
            <View style={[styles.controlIcon, styles.acceptCall]}>
              <Ionicons name="call" size={28} color={Colors.white} />
            </View>
            <Text style={styles.controlLabel}>Accept</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.controls}>
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
              <View style={[styles.controlIcon, isMuted && styles.activeControl]}>
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={24}
                  color={Colors.white}
                />
              </View>
              <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleSpeaker}>
              <View style={[styles.controlIcon, isSpeakerOn && styles.activeControl]}>
                <Ionicons
                  name={isSpeakerOn ? 'volume-high' : 'volume-mute'}
                  size={24}
                  color={Colors.white}
                />
              </View>
              <Text style={styles.controlLabel}>{isSpeakerOn ? 'Speaker' : 'Speaker'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
              <View style={[styles.controlIcon, !isVideo && styles.activeControl]}>
                <Ionicons
                  name={isVideo ? 'videocam' : 'videocam-off'}
                  size={24}
                  color={Colors.white}
                />
              </View>
              <Text style={styles.controlLabel}>{isVideo ? 'Video' : 'Video Off'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
            <Ionicons name="call" size={32} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkGrey,
  },
  remoteVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoStream: {
    ...StyleSheet.absoluteFillObject,
  },
  remoteVideoPlaceholder: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 40,
    fontWeight: Fonts.weights.bold,
  },
  userName: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.semiBold,
    color: Colors.white,
    marginTop: Spacing.lg,
  },
  callState: {
    fontSize: Fonts.sizes.md,
    color: Colors.lightGrey,
    marginTop: Spacing.sm,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 120,
    height: 180,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 10,
  },
  localVideo: {
    flex: 1,
  },
  controls: {
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xxl,
  },
  controlButton: {
    alignItems: 'center',
  },
  controlIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeControl: {
    backgroundColor: Colors.red,
  },
  controlLabel: {
    color: Colors.white,
    fontSize: Fonts.sizes.xs,
    marginTop: Spacing.xs,
  },
  acceptCall: {
    backgroundColor: Colors.green,
    transform: [{ rotate: '135deg' }],
  },
  rejectCall: {
    backgroundColor: Colors.red,
    transform: [{ rotate: '135deg' }],
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    transform: [{ rotate: '135deg' }],
  },
});

export default CallScreen;
