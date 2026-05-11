import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { C, F, TY, S, R } from '../constants/theme';

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
  const [mobileFocused, setMobileFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      await login(DEMO_MOBILE, DEMO_PASSWORD);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      Alert.alert('Demo Login Failed', e.message);
    } finally { setDemoLoading(false); }
  };

  React.useEffect(() => {
    if (!isLoading && user) router.replace('/(tabs)/dashboard');
  }, [user, isLoading]);

  const handleLogin = async () => {
    if (!mobile.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter mobile number and password');
      return;
    }
    setLoading(true);
    try {
      await login(mobile.trim(), password);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      if (e.message === 'FREE_TRIAL_EXPIRED') {
        Alert.alert(
          '⏰ Trial Expired',
          'Your 3-day free trial has ended. Please activate your account with a coupon code.',
          [{ text: 'Activate Now', onPress: () => router.push({ pathname: '/activate', params: { mobile: mobile.trim(), password } }) }]
        );
      } else {
        Alert.alert('Login Failed', e.message || 'Invalid credentials');
      }
    } finally { setLoading(false); }
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo Hero */}
          <View style={s.hero}>
            <View style={s.logoOuter}>
              <View style={s.logoInner}>
                <Text style={s.logoEmoji}>🐾</Text>
              </View>
            </View>
            <Text style={s.appName}>Animitra</Text>
            <View style={s.taglineRow}>
              <View style={s.taglineDot} />
              <Text style={s.tagline}>Veterinary Practice Manager</Text>
              <View style={s.taglineDot} />
            </View>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome Back</Text>
            <Text style={s.cardSub}>Sign in to continue to Animitra</Text>

            {/* Mobile */}
            <Text style={s.inputLabel}>MOBILE NUMBER</Text>
            <View style={[s.inputWrap, mobileFocused && s.inputWrapFocused]}>
              <Text style={s.inputIcon}>📞</Text>
              <TextInput
                testID="login-mobile-input"
                style={s.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
                maxLength={10}
                onFocus={() => setMobileFocused(true)}
                onBlur={() => setMobileFocused(false)}
              />
            </View>

            {/* Password */}
            <Text style={[s.inputLabel, { marginTop: 14 }]}>PASSWORD</Text>
            <View style={[s.inputWrap, passFocused && s.inputWrapFocused]}>
              <Text style={s.inputIcon}>🔒</Text>
              <TextInput
                testID="login-password-input"
                style={[s.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <TouchableOpacity testID="toggle-password-btn" onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
                <Text style={{ fontSize: 13 }}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In */}
            <TouchableOpacity
              testID="login-submit-btn"
              style={[s.primaryBtn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Sign In →</Text>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Demo */}
            <TouchableOpacity
              testID="demo-login-btn"
              style={[s.demoBtn, demoLoading && s.btnDisabled]}
              onPress={handleDemoLogin}
              disabled={demoLoading}
              activeOpacity={0.8}
            >
              {demoLoading
                ? <ActivityIndicator color={C.primary} />
                : (
                  <View style={s.demoBtnRow}>
                    <Text style={s.demoBtnEmoji}>🔬</Text>
                    <Text style={s.demoBtnText}>Try Demo Account</Text>
                  </View>
                )
              }
            </TouchableOpacity>
            <Text style={s.demoHint}>Pre-filled with sample vet data · No sign-up needed</Text>
          </View>

          {/* Register link */}
          <View style={s.footer}>
            <Text style={s.footerText}>New to Animitra? </Text>
            <TouchableOpacity testID="go-register-btn" onPress={() => router.push('/register')}>
              <Text style={s.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 40 },

  // Hero
  hero: { alignItems: 'center', paddingTop: 32, paddingBottom: 36 },
  logoOuter: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: C.fill, borderWidth: 3, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
    boxShadow: '0px 8px 28px rgba(46,125,50,0.16)',
    marginBottom: 18,
  },
  logoInner: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: C.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  logoEmoji: { fontSize: 44 },
  appName: {
    ...TY.h1,
    color: C.primaryDark,
    letterSpacing: -1.5,
  },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  taglineDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent },
  tagline: { ...TY.small, color: C.textSub, fontFamily: F.medium },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xxl,
    padding: 26,
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: '0px 6px 24px rgba(46,125,50,0.09)',
  },
  cardTitle: { ...TY.h3, color: C.text, marginBottom: 4 },
  cardSub: { ...TY.small, marginBottom: 24, fontFamily: F.regular },

  // Input
  inputLabel: { ...TY.label, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.fill, borderRadius: R.md,
    borderWidth: 1.5, borderColor: C.borderLight,
    paddingHorizontal: 14, height: 44, gap: 10,
  },
  inputWrapFocused: { borderColor: C.primaryLight, backgroundColor: '#E4F0E6' },
  inputIcon: { fontSize: 13 },
  input: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 14,
    color: C.text,
    letterSpacing: 0.1,
  },
  eyeBtn: { padding: 4 },

  // Buttons
  primaryBtn: {
    height: 44, backgroundColor: C.primary, borderRadius: R.lg,
    justifyContent: 'center', alignItems: 'center', marginTop: 22,
    boxShadow: '0px 4px 20px rgba(46,125,50,0.34)',
  },
  primaryBtnText: { fontFamily: F.bold, fontSize: 14, color: '#fff', letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.65 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontFamily: F.medium, fontSize: 13, color: C.textMuted },
  demoBtn: {
    height: 46, borderRadius: R.lg,
    backgroundColor: C.fill,
    borderWidth: 2, borderColor: C.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  demoBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  demoBtnEmoji: { fontSize: 13 },
  demoBtnText: { fontFamily: F.bold, fontSize: 13, color: C.primary },
  demoHint: { fontFamily: F.regular, fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 18 },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { fontFamily: F.regular, fontSize: 13, color: C.textSub },
  footerLink: { fontFamily: F.bold, fontSize: 13, color: C.primary },
});
