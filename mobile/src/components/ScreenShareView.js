import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, BorderRadius } from '../constants';

const ScreenShareView = ({ stream, username }) => {
  if (!stream) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="desktop-outline" size={48} color={Colors.textHint} />
        <Text style={styles.placeholderText}>No screen share available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="desktop" size={16} color={Colors.white} />
        <Text style={styles.headerText}>{username || 'Someone'}'s Screen</Text>
      </View>
      <RTCView
        streamURL={stream.toURL()}
        style={styles.screenVideo}
        objectFit="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerText: {
    color: Colors.white,
    fontSize: Fonts.sizes.xs,
    marginLeft: Spacing.xs,
  },
  screenVideo: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.darkGrey,
    borderRadius: BorderRadius.md,
  },
  placeholderText: {
    color: Colors.textHint,
    fontSize: Fonts.sizes.sm,
    marginTop: Spacing.sm,
  },
});

export default ScreenShareView;
