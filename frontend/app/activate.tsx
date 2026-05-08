import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'react-native-qrcode-svg';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const UPI_STRING = 'upi://pay?pa=9486544884@kvb&pn=Animitra&am=200&cu=INR&tn=Animitra+Subscription';
const UPI_ID = '9486544884@kvb';

export default function ActivateScreen() {
  const router = useRouter();
  const { token, name } = useLocalSearchParams<{ token: string; name: string }>();
  const { activate } = useAuth();

  const [activeSection, setActiveSection] = useState<'coupon' | 'pay'>('coupon');
  const [code, setCode] = useState<string[]>(Array(8).fill(''));
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Payment UTR
  const [utrNumber, setUtrNumber] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrSubmitted, setUtrSubmitted] = useState(false);

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

  const handleSubmitUtr = async () => {
    if (!utrNumber.trim() || utrNumber.length < 6) {
      Alert.alert('Invalid UTR', 'Please enter a valid UTR/transaction reference number');
      return;
    }
    if (!token) { Alert.alert('Error', 'Session expired'); return; }
    setSubmittingUtr(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscription/submit-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ utr_number: utrNumber.trim(), mobile: '', name: name || 'Vet' }),
      });
      if (!res.ok) throw new Error('Submission failed');
      setUtrSubmitted(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit UTR');
    } finally {
      setSubmittingUtr(false);
    }
  };

  const fullCode = code.join('');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}><Text style={styles.logoEmoji}>🐾</Text></View>
            <Text style={styles.appName}>Animitra</Text>
          </View>

          {/* Section Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity testID="tab-coupon"
              style={[styles.toggleBtn, activeSection === 'coupon' && styles.toggleBtnActive]}
              onPress={() => setActiveSection('coupon')}>
              <Text style={[styles.toggleText, activeSection === 'coupon' && styles.toggleTextActive]}>🎟️ Enter Coupon</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="tab-pay"
              style={[styles.toggleBtn, activeSection === 'pay' && styles.toggleBtnActive]}
              onPress={() => setActiveSection('pay')}>
              <Text style={[styles.toggleText, activeSection === 'pay' && styles.toggleTextActive]}>💳 Get Coupon</Text>
            </TouchableOpacity>
          </View>

          {/* COUPON SECTION */}
          {activeSection === 'coupon' && (
            <View style={styles.card}>
              <Text style={styles.welcomeEmoji}>🎉</Text>
              <Text style={styles.title}>Welcome, {name || 'Doctor'}!</Text>
              <Text style={styles.subtitle}>Enter your 8-character coupon code to activate your account.</Text>
              <View style={styles.otpContainer} testID="coupon-input-container">
                {code.map((char, index) => (
                  <TextInput key={index} testID={`coupon-input-${index}`}
                    ref={el => { inputRefs.current[index] = el; }}
                    style={[styles.otpBox, char ? styles.otpBoxFilled : null]}
                    value={char}
                    onChangeText={text => { if (text.length > 1) { handlePaste(text); return; } handleChange(text, index); }}
                    onKeyPress={e => handleKeyPress(e, index)}
                    maxLength={1} autoCapitalize="characters" autoCorrect={false}
                    keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'}
                    textAlign="center"
                  />
                ))}
              </View>
              <View style={styles.progressRow}>
                {code.map((char, i) => (
                  <View key={i} style={[styles.progressDot, char && styles.progressDotFilled]} />
                ))}
              </View>
              <Text style={styles.progressText}>{fullCode.length}/8 characters entered</Text>
              <TouchableOpacity testID="activate-btn"
                style={[styles.activateBtn, (loading || fullCode.length !== 8) && styles.btnDisabled]}
                onPress={handleActivate} disabled={loading || fullCode.length !== 8}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.activateBtnText}>Activate Account</Text>}
              </TouchableOpacity>
              <Text style={styles.helpText}>Don't have a coupon? Tap "Get Coupon" above to subscribe for ₹200.</Text>
            </View>
          )}

          {/* PAYMENT SECTION */}
          {activeSection === 'pay' && (
            <View style={styles.card}>
              <Text style={styles.planBadge}>🌟 LIFETIME ACCESS</Text>
              <Text style={styles.planPrice}>₹200 <Text style={styles.planPriceSmall}>one-time</Text></Text>
              <Text style={styles.planDesc}>Full access to Animitra — case management, ledger, reports, and more. Pay once, use forever.</Text>

              {/* UPI QR Code */}
              <View style={styles.qrCard}>
                <Text style={styles.qrLabel}>Scan to Pay via UPI</Text>
                <View style={styles.qrBox}>
                  <QRCode value={UPI_STRING} size={180} color="#2E7D32" backgroundColor="#FFFFFF" />
                </View>
                <Text style={styles.upiId}>UPI ID: <Text style={styles.upiIdValue}>{UPI_ID}</Text></Text>
                <Text style={styles.upiNote}>Works with GPay, PhonePe, Paytm, BHIM & all UPI apps</Text>
              </View>

              {!utrSubmitted ? (
                <>
                  <Text style={styles.utrLabel}>After payment, enter your UTR/Transaction ID:</Text>
                  <TextInput testID="utr-input"
                    style={styles.utrInput}
                    placeholder="e.g. 407123456789"
                    placeholderTextColor="#9EB09F"
                    value={utrNumber}
                    onChangeText={setUtrNumber}
                    keyboardType="default"
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity testID="submit-utr-btn"
                    style={[styles.activateBtn, (submittingUtr || !utrNumber.trim()) && styles.btnDisabled]}
                    onPress={handleSubmitUtr} disabled={submittingUtr || !utrNumber.trim()}>
                    {submittingUtr ? <ActivityIndicator color="#fff" /> : <Text style={styles.activateBtnText}>Submit UTR Number</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.utrSuccess}>
                  <Text style={styles.utrSuccessEmoji}>✅</Text>
                  <Text style={styles.utrSuccessTitle}>UTR Submitted!</Text>
                  <Text style={styles.utrSuccessText}>
                    We'll verify your payment and send your coupon code within a few hours.
                    Check back on the "Enter Coupon" tab once you receive it.
                  </Text>
                </View>
              )}
            </View>
          )}

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
  bg: '#F6FBF6', surface: '#FFFFFF', surfaceSecondary: '#E8F5E9',
  fill: '#EDF7EE', fillFocus: '#E0F0E1',
  textPrimary: '#0A1F10', textSecondary: '#5A7060', border: '#D4EAD6',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  logoSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 20 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 24, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.primary, marginTop: 10, letterSpacing: -0.5 },
  // Section toggle
  toggleRow: { flexDirection: 'row', backgroundColor: C.fill, borderRadius: 14, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: C.surface, boxShadow: '0px 2px 10px rgba(46,125,50,0.07)' },
  toggleText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textSecondary },
  toggleTextActive: { color: C.primary },
  card: {
    backgroundColor: C.surface, borderRadius: 28, padding: 24,
    boxShadow: '0px 3px 14px rgba(46,125,50,0.10)', alignItems: 'center',
  },
  welcomeEmoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 21, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 18 },
  otpBox: {
    width: 38, height: 54, borderRadius: 14, backgroundColor: C.fill,
    borderWidth: 1.5, borderColor: '#C8E6C9',
    fontSize: 20, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.primary, textAlign: 'center',
  },
  otpBoxFilled: { borderColor: C.primaryLight, backgroundColor: C.fillFocus },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  progressDotFilled: { backgroundColor: C.primaryLight },
  progressText: { fontSize: 12, color: C.textSecondary, marginBottom: 20 },
  activateBtn: {
    width: '100%', height: 56, backgroundColor: C.primary, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
    boxShadow: '0px 4px 20px rgba(46,125,50,0.28)',
  },
  btnDisabled: { opacity: 0.45 },
  activateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  helpText: { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 14 },
  loginRow: { alignItems: 'center', marginTop: 24 },
  loginLink: { fontSize: 15, color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  // Payment section
  planBadge: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.primary, backgroundColor: C.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  planPrice: { fontSize: 40, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.textPrimary },
  planPriceSmall: { fontSize: 16, fontWeight: '500', fontFamily: 'Inter_500Medium', color: C.textSecondary },
  planDesc: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 21, marginVertical: 14 },
  qrCard: { backgroundColor: C.fill, borderRadius: 20, padding: 20, alignItems: 'center', width: '100%', marginBottom: 16 },
  qrLabel: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.textPrimary, marginBottom: 12 },
  qrBox: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12 },
  upiId: { fontSize: 14, color: C.textSecondary },
  upiIdValue: { color: C.primary, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  upiNote: { fontSize: 12, color: C.textSecondary, marginTop: 6, textAlign: 'center' },
  utrLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textSecondary, alignSelf: 'flex-start', marginBottom: 8, marginTop: 4 },
  utrInput: { width: '100%', height: 54, borderRadius: 14, backgroundColor: C.fill, paddingHorizontal: 16, fontSize: 16, color: C.textPrimary, marginBottom: 8 },
  utrSuccess: { alignItems: 'center', paddingVertical: 16 },
  utrSuccessEmoji: { fontSize: 44, marginBottom: 10 },
  utrSuccessTitle: { fontSize: 20, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.primary, marginBottom: 8 },
  utrSuccessText: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22 },
});
