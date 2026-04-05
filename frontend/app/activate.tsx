import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function ActivateScreen() {
  const router = useRouter();
  const { token, name } = useLocalSearchParams<{ token: string; name: string }>();
  const { activate } = useAuth();

  const [code, setCode] = useState<string[]>(Array(8).fill(''));
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^A-Za-z0-9!@#$]/g, '').toUpperCase().slice(-1);
    const newCode = [...code];
    newCode[index] = cleaned;
    setCode(newCode);
    if (cleaned && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (text: string) => {
    const cleaned = text.replace(/[^A-Za-z0-9!@#$]/g, '').toUpperCase().slice(0, 8);
    const newCode = Array(8).fill('');
    for (let i = 0; i < cleaned.length; i++) newCode[i] = cleaned[i];
    setCode(newCode);
    const nextEmpty = Math.min(cleaned.length, 7);
    inputRefs.current[nextEmpty]?.focus();
  };

  const handleActivate = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 8) {
      Alert.alert('Incomplete Code', 'Please enter the full 8-character coupon code');
      return;
    }
    if (!token) {
      Alert.alert('Error', 'Session expired. Please register again.');
      router.replace('/register');
      return;
    }
    setLoading(true);
    try {
      await activate(fullCode, token);
      Alert.alert('🎉 Activated!', 'Your account is now active. Welcome to Animitra!', [
        { text: 'Continue', onPress: () => router.replace('/(tabs)/dashboard') }
      ]);
    } catch (e: any) {
      Alert.alert('Activation Failed', e.message || 'Invalid or already used coupon code');
    } finally {
      setLoading(false);
    }
  };

  const fullCode = code.join('');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🐾</Text>
            </View>
            <Text style={styles.appName}>Animitra</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.welcomeEmoji}>🎉</Text>
            <Text style={styles.title}>Welcome, {name || 'Doctor'}!</Text>
            <Text style={styles.subtitle}>
              Enter the 8-character coupon code provided to you to activate your account.
            </Text>

            {/* OTP Boxes */}
            <View style={styles.otpContainer} testID="coupon-input-container">
              {code.map((char, index) => (
                <TextInput
                  key={index}
                  testID={`coupon-input-${index}`}
                  ref={el => { inputRefs.current[index] = el; }}
                  style={[styles.otpBox, char ? styles.otpBoxFilled : null]}
                  value={char}
                  onChangeText={text => {
                    if (text.length > 1) { handlePaste(text); return; }
                    handleChange(text, index);
                  }}
                  onKeyPress={e => handleKeyPress(e, index)}
                  maxLength={1}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'}
                  textAlign="center"
                />
              ))}
            </View>

            {/* Progress indicator */}
            <View style={styles.progressRow}>
              {code.map((char, i) => (
                <View key={i} style={[styles.progressDot, char && styles.progressDotFilled]} />
              ))}
            </View>

            <Text style={styles.progressText}>
              {fullCode.length}/8 characters entered
            </Text>

            <TouchableOpacity
              testID="activate-btn"
              style={[styles.activateBtn, (loading || fullCode.length !== 8) && styles.btnDisabled]}
              onPress={handleActivate}
              disabled={loading || fullCode.length !== 8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.activateBtnText}>Activate Account</Text>
              }
            </TouchableOpacity>

            <View style={styles.helpRow}>
              <Text style={styles.helpText}>
                Don't have a coupon code? Contact Animitra support to get one.
              </Text>
            </View>
          </View>

          <TouchableOpacity testID="go-login-btn" onPress={() => router.replace('/')} style={styles.loginRow}>
            <Text style={styles.loginLink}>← Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const C = {
  primary: '#2E7D32', primaryLight: '#4CAF50',
  bg: '#FDFBF7', surface: '#FFFFFF', surfaceSecondary: '#E8F5E9',
  textPrimary: '#0A1F10', textSecondary: '#4A5D4E', border: '#E0E8E1',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  logoSection: { alignItems: 'center', paddingTop: 40, paddingBottom: 24 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.surfaceSecondary, justifyContent: 'center', alignItems: 'center',
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 24, fontWeight: '800', color: C.primary, marginTop: 12 },
  card: {
    backgroundColor: C.surface, borderRadius: 24, padding: 28,
    shadowColor: C.textPrimary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, alignItems: 'center',
  },
  welcomeEmoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: C.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  otpBox: {
    width: 36, height: 52, borderWidth: 2, borderColor: C.border, borderRadius: 12,
    backgroundColor: C.surface, fontSize: 18, fontWeight: '800', color: C.primary,
    textAlign: 'center',
  },
  otpBoxFilled: { borderColor: C.primaryLight, backgroundColor: C.surfaceSecondary },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  progressDotFilled: { backgroundColor: C.primaryLight },
  progressText: { fontSize: 12, color: C.textSecondary, marginBottom: 24 },
  activateBtn: {
    width: '100%', height: 56, backgroundColor: C.primary, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.5 },
  activateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  helpRow: { marginTop: 16 },
  helpText: { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
  loginRow: { alignItems: 'center', marginTop: 24 },
  loginLink: { fontSize: 15, color: C.primary, fontWeight: '600' },
});
