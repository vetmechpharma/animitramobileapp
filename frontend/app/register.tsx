import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '', reg_no: '', mobile: '', password: '', confirmPassword: '',
    state: '', district: '', taluk: '',
  });
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [taluks, setTaluks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Dropdown modal
  const [dropdownType, setDropdownType] = useState<'state' | 'district' | 'taluk' | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');

  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    if (form.state) fetchDistricts(form.state);
    else setDistricts([]);
  }, [form.state]);

  useEffect(() => {
    if (form.state && form.district) fetchTaluks(form.state, form.district);
    else setTaluks([]);
  }, [form.district]);

  const fetchStates = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/location/states`);
      const data = await res.json();
      setStates(data.states || []);
    } catch (e) { console.error(e); }
  };

  const fetchDistricts = async (state: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/location/districts/${encodeURIComponent(state)}`);
      const data = await res.json();
      setDistricts(data.districts || []);
      setForm(f => ({ ...f, district: '', taluk: '' }));
    } catch (e) { console.error(e); }
  };

  const fetchTaluks = async (state: string, district: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/location/taluks/${encodeURIComponent(state)}/${encodeURIComponent(district)}`);
      const data = await res.json();
      setTaluks(data.taluks || []);
      setForm(f => ({ ...f, taluk: '' }));
    } catch (e) { console.error(e); }
  };

  const openDropdown = (type: 'state' | 'district' | 'taluk') => {
    if (type === 'district' && !form.state) {
      Alert.alert('Select State', 'Please select a state first');
      return;
    }
    if (type === 'taluk' && !form.district) {
      Alert.alert('Select District', 'Please select a district first');
      return;
    }
    setDropdownSearch('');
    setDropdownType(type);
  };

  const selectOption = (value: string) => {
    if (dropdownType === 'state') {
      setForm(f => ({ ...f, state: value, district: '', taluk: '' }));
    } else if (dropdownType === 'district') {
      setForm(f => ({ ...f, district: value, taluk: '' }));
    } else if (dropdownType === 'taluk') {
      setForm(f => ({ ...f, taluk: value }));
    }
    setDropdownType(null);
  };

  const getDropdownItems = () => {
    let items: string[] = [];
    if (dropdownType === 'state') items = states;
    else if (dropdownType === 'district') items = districts;
    else if (dropdownType === 'taluk') items = taluks;
    if (dropdownSearch) {
      items = items.filter(i => i.toLowerCase().includes(dropdownSearch.toLowerCase()));
    }
    return items;
  };

  const handleRegister = async () => {
    const { name, reg_no, mobile, password, confirmPassword, state, district, taluk } = form;
    if (!name || !reg_no || !mobile || !password || !state || !district || !taluk) {
      Alert.alert('Incomplete', 'Please fill all fields');
      return;
    }
    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      Alert.alert('Invalid Mobile', 'Enter a valid 10-digit mobile number');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const result = await register({ name, reg_no, mobile, password, state, district, taluk });
      router.push({ pathname: '/activate', params: { token: result.token, name: name } });
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.logoRow}>
              <Text style={styles.logoEmoji}>🐾</Text>
              <Text style={styles.appName}>Animitra</Text>
            </View>
            <Text style={styles.pageTitle}>Create Account</Text>
            <Text style={styles.pageSubtitle}>Register as a licensed veterinarian</Text>
          </View>

          <View style={styles.card}>
            {/* Personal Info */}
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                testID="reg-name-input"
                style={styles.input}
                placeholder="Dr. Your Full Name"
                placeholderTextColor="#9EB09F"
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>VET REGISTRATION NUMBER</Text>
              <TextInput
                testID="reg-regno-input"
                style={styles.input}
                placeholder="e.g. TN/VCI/12345"
                placeholderTextColor="#9EB09F"
                value={form.reg_no}
                onChangeText={v => setForm(f => ({ ...f, reg_no: v }))}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <TextInput
                testID="reg-mobile-input"
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor="#9EB09F"
                keyboardType="phone-pad"
                value={form.mobile}
                onChangeText={v => setForm(f => ({ ...f, mobile: v }))}
                maxLength={10}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passRow}>
                <TextInput
                  testID="reg-password-input"
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#9EB09F"
                  secureTextEntry={!showPass}
                  value={form.password}
                  onChangeText={v => setForm(f => ({ ...f, password: v }))}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                  <Text>{showPass ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                testID="reg-confirm-password-input"
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor="#9EB09F"
                secureTextEntry={!showPass}
                value={form.confirmPassword}
                onChangeText={v => setForm(f => ({ ...f, confirmPassword: v }))}
              />
            </View>

            {/* Location */}
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Practice Location</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>STATE</Text>
              <TouchableOpacity
                testID="state-dropdown"
                style={styles.dropdown}
                onPress={() => openDropdown('state')}
              >
                <Text style={[styles.dropdownText, !form.state && styles.placeholder]}>
                  {form.state || 'Select State'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>DISTRICT</Text>
              <TouchableOpacity
                testID="district-dropdown"
                style={[styles.dropdown, !form.state && styles.dropdownDisabled]}
                onPress={() => openDropdown('district')}
              >
                <Text style={[styles.dropdownText, !form.district && styles.placeholder]}>
                  {form.district || 'Select District'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>TALUK / BLOCK</Text>
              <TouchableOpacity
                testID="taluk-dropdown"
                style={[styles.dropdown, !form.district && styles.dropdownDisabled]}
                onPress={() => openDropdown('taluk')}
              >
                <Text style={[styles.dropdownText, !form.taluk && styles.placeholder]}>
                  {form.taluk || 'Select Taluk'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="register-submit-btn"
              style={[styles.registerBtn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.registerBtnText}>Register & Continue</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity testID="go-login-btn" onPress={() => router.back()}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dropdown Modal */}
      <Modal visible={!!dropdownType} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownType(null)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Select {dropdownType === 'state' ? 'State' : dropdownType === 'district' ? 'District' : 'Taluk'}
            </Text>
            <TextInput
              testID="dropdown-search-input"
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#9EB09F"
              value={dropdownSearch}
              onChangeText={setDropdownSearch}
            />
            <FlatList
              data={getDropdownItems()}
              keyExtractor={(item) => item}
              style={styles.dropdownList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={`dropdown-item-${item}`}
                  style={styles.dropdownItem}
                  onPress={() => selectOption(item)}
                >
                  <Text style={styles.dropdownItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const C = {
  primary: '#2E7D32', bg: '#F6FBF6', surface: '#FFFFFF',
  surfaceSecondary: '#E8F5E9', fill: '#EDF7EE', fillFocus: '#E0F0E1',
  textPrimary: '#0A1F10', textSecondary: '#5A7060', border: '#D4EAD6',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 16, paddingBottom: 24 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: C.primary, fontWeight: '600' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  logoEmoji: { fontSize: 28 },
  appName: { fontSize: 22, fontWeight: '800', color: C.primary },
  pageTitle: { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: C.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: C.surface, borderRadius: 28, padding: 24,
    shadowColor: '#1A4220', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07, shadowRadius: 20, elevation: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 14 },
  inputWrapper: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 7, letterSpacing: 0.3 },
  input: {
    height: 54, borderRadius: 14, backgroundColor: C.fill,
    paddingHorizontal: 16, fontSize: 16, color: C.textPrimary,
  },
  passRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 12, height: 54, justifyContent: 'center', paddingHorizontal: 8 },
  dropdown: {
    height: 54, borderRadius: 14, backgroundColor: C.fill,
    paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dropdownDisabled: { opacity: 0.5 },
  dropdownText: { fontSize: 16, color: C.textPrimary, flex: 1 },
  placeholder: { color: '#9BB89F' },
  dropdownArrow: { fontSize: 13, color: C.textSecondary },
  registerBtn: {
    height: 56, backgroundColor: C.primary, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.65 },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { fontSize: 15, color: C.textSecondary },
  loginLink: { fontSize: 15, color: C.primary, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 16, paddingBottom: 36, maxHeight: '78%',
  },
  modalHandle: { width: 44, height: 4, backgroundColor: '#D0E8D2', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 12, textAlign: 'center' },
  searchInput: {
    height: 50, borderRadius: 14, backgroundColor: C.fill,
    paddingHorizontal: 16, fontSize: 15, color: C.textPrimary, marginBottom: 8,
  },
  dropdownList: { flexGrow: 0 },
  dropdownItem: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F0F7F0' },
  dropdownItemText: { fontSize: 15, color: C.textPrimary },
});
