import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { BorderRadius } from '../constants';

const VideoCallView = ({ stream, isLocal = false, style }) => {
  if (!stream) return null;

  return (
    <View style={[styles.container, style]}>
      <RTCView
        streamURL={stream.toURL()}
        style={styles.video}
        objectFit={isLocal ? 'cover' : 'contain'}
        mirror={isLocal}
        zOrder={isLocal ? 1 : 0}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default VideoCallView;
