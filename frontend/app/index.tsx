import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert, Image, Linking, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const SUPPORT_WHATSAPP = '9486544884';
const DEMO_MOBILE = '1234567890';
const DEMO_PASSWORD = 'Demo@123';

const LOGO = require('../assets/images/animitra-logo.png');

export default function LoginScreen() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  React.useEffect(() => {
    if (!isLoading && user) router.replace('/(tabs)/dashboard');
  }, [user, isLoading]);

  const handleLogin = async () => {
    if (!mobile.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter mobile number and password'); return;
    }
    setLoading(true);
    try {
      await login(mobile.trim(), password);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      await login(DEMO_MOBILE, DEMO_PASSWORD);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      Alert.alert('Demo Error', e.message);
    } finally { setDemoLoading(false); }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      '🔐 Forgot Password?',
      `WhatsApp or call our support team:\n\n📱 +91 ${SUPPORT_WHATSAPP}\n\nSend: "Reset password for ${mobile || '[your mobile number]'}"\n\nWe'll reset it within a few hours.`,
      [
        { text: 'Close', style: 'cancel' },
        { text: '💬 WhatsApp Now', onPress: () => Linking.openURL(`https://wa.me/91${SUPPORT_WHATSAPP}?text=Reset password for ${mobile || '[mobile]'}`) },
      ]
    );
  };

  if (isLoading) return <View style={s.center}><ActivityIndicator size="large" color="#006064" /></View>;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Top background with logo */}
      <View style={s.topBg}>
        <View style={s.topDecCircle1} />
        <View style={s.topDecCircle2} />
        <View style={s.topDecCircle3} />
        <Image source={LOGO} style={s.logo} resizeMode="contain" />
        <Text style={s.appTagline}>SOFTWARE SOLUTIONS FOR ANIMAL CARE</Text>
      </View>

      {/* Login Card */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.cardScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.card}>

            {/* Header */}
            <View style={s.cardHeader}>
              <View style={s.shieldBadge}><Text style={s.shieldEmoji}>🛡️</Text></View>
              <View>
                <Text style={s.welcomeTitle}>Welcome Back!</Text>
                <Text style={s.welcomeSub}>Login to continue to ANIMitraVET</Text>
              </View>
            </View>

            {/* Mobile */}
            <View style={s.inputRow}>
              <Text style={s.inputIcon}>👤</Text>
              <TextInput
                testID="login-mobile-input"
                style={s.input}
                placeholder="Phone Number"
                placeholderTextColor="#9EB09F"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
                maxLength={10}
              />
            </View>

            {/* Password */}
            <View style={s.inputRow}>
              <Text style={s.inputIcon}>🔒</Text>
              <TextInput
                testID="login-password-input"
                style={[s.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor="#9EB09F"
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
                <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity testID="forgot-password-btn" onPress={handleForgotPassword} style={s.forgotRow}>
              <Text style={s.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              testID="login-submit-btn"
              style={[s.loginBtn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <><Text style={s.loginBtnIcon}>🔐</Text><Text style={s.loginBtnText}>Login</Text></>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divRow}>
              <View style={s.divLine} /><Text style={s.divText}>or</Text><View style={s.divLine} />
            </View>

            {/* Demo */}
            <TouchableOpacity
              testID="demo-login-btn"
              style={[s.demoBtn, demoLoading && s.btnDisabled]}
              onPress={handleDemoLogin}
              disabled={demoLoading}
              activeOpacity={0.8}
            >
              {demoLoading ? <ActivityIndicator color="#006064" /> : <Text style={s.demoBtnText}>🔬  Try Demo Account</Text>}
            </TouchableOpacity>

            {/* Sign Up */}
            <View style={s.signupRow}>
              <Text style={s.signupText}>Don't have an account? </Text>
              <TouchableOpacity testID="go-register-btn" onPress={() => router.push('/register')}>
                <Text style={s.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={s.versionText}>ANIMitraVET v1.3 · Veterinary Practice Manager</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const PRIMARY = '#006064';
const PRIMARY_LIGHT = '#E0F2F1';
const PRIMARY_MID = '#00838F';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#004D40' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#004D40' },

  // Top section
  topBg: {
    height: height * 0.38, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#004D40', overflow: 'hidden', position: 'relative',
  },
  topDecCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(0,131,143,0.15)', top: -50, right: -50,
  },
  topDecCircle2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(0,131,143,0.10)', bottom: -30, left: -40,
  },
  topDecCircle3: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,188,212,0.12)', top: 20, left: 30,
  },
  logo: { width: width * 0.72, height: width * 0.48, maxWidth: 320, maxHeight: 214 },
  appTagline: { display: 'none' },

  // Card
  cardScroll: { paddingBottom: 24 },
  card: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 22, paddingTop: 24, paddingBottom: 16,
    boxShadow: '0px -4px 20px rgba(0,77,64,0.2)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  shieldBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center' },
  shieldEmoji: { fontSize: 22 },
  welcomeTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 18, color: '#1A2E2E' },
  welcomeSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#5A7070', marginTop: 1 },

  // Inputs
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0F9F9', borderRadius: 12,
    borderWidth: 1, borderColor: '#CCE8E8',
    paddingHorizontal: 12, height: 50, marginBottom: 12, gap: 8,
  },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: '#1A2E2E' },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 18 },
  forgotRow: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgotText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: PRIMARY },

  // Buttons
  loginBtn: {
    height: 50, backgroundColor: PRIMARY, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    marginBottom: 16, boxShadow: '0px 4px 16px rgba(0,77,64,0.30)',
  },
  btnDisabled: { opacity: 0.65 },
  loginBtnIcon: { fontSize: 18 },
  loginBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
  divRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  divLine: { flex: 1, height: 1, backgroundColor: '#CCE8E8' },
  divText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#5A7070' },
  demoBtn: {
    height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  demoBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: PRIMARY },
  signupRow: { flexDirection: 'row', justifyContent: 'center' },
  signupText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#5A7070' },
  signupLink: { fontFamily: 'Inter_700Bold', fontSize: 14, color: PRIMARY },
  versionText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingTop: 12 },
});
