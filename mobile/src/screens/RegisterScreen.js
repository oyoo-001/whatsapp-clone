import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '../constants';
import useAuthStore from '../store/authStore';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, isLoading } = useAuthStore();

  const handleRegister = async () => {
    if (!username.trim() || !phoneNumber.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    try {
      await register({ username: username.trim(), phoneNumber: phoneNumber.trim(), password });
    } catch (err) {
      Alert.alert('Registration Failed', err.response?.data?.error || 'Please try again');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.appName}>Create Account</Text>
        <Text style={styles.subtitle}>Join WhatsApp Clone today</Text>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={Colors.textHint}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor={Colors.textHint}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textHint}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={Colors.textHint}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  appName: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
    color: Colors.white,
  },
  subtitle: {
    fontSize: Fonts.sizes.md,
    color: Colors.lightGrey,
    marginTop: Spacing.xs,
  },
  form: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxxl,
    flex: 1,
  },
  input: {
    backgroundColor: Colors.lighterGrey,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: Fonts.sizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.semiBold,
  },
  linkButton: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  linkText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
  },
  linkBold: {
    color: Colors.primary,
    fontWeight: Fonts.weights.bold,
  },
});

export default RegisterScreen;
