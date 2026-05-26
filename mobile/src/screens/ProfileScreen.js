import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, BorderRadius } from '../constants';
import useAuthStore from '../store/authStore';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {user?.username?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{user?.username || 'User'}</Text>
          <Text style={styles.status}>{user?.status || 'Hey there! I am using WhatsApp Clone'}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={22} color={Colors.primary} style={styles.infoIcon} />
            <View>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user?.phoneNumber || 'Not set'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="at-outline" size={22} color={Colors.primary} style={styles.infoIcon} />
            <View>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{user?.username || 'Not set'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={22} color={Colors.primary} style={styles.infoIcon} />
            <View>
              <Text style={styles.infoLabel}>About</Text>
              <Text style={styles.infoValue}>{user?.status || 'Hey there! I am using WhatsApp Clone'}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.red} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lighterGrey,
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  backButton: {
    width: 40,
    padding: Spacing.xs,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.semiBold,
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
  },
  avatarLarge: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 40,
    fontWeight: Fonts.weights.bold,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.secondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  username: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: Colors.textPrimary,
  },
  status: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  infoSection: {
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  infoIcon: {
    marginRight: Spacing.lg,
    width: 24,
  },
  infoLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: Fonts.sizes.md,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginLeft: 50,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  logoutText: {
    color: Colors.red,
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.semiBold,
    marginLeft: Spacing.sm,
  },
});

export default ProfileScreen;
