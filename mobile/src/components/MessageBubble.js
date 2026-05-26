import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, BorderRadius } from '../constants';

const MessageBubble = ({ message, isSent, onLongPress }) => {
  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderFileMessage = () => {
    switch (message.messageType) {
      case 'image':
        return (
          <Image
            source={{ uri: message.fileUrl }}
            style={styles.imageMessage}
            resizeMode="cover"
          />
        );
      case 'audio':
        return (
          <View style={styles.fileContainer}>
            <Ionicons name="musical-note" size={32} color={Colors.primary} />
            <Text style={styles.fileName}>Audio message</Text>
          </View>
        );
      case 'video':
        return (
          <View style={styles.fileContainer}>
            <Ionicons name="videocam" size={32} color={Colors.primary} />
            <Text style={styles.fileName}>Video message</Text>
          </View>
        );
      case 'file':
        return (
          <View style={styles.fileContainer}>
            <Ionicons name="document" size={32} color={Colors.primary} />
            <Text style={styles.fileName}>Document</Text>
          </View>
        );
      case 'location':
        return (
          <View style={styles.fileContainer}>
            <Ionicons name="location" size={32} color={Colors.red} />
            <Text style={styles.fileName}>Location</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const reactionEntries = message.reactions
    ? Object.entries(message.reactions).filter(([_, emoji]) => emoji)
    : [];

  return (
    <TouchableOpacity
      onLongPress={() => onLongPress?.(message)}
      activeOpacity={0.8}
    >
      <View style={[styles.container, isSent ? styles.sentContainer : styles.receivedContainer]}>
        {message.replyToId && (
          <View style={styles.replyContainer}>
            <Text style={styles.replyText}>Replying to a message</Text>
          </View>
        )}

        {message.messageType !== 'text' && renderFileMessage()}

        {message.content && message.messageType === 'text' && (
          <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>
            {message.content}
          </Text>
        )}

        <View style={styles.metaContainer}>
          {reactionEntries.length > 0 && (
            <View style={styles.reactionsContainer}>
              {reactionEntries.map(([userId, emoji]) => (
                <Text key={userId} style={styles.reactionEmoji}>{emoji}</Text>
              ))}
            </View>
          )}
          <Text style={[styles.timeText, isSent ? styles.sentTime : styles.receivedTime]}>
            {formatTime(message.createdAt)}
            {isSent && (
              <Ionicons
                name={message.isRead ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={message.isRead ? Colors.accent : Colors.textHint}
              />
            )}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginVertical: 2,
  },
  sentContainer: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.sentMsg,
    borderBottomRightRadius: 2,
  },
  receivedContainer: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.receivedMsg,
    borderBottomLeftRadius: 2,
  },
  replyContainer: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    paddingLeft: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  replyText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
  },
  messageText: {
    fontSize: Fonts.sizes.md,
    lineHeight: 20,
  },
  sentText: { color: Colors.textPrimary },
  receivedText: { color: Colors.textPrimary },
  imageMessage: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.sm,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  fileName: {
    marginLeft: Spacing.sm,
    fontSize: Fonts.sizes.sm,
    color: Colors.textPrimary,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginRight: Spacing.xs,
  },
  reactionEmoji: {
    fontSize: 14,
    marginHorizontal: 1,
  },
  timeText: {
    fontSize: Fonts.sizes.xs,
  },
  sentTime: { color: Colors.textHint },
  receivedTime: { color: Colors.textHint },
});

export default MessageBubble;
