import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert, ImageBackground, Linking, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');
const BG_IMAGE = 'https://images.unsplash.com/photo-1689269746312-21734f1931de?crop=entropy&cs=srgb&fm=jpg&q=80&w=800';

const DEMO_MOBILE = '1234567890';
const DEMO_PASSWORD = 'Demo@123';
const SUPPORT_WHATSAPP = '9486544884';

export default function LoginScreen() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
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
      Alert.alert('Required', 'Please enter mobile number and password');
      return;
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
      `To get a new password, please WhatsApp or call our support:\n\n📱 +91 ${SUPPORT_WHATSAPP}\n\nSend message:\n"Reset password for [your mobile number]"\n\nOur team will reset it within a few hours.`,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: '💬 WhatsApp Now',
          onPress: () => Linking.openURL(`https://wa.me/91${SUPPORT_WHATSAPP}?text=Reset password for ${mobile || '[your mobile]'}`),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* Hero Section with Background Image */}
      <ImageBackground
        source={{ uri: BG_IMAGE }}
        style={s.heroBg}
        imageStyle={s.heroBgImg}
      >
        <View style={s.heroOverlay} />

        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.logoCircle}>
            <Text style={s.logoEmoji}>🐾</Text>
            <View style={s.medicalBadge}>
              <Text style={s.medicalText}>+</Text>
            </View>
          </View>
          <Text style={s.appName}>
            <Text style={s.appNameBlack}>Animitra</Text>
            <Text style={s.appNameGreen}>VET</Text>
          </Text>
          <Text style={s.tagline}>
            🐾  Compassionate Care. Healthy Animals. Stronger Future.  🤍
          </Text>
        </View>
      </ImageBackground>

      {/* Login Card */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.cardWrapper}
      >
        <ScrollView contentContainerStyle={s.cardScroll} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            {/* Card Header */}
            <View style={s.cardHeader}>
              <View style={s.shieldBadge}>
                <Text style={s.shieldEmoji}>🛡️</Text>
              </View>
              <View>
                <Text style={s.welcomeTitle}>Welcome Back!</Text>
                <Text style={s.welcomeSub}>Login to continue to AnimitraVET</Text>
              </View>
            </View>

            {/* Mobile Input */}
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

            {/* Password Input */}
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
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.loginBtnIcon}>🔐</Text>
                  <Text style={s.loginBtnText}>Login</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divRow}>
              <View style={s.divLine} />
              <Text style={s.divText}>or continue with</Text>
              <View style={s.divLine} />
            </View>

            {/* Demo Login */}
            <TouchableOpacity
              testID="demo-login-btn"
              style={[s.demoBtn, demoLoading && s.btnDisabled]}
              onPress={handleDemoLogin}
              disabled={demoLoading}
              activeOpacity={0.8}
            >
              {demoLoading ? (
                <ActivityIndicator color="#2E7D32" />
              ) : (
                <Text style={s.demoBtnText}>🔬  Try Demo Account</Text>
              )}
            </TouchableOpacity>

            {/* Sign Up */}
            <View style={s.signupRow}>
              <Text style={s.signupText}>Don't have an account? </Text>
              <TouchableOpacity testID="go-register-btn" onPress={() => router.push('/register')}>
                <Text style={s.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Features Strip */}
          <View style={s.featuresStrip}>
            {[
              { emoji: '🏥', label: 'Expert\nVeterinary' },
              { emoji: '🐄', label: 'Farm\nAnimal' },
              { emoji: '💊', label: 'Health &\nGrowth' },
            ].map(f => (
              <View key={f.label} style={s.featureItem}>
                <Text style={s.featureEmoji}>{f.emoji}</Text>
                <Text style={s.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const C = { primary: '#2E7D32', primaryDark: '#1B5E20', text: '#1A2E1C', sub: '#5A7060', fill: '#EBF5EC', border: '#D0E8D2' };

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F9F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F9F4' },
  // Hero
  heroBg: { height: height * 0.42, width: '100%' },
  heroBgImg: { resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(240,248,240,0.25)' },
  logoArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  logoCircle: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2.5, borderColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  logoEmoji: { fontSize: 40 },
  medicalBadge: {
    position: 'absolute', top: 0, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  medicalText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_800ExtraBold', lineHeight: 16 },
  appName: { marginBottom: 6 },
  appNameBlack: { fontFamily: 'Inter_800ExtraBold', fontSize: 28, color: '#1A2E1C', letterSpacing: -0.5 },
  appNameGreen: { fontFamily: 'Inter_800ExtraBold', fontSize: 28, color: C.primary, letterSpacing: -0.5 },
  tagline: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#2E4A30', textAlign: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.7)', paddingVertical: 4, borderRadius: 20 },
  // Card
  cardWrapper: { flex: 1, marginTop: -24 },
  cardScroll: { paddingBottom: 20 },
  card: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 24, paddingBottom: 16,
    boxShadow: '0px -4px 20px rgba(46,125,50,0.10)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  shieldBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.fill, justifyContent: 'center', alignItems: 'center' },
  shieldEmoji: { fontSize: 22 },
  welcomeTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 18, color: C.text },
  welcomeSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: C.sub, marginTop: 1 },
  // Inputs
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.fill, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, height: 50, marginBottom: 12, gap: 8,
  },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: C.text },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 18 },
  forgotRow: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgotText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.primary },
  // Buttons
  loginBtn: {
    height: 50, backgroundColor: C.primary, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    marginBottom: 16, boxShadow: '0px 4px 16px rgba(46,125,50,0.30)',
  },
  btnDisabled: { opacity: 0.65 },
  loginBtnIcon: { fontSize: 18 },
  loginBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
  divRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: C.sub },
  demoBtn: {
    height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: C.primary,
    backgroundColor: C.fill, justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  demoBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: C.primary },
  signupRow: { flexDirection: 'row', justifyContent: 'center' },
  signupText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: C.sub },
  signupLink: { fontFamily: 'Inter_700Bold', fontSize: 14, color: C.primary },
  // Bottom strip
  featuresStrip: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: C.primaryDark, padding: 14, marginTop: 0,
  },
  featureItem: { alignItems: 'center', gap: 4 },
  featureEmoji: { fontSize: 22 },
  featureLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
});
