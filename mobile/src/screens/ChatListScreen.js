import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, BorderRadius } from '../constants';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';
import socketService from '../services/socket';

const ChatListScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const {
    conversations,
    fetchConversations,
    isLoading,
  } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    const unsubscribe = socketService.on('chat:message', ({ from, message, user: msgUser }) => {
      fetchConversations();
    });
    return unsubscribe;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, []);

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderConversation = ({ item }) => {
    const isUnread = item.unreadCount > 0;
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() =>
          navigation.navigate('Chat', {
            user: item.user,
          })
        }
        onLongPress={() => {
          Alert.alert(item.user.username, 'More options coming soon');
        }}
      >
        <View style={styles.avatarContainer}>
          {item.user.avatar ? (
            <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {item.user.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {item.user.isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {item.user.username}
            </Text>
            <Text style={styles.timeText}>
              {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ''}
            </Text>
          </View>
          <View style={styles.conversationPreview}>
            <Text style={[styles.previewText, isUnread && styles.unreadText]} numberOfLines={1}>
              {item.lastMessage?.messageType === 'text'
                ? item.lastMessage.content
                : item.lastMessage
                  ? `${item.lastMessage.messageType}`
                  : 'Start chatting'}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WhatsApp Clone</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle-outline" size={28} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={Colors.textHint}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={styles.activeTab}>
          <Text style={styles.activeTabText}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Unread</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Favorites</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Groups</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.user.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={filteredConversations.length === 0 ? styles.emptyContainer : null}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={Colors.lightGrey} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Search for users to start chatting
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Alert.alert('New Chat', 'Search for a user to start a conversation');
        }}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: Colors.white,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lighterGrey,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: Fonts.sizes.md,
    color: Colors.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  activeTab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: Fonts.weights.semiBold,
    fontSize: Fonts.sizes.md,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.online,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  conversationInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.medium,
    color: Colors.textPrimary,
    flex: 1,
  },
  timeText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  conversationPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  previewText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  unreadText: {
    fontWeight: Fonts.weights.semiBold,
    color: Colors.textPrimary,
  },
  unreadBadge: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: Spacing.sm,
  },
  unreadBadgeText: {
    color: Colors.white,
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.semiBold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});

export default ChatListScreen;
