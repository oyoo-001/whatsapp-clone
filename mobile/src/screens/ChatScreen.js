import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, BorderRadius } from '../constants';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';
import socketService from '../services/socket';

const ChatScreen = ({ navigation, route }) => {
  const { user: chatUser } = route.params;
  const { user: currentUser } = useAuthStore();
  const {
    messages,
    fetchMessages,
    sendMessage,
    loadMoreMessages,
    isLoadingMessages,
    markAsRead,
    addMessage,
  } = useChatStore();
  const [text, setText] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchMessages(chatUser.id);
    markAsRead(chatUser.id);
  }, [chatUser.id]);

  useEffect(() => {
    const unsubMessage = socketService.on('chat:message', ({ from, message, user: msgUser }) => {
      if (from === chatUser.id) {
        addMessage(message);
      }
    });
    const unsubTyping = socketService.on('chat:typing', ({ from, isTyping }) => {
      if (from === chatUser.id) {
        setIsTyping(isTyping);
      }
    });
    return () => {
      unsubMessage();
      unsubTyping();
    };
  }, [chatUser.id]);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);

  const handleSend = async () => {
    if (!text.trim()) return;
    const messageData = {
      receiverId: chatUser.id,
      content: text.trim(),
      messageType: 'text',
    };
    try {
      await sendMessage(messageData);
      socketService.emit('chat:message', { to: chatUser.id, message: messageData });
      setText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleLoadMore = async () => {
    if (messages.length > 0) {
      await loadMoreMessages(chatUser.id, messages[0].createdAt);
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderMessage = ({ item }) => {
    const isMine = item.senderId === currentUser.id;
    return (
      <View style={[styles.messageRow, isMine ? styles.myMessage : styles.theirMessage]}>
        <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {item.messageType === 'text' ? (
            <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
              {item.content}
            </Text>
          ) : (
            <Text style={styles.messageFileText}>{item.messageType} shared</Text>
          )}
          <View style={styles.messageMeta}>
            <Text style={[styles.timeText, isMine ? styles.myTimeText : styles.theirTimeText]}>
              {formatTime(item.createdAt)}
            </Text>
            {isMine && (
              <Ionicons
                name={item.isRead ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.isRead ? Colors.accent : Colors.textSecondary}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderDaySeparator = ({ item }) => {
    if (!item) return null;
    return (
      <View style={styles.daySeparator}>
        <Text style={styles.daySeparatorText}>{formatTime(item.createdAt)}</Text>
      </View>
    );
  };

  const groupedMessages = messages.reduce((acc, msg, index) => {
    const prev = messages[index - 1];
    const sameDay = prev && new Date(msg.createdAt).toDateString() === new Date(prev.createdAt).toDateString();
    if (!sameDay) {
      acc.push({ type: 'day', date: msg.createdAt });
    }
    acc.push({ type: 'message', ...msg });
    return acc;
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.avatarSmall}>
            {chatUser.avatar ? (
              <Image source={{ uri: chatUser.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholderSmall]}>
                <Text style={styles.avatarTextSmall}>
                  {chatUser.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>{chatUser.username}</Text>
            <Text style={styles.headerStatus}>
              {isTyping ? 'typing...' : chatUser.isOnline ? 'online' : 'offline'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="call-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="videocam-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {isLoadingMessages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          renderItem={({ item }) =>
            item.type === 'day' ? renderDaySeparator(item) : renderMessage(item)
          }
          keyExtractor={(item, index) => (item.type === 'day' ? `day-${index}` : item.id?.toString() || index.toString())}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          inverted={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.lightGrey} />
              <Text style={styles.emptyChatText}>Start chatting with {chatUser.username}</Text>
            </View>
          }
        />
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="add" size={28} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.textInputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message"
            placeholderTextColor={Colors.textHint}
            value={text}
            onChangeText={(val) => {
              setText(val);
              socketService.emit('chat:typing', { to: chatUser.id, isTyping: val.length > 0 });
              if (typingTimeout.current) clearTimeout(typingTimeout.current);
              typingTimeout.current = setTimeout(() => {
                socketService.emit('chat:typing', { to: chatUser.id, isTyping: false });
              }, 2000);
            }}
            multiline
            maxLength={4096}
          />
        </View>
        {text.trim() ? (
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={22} color={Colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.voiceButton}>
            <Ionicons name="mic-outline" size={24} color={Colors.grey} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.chatBg,
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  avatarSmall: {
    marginRight: Spacing.sm,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholderSmall: {
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    color: Colors.white,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.bold,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    color: Colors.white,
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.semiBold,
  },
  headerStatus: {
    color: Colors.lightGrey,
    fontSize: Fonts.sizes.xs,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  daySeparator: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  daySeparatorText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    backgroundColor: Colors.lightGrey,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  messageRow: {
    marginVertical: 2,
    flexDirection: 'row',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  theirMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  myBubble: {
    backgroundColor: Colors.sentMsg,
    borderBottomRightRadius: 2,
  },
  theirBubble: {
    backgroundColor: Colors.receivedMsg,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: Fonts.sizes.md,
    lineHeight: 20,
  },
  myMessageText: {
    color: Colors.textPrimary,
  },
  theirMessageText: {
    color: Colors.textPrimary,
  },
  messageFileText: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: Fonts.sizes.xs,
  },
  myTimeText: {
    color: Colors.textSecondary,
  },
  theirTimeText: {
    color: Colors.textSecondary,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyChatText: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.lightGrey,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  attachButton: {
    padding: Spacing.sm,
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.lg,
    maxHeight: 100,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: Fonts.sizes.md,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  voiceButton: {
    padding: Spacing.sm,
  },
});

export default ChatScreen;
