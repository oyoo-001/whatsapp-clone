import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing } from '../constants';

const VoiceCallView = ({ user, callState, duration, isMuted, isSpeakerOn }) => {
  return (
    <View style={styles.container}>
      {user?.avatar ? (
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}

      <Text style={styles.username}>{user?.username || 'Unknown'}</Text>
      <Text style={styles.callState}>{callState}</Text>
      <Text style={styles.duration}>{duration}</Text>

      {isMuted && (
        <View style={styles.mutedIndicator}>
          <Ionicons name="mic-off" size={16} color={Colors.white} />
          <Text style={styles.mutedText}>You are muted</Text>
        </View>
      )}

      {isSpeakerOn && (
        <View style={styles.speakerIndicator}>
          <Ionicons name="volume-high" size={16} color={Colors.white} />
          <Text style={styles.mutedText}>Speaker on</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.darkGrey,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 48,
    fontWeight: Fonts.weights.bold,
  },
  username: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.semiBold,
    color: Colors.white,
    marginTop: Spacing.xl,
  },
  callState: {
    fontSize: Fonts.sizes.md,
    color: Colors.lightGrey,
    marginTop: Spacing.sm,
  },
  duration: {
    fontSize: Fonts.sizes.lg,
    color: Colors.lightGrey,
    marginTop: Spacing.xs,
  },
  mutedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    marginTop: Spacing.lg,
  },
  mutedText: {
    color: Colors.white,
    fontSize: Fonts.sizes.sm,
    marginLeft: Spacing.xs,
  },
  speakerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    marginTop: Spacing.sm,
  },
});

export default VoiceCallView;
