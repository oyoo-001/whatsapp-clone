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
} from 'react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '../constants';
import useAuthStore from '../store/authStore';

const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!phoneNumber.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      await login(phoneNumber.trim(), password);
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.error || 'Please check your credentials');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.appName}>WhatsApp Clone</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>

      <View style={styles.form}>
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

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  appName: {
    fontSize: Fonts.sizes.header,
    fontWeight: Fonts.weights.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Fonts.sizes.lg,
    color: Colors.lightGrey,
  },
  form: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxxl * 2,
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

export default LoginScreen;
