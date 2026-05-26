import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RTCView } from 'react-native-webrtc';
import { Colors, Fonts, Spacing, BorderRadius } from '../constants';
import webrtcService from '../services/webrtc';
import socketService from '../services/socket';
import useAuthStore from '../store/authStore';

const MeetingScreen = ({ route, navigation }) => {
  const { meetingId: initialMeetingId } = route.params || {};
  const { user: currentUser } = useAuthStore();
  const [meetingId, setMeetingId] = useState(initialMeetingId || '');
  const [isHost, setIsHost] = useState(!initialMeetingId);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [createMeetingId, setCreateMeetingId] = useState('');
  const [joinMeetingId, setJoinMeetingId] = useState('');

  useEffect(() => {
    setupMeeting();
    return () => {
      leaveMeeting();
    };
  }, []);

  useEffect(() => {
    const unsubParticipants = socketService.on('meeting:participants', ({ participants: p }) => {
      setParticipants(p);
    });
    const unsubJoined = socketService.on('meeting:user-joined', ({ userId, user }) => {
      setParticipants((prev) => [...prev, { userId, user, audioEnabled: true, videoEnabled: true, screenSharing: false }]);
    });
    const unsubLeft = socketService.on('meeting:user-left', ({ userId }) => {
      setParticipants((prev) => prev.filter((p) => p.user.id !== userId));
    });
    const unsubScreenShare = socketService.on('meeting:screen-share-state', ({ userId, sharing }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.user.id === userId ? { ...p, screenSharing: sharing } : p))
      );
    });
    const unsubPresentation = socketService.on('presentation:started', ({ from, slideData }) => {
      setIsPresenting(true);
      setCurrentSlide(0);
    });
    const unsubSlide = socketService.on('presentation:slide-changed', ({ from, slideIndex }) => {
      setCurrentSlide(slideIndex);
    });
    const unsubPresentationEnd = socketService.on('presentation:ended', ({ from }) => {
      setIsPresenting(false);
      setCurrentSlide(0);
    });

    webrtcService.onRemoteStream = (userId, stream) => {
    };

    return () => {
      unsubParticipants();
      unsubJoined();
      unsubLeft();
      unsubScreenShare();
      unsubPresentation();
      unsubSlide();
      unsubPresentationEnd();
    };
  }, []);

  const setupMeeting = async () => {
    try {
      const stream = await webrtcService.getLocalStream(true, true);
      setLocalStream(stream);

      if (isHost && meetingId) {
        socketService.emit('meeting:create', { meetingId, name: currentUser.username });
      } else if (!isHost && meetingId) {
        socketService.emit('meeting:join', { meetingId });
      }
    } catch (error) {
      console.error('Failed to setup meeting:', error);
      Alert.alert('Error', 'Failed to setup meeting');
    }
  };

  const createMeeting = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setMeetingId(id);
    setIsHost(true);
    setCreateMeetingId(id);
    socketService.emit('meeting:create', { meetingId: id, name: currentUser.username });
    setupMeeting();
  };

  const joinMeeting = () => {
    if (!joinMeetingId.trim()) {
      Alert.alert('Error', 'Please enter a meeting ID');
      return;
    }
    setMeetingId(joinMeetingId.trim().toUpperCase());
    setIsHost(false);
    socketService.emit('meeting:join', { meetingId: joinMeetingId.trim().toUpperCase() });
    setupMeeting();
  };

  const leaveMeeting = () => {
    if (meetingId) {
      socketService.emit('meeting:leave', { meetingId });
    }
    webrtcService.cleanup();
    navigation.goBack();
  };

  const toggleAudio = () => {
    webrtcService.toggleAudio(!isAudioOn);
    setIsAudioOn(!isAudioOn);
  };

  const toggleVideo = () => {
    webrtcService.toggleVideo(!isVideoOn);
    setIsVideoOn(!isVideoOn);
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        await webrtcService.getScreenStream();
        setIsScreenSharing(true);
        socketService.emit('meeting:screen-share', { meetingId, sharing: true });
      } catch (error) {
        Alert.alert('Error', 'Screen sharing failed');
      }
    } else {
      webrtcService.screenStream?.getTracks().forEach((t) => t.stop());
      webrtcService.screenStream = null;
      setIsScreenSharing(false);
      socketService.emit('meeting:screen-share', { meetingId, sharing: false });
    }
  };

  const startPresentation = () => {
    setIsPresenting(true);
    setCurrentSlide(0);
    socketService.emit('presentation:start', { meetingId, slideData: { title: 'Presentation' } });
  };

  const nextSlide = () => {
    const next = currentSlide + 1;
    setCurrentSlide(next);
    socketService.emit('presentation:next', { meetingId, slideIndex: next });
  };

  const prevSlide = () => {
    const prev = Math.max(0, currentSlide - 1);
    setCurrentSlide(prev);
    socketService.emit('presentation:prev', { meetingId, slideIndex: prev });
  };

  const endPresentation = () => {
    setIsPresenting(false);
    setCurrentSlide(0);
    socketService.emit('presentation:end', { meetingId });
  };

  const renderParticipant = ({ item }) => (
    <View style={styles.participantCard}>
      <View style={[styles.participantAvatar, { backgroundColor: Colors.primary }]}>
        <Text style={styles.participantAvatarText}>
          {item.user.username.charAt(0).toUpperCase()}
        </Text>
        {item.screenSharing && (
          <View style={styles.sharingBadge}>
            <Ionicons name="desktop" size={12} color={Colors.white} />
          </View>
        )}
      </View>
      <Text style={styles.participantName} numberOfLines={1}>
        {item.user.username}
        {item.user.id === currentUser.id ? ' (You)' : ''}
      </Text>
      <View style={styles.participantStatus}>
        {item.audioEnabled ? (
          <Ionicons name="mic" size={14} color={Colors.green} />
        ) : (
          <Ionicons name="mic-off" size={14} color={Colors.red} />
        )}
        {item.videoEnabled ? (
          <Ionicons name="videocam" size={14} color={Colors.green} style={{ marginLeft: 4 }} />
        ) : (
          <Ionicons name="videocam-off" size={14} color={Colors.red} style={{ marginLeft: 4 }} />
        )}
      </View>
    </View>
  );

  if (!meetingId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meetings</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.meetingSetup}>
          <View style={styles.setupCard}>
            <Ionicons name="add-circle" size={40} color={Colors.primary} />
            <Text style={styles.setupTitle}>Create a Meeting</Text>
            <TouchableOpacity style={styles.setupButton} onPress={createMeeting}>
              <Text style={styles.setupButtonText}>Create Now</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.setupCard}>
            <Ionicons name="enter" size={40} color={Colors.accent} />
            <Text style={styles.setupTitle}>Join a Meeting</Text>
            <TextInput
              style={styles.meetingIdInput}
              placeholder="Enter Meeting ID"
              placeholderTextColor={Colors.textHint}
              value={joinMeetingId}
              onChangeText={setJoinMeetingId}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.setupButton, styles.joinButton]}
              onPress={joinMeeting}
            >
              <Text style={styles.setupButtonText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.meetingHeader}>
        <Text style={styles.meetingIdText}>Meeting: {meetingId}</Text>
        <Text style={styles.meetingParticipants}>
          {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {isPresenting ? (
        <View style={styles.presentationArea}>
          <View style={styles.presentationContent}>
            <Text style={styles.presentationTitle}>Presentation</Text>
            <Text style={styles.slideNumber}>Slide {currentSlide + 1}</Text>
            <Text style={styles.slideContent}>Presentation content goes here</Text>
          </View>
          <View style={styles.presentationControls}>
            <TouchableOpacity onPress={prevSlide} style={styles.slideButton}>
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.slideIndicator}>{currentSlide + 1}</Text>
            <TouchableOpacity onPress={nextSlide} style={styles.slideButton}>
              <Ionicons name="chevron-forward" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
          {isHost && (
            <TouchableOpacity style={styles.endPresentationBtn} onPress={endPresentation}>
              <Ionicons name="stop-circle" size={20} color={Colors.white} />
              <Text style={styles.endPresentationText}>End Presentation</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={participants}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.user.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.participantsGrid}
          ListEmptyComponent={
            <View style={styles.emptyMeeting}>
              <Ionicons name="people-outline" size={48} color={Colors.textHint} />
              <Text style={styles.emptyText}>Waiting for participants...</Text>
            </View>
          }
        />
      )}

      <View style={styles.meetingControls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.meetingControl} onPress={toggleAudio}>
            <View style={[styles.controlCircle, !isAudioOn && styles.controlOff]}>
              <Ionicons name={isAudioOn ? 'mic' : 'mic-off'} size={22} color={Colors.white} />
            </View>
            <Text style={styles.controlLabel}>
              {isAudioOn ? 'Mute' : 'Unmute'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.meetingControl} onPress={toggleVideo}>
            <View style={[styles.controlCircle, !isVideoOn && styles.controlOff]}>
              <Ionicons name={isVideoOn ? 'videocam' : 'videocam-off'} size={22} color={Colors.white} />
            </View>
            <Text style={styles.controlLabel}>
              {isVideoOn ? 'Video' : 'Video Off'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.meetingControl} onPress={toggleScreenShare}>
            <View style={[styles.controlCircle, isScreenSharing && styles.controlActive]}>
              <Ionicons name="desktop" size={22} color={Colors.white} />
            </View>
            <Text style={styles.controlLabel}>Share</Text>
          </TouchableOpacity>
          {isHost && (
            <TouchableOpacity style={styles.meetingControl} onPress={startPresentation}>
              <View style={[styles.controlCircle, isPresenting && styles.controlActive]}>
                <Ionicons name="easel" size={22} color={Colors.white} />
              </View>
              <Text style={styles.controlLabel}>Present</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.endMeetingContainer}>
          <TouchableOpacity style={styles.endMeetingBtn} onPress={leaveMeeting}>
            <Ionicons name="call" size={28} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkGrey,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: Colors.white,
  },
  meetingSetup: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  setupCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  setupTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.semiBold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  setupButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: BorderRadius.round,
  },
  joinButton: {
    backgroundColor: Colors.accent,
  },
  setupButtonText: {
    color: Colors.white,
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.semiBold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xxl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.lightGrey,
  },
  dividerText: {
    marginHorizontal: Spacing.lg,
    color: Colors.textSecondary,
    fontWeight: Fonts.weights.semiBold,
  },
  meetingIdInput: {
    backgroundColor: Colors.lighterGrey,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: Fonts.sizes.lg,
    color: Colors.textPrimary,
    width: '100%',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: Spacing.lg,
  },
  meetingHeader: {
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  meetingIdText: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.white,
  },
  meetingParticipants: {
    fontSize: Fonts.sizes.sm,
    color: Colors.lightGrey,
    marginTop: 2,
  },
  participantsGrid: {
    padding: Spacing.sm,
    flexGrow: 1,
  },
  participantCard: {
    flex: 1,
    backgroundColor: Colors.darkGrey,
    borderRadius: BorderRadius.lg,
    margin: Spacing.xs,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantAvatarText: {
    color: Colors.white,
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
  },
  sharingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantName: {
    color: Colors.white,
    fontSize: Fonts.sizes.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  participantStatus: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  emptyMeeting: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: Colors.textHint,
    fontSize: Fonts.sizes.md,
    marginTop: Spacing.md,
  },
  presentationArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  presentationContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    width: '100%',
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presentationTitle: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  slideNumber: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  slideContent: {
    fontSize: Fonts.sizes.lg,
    color: Colors.textPrimary,
  },
  presentationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  slideButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: Spacing.md,
    borderRadius: BorderRadius.round,
  },
  slideIndicator: {
    color: Colors.white,
    fontSize: Fonts.sizes.lg,
    marginHorizontal: Spacing.xl,
  },
  endPresentationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.red,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.round,
    marginTop: Spacing.lg,
  },
  endPresentationText: {
    color: Colors.white,
    marginLeft: Spacing.sm,
    fontWeight: Fonts.weights.medium,
  },
  meetingControls: {
    backgroundColor: Colors.darkGrey,
    paddingBottom: Spacing.xxxl,
    paddingTop: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
  },
  meetingControl: {
    alignItems: 'center',
  },
  controlCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlOff: {
    backgroundColor: Colors.red,
  },
  controlActive: {
    backgroundColor: Colors.green,
  },
  controlLabel: {
    color: Colors.white,
    fontSize: Fonts.sizes.xs,
    marginTop: Spacing.xs,
  },
  endMeetingContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  endMeetingBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MeetingScreen;
