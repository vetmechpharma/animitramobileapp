import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const DEMO_MOBILE = '1234567890';
const DEMO_PASSWORD = 'Demo@123';

export default function LoginScreen() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      await login(DEMO_MOBILE, DEMO_PASSWORD);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      Alert.alert('Demo Login Failed', e.message || 'Could not load demo account');
    } finally {
      setDemoLoading(false);
    }
  };

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

            {/* Demo Login */}
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              testID="demo-login-btn"
              style={[styles.demoBtn, demoLoading && styles.btnDisabled]}
              onPress={handleDemoLogin}
              disabled={demoLoading}
            >
              {demoLoading
                ? <ActivityIndicator color="#2E7D32" />
                : (
                  <View style={styles.demoBtnInner}>
                    <Text style={styles.demoBtnEmoji}>🔬</Text>
                    <Text style={styles.demoBtnText}>Try Demo Account</Text>
                  </View>
                )
              }
            </TouchableOpacity>
            <Text style={styles.demoHint}>Explore Animitra with sample vet data — no sign-up needed</Text>
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
  bg: '#F6FBF6',
  surface: '#FFFFFF',
  surfaceSecondary: '#E8F5E9',
  fill: '#EDF7EE',
  fillFocus: '#E0F0E1',
  textPrimary: '#0A1F10',
  textSecondary: '#5A7060',
  border: '#D4EAD6',
  error: '#D32F2F',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  logoSection: { alignItems: 'center', paddingTop: 56, paddingBottom: 32 },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 5,
  },
  logoEmoji: { fontSize: 50 },
  appName: { fontSize: 34, fontWeight: '800', color: C.primary, marginTop: 16, letterSpacing: -1 },
  tagline: { fontSize: 14, color: C.textSecondary, marginTop: 4, letterSpacing: 0.2 },
  card: {
    backgroundColor: C.surface, borderRadius: 28, padding: 24,
    shadowColor: '#1A4220', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07, shadowRadius: 20, elevation: 4,
  },
  formTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 24 },
  inputWrapper: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 7, letterSpacing: 0.3 },
  input: {
    height: 54, borderRadius: 14,
    backgroundColor: C.fill,
    paddingHorizontal: 16, fontSize: 16, color: C.textPrimary,
  },
  inputFocused: {
    backgroundColor: C.fillFocus,
    borderWidth: 1.5, borderColor: C.primaryLight,
  },
  passRow: { flexDirection: 'row', alignItems: 'center' },
  passInput: { flex: 1 },
  eyeBtn: {
    position: 'absolute', right: 12, height: 54,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8,
  },
  eyeText: { fontSize: 20 },
  loginBtn: {
    height: 56, backgroundColor: C.primary, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.65 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  registerText: { fontSize: 15, color: C.textSecondary },
  registerLink: { fontSize: 15, color: C.primary, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 13, color: C.textSecondary },
  demoBtn: {
    height: 54, borderRadius: 20,
    backgroundColor: C.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.primaryLight,
  },
  demoBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  demoBtnEmoji: { fontSize: 18 },
  demoBtnText: { fontSize: 15, fontWeight: '700', color: C.primary },
  demoHint: { fontSize: 12, color: C.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 18 },
});
