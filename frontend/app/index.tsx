import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Auto redirect if logged in
  React.useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, isLoading]);

  const handleLogin = async () => {
    if (!mobile.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter mobile number and password');
      return;
    }
    setLoading(true);
    try {
      await login(mobile.trim(), password);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🐾</Text>
            </View>
            <Text style={styles.appName}>Animitra</Text>
            <Text style={styles.tagline}>Veterinary Practice Manager</Text>
          </View>

          {/* Form */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to continue</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <TextInput
                testID="login-mobile-input"
                style={styles.input}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#9EB09F"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
                maxLength={10}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passRow}>
                <TextInput
                  testID="login-password-input"
                  style={[styles.input, styles.passInput]}
                  placeholder="Enter your password"
                  placeholderTextColor="#9EB09F"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  testID="toggle-password-btn"
                  style={styles.eyeBtn}
                  onPress={() => setShowPass(!showPass)}
                >
                  <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              testID="login-submit-btn"
              style={[styles.loginBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Sign In</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New to Animitra? </Text>
            <TouchableOpacity testID="go-register-btn" onPress={() => router.push('/register')}>
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const C = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  accent: '#81C784',
  bg: '#FDFBF7',
  surface: '#FFFFFF',
  surfaceSecondary: '#E8F5E9',
  textPrimary: '#0A1F10',
  textSecondary: '#4A5D4E',
  border: '#E0E8E1',
  error: '#D32F2F',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  logoSection: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.textPrimary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  logoEmoji: { fontSize: 48 },
  appName: { fontSize: 32, fontWeight: '800', color: C.primary, marginTop: 16, letterSpacing: -1 },
  tagline: { fontSize: 14, color: C.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: C.surface, borderRadius: 24, padding: 24,
    shadowColor: C.textPrimary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  formTitle: { fontSize: 22, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 24 },
  inputWrapper: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: C.textSecondary, letterSpacing: 0.8, marginBottom: 6 },
  input: {
    height: 56, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, paddingHorizontal: 16,
    fontSize: 16, color: C.textPrimary,
  },
  passRow: { flexDirection: 'row', alignItems: 'center' },
  passInput: { flex: 1 },
  eyeBtn: {
    position: 'absolute', right: 12, height: 56,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8,
  },
  eyeText: { fontSize: 20 },
  loginBtn: {
    height: 56, backgroundColor: C.primary, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  registerText: { fontSize: 15, color: C.textSecondary },
  registerLink: { fontSize: 15, color: C.primary, fontWeight: '700' },
});
