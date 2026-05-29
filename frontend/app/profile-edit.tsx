import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
  Image, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const C = {
  primary: '#006064', bg: '#F0FAFA', surface: '#FFFFFF', fill: '#E0F2F1',
  text: '#1A2E2E', sub: '#4B6869', border: '#B2DFDB', muted: '#8FA891',
  error: '#C62828',
};

const GENDER_PLACEHOLDER = '🐾';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, token, setAuthData } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    reg_no: user?.reg_no || '',
    state: user?.state || '',
    district: user?.district || '',
    taluk: user?.taluk || '',
  });
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Change password
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old: '', newPwd: '', confirm: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Dropdowns
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [taluks, setTaluks] = useState<string[]>([]);
  const [dropdownType, setDropdownType] = useState<'state' | 'district' | 'taluk' | null>(null);
  const [dropSearch, setDropSearch] = useState('');

  useEffect(() => {
    fetchStates();
    loadCurrentPhoto();
    if (form.state) fetchDistricts(form.state);
    if (form.state && form.district) fetchTaluks(form.state, form.district);
  }, []);

  const loadCurrentPhoto = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.user?.profile_photo) setProfilePhoto(d.user.profile_photo);
    } catch (e) {}
  };

  const fetchStates = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/location/states`);
      const d = await res.json();
      setStates(d.states || []);
    } catch (e) {}
  };

  const fetchDistricts = async (state: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/location/districts/${encodeURIComponent(state)}`);
      const d = await res.json();
      setDistricts(d.districts || []);
    } catch (e) {}
  };

  const fetchTaluks = async (state: string, district: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/location/taluks/${encodeURIComponent(state)}/${encodeURIComponent(district)}`);
      const d = await res.json();
      setTaluks(d.taluks || []);
    } catch (e) {}
  };

  const pickPhoto = async () => {
    Alert.alert('Profile Photo', 'Choose source:', [
      { text: '📷 Camera', onPress: () => pickFromSource('camera') },
      { text: '🖼️ Gallery', onPress: () => pickFromSource('gallery') },
      { text: 'Remove Photo', style: 'destructive', onPress: () => setProfilePhoto('') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickFromSource = async (source: 'camera' | 'gallery') => {
    let result;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
    };
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access'); return; }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow gallery access'); return; }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }
      if (!result.canceled && result.assets[0].base64) {
        setProfilePhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (e) {}
  };

  const saveProfile = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Please enter your name'); return; }
    setSaving(true);
    try {
      const body: any = { name: form.name.trim(), reg_no: form.reg_no.trim() };
      if (form.state) body.state = form.state;
      if (form.district) body.district = form.district;
      if (form.taluk) body.taluk = form.taluk;
      if (profilePhoto) body.profile_photo = profilePhoto;

      const res = await fetch(`${BACKEND_URL}/api/users/me/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save');

      // Update local user data
      await setAuthData(token!, {
        ...user!,
        name: form.name.trim(),
        reg_no: form.reg_no.trim(),
        state: form.state,
        district: form.district,
        taluk: form.taluk,
        profile_photo: profilePhoto,
      } as any);

      Alert.alert('✅ Profile Updated!', 'Your profile has been saved successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save profile');
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!pwdForm.old) { Alert.alert('Required', 'Enter current password'); return; }
    if (pwdForm.newPwd.length < 6) { Alert.alert('Too Short', 'New password must be at least 6 characters'); return; }
    if (pwdForm.newPwd !== pwdForm.confirm) { Alert.alert('Mismatch', 'New passwords do not match'); return; }
    setSavingPwd(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: pwdForm.old, new_password: pwdForm.newPwd }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Failed');
      setShowChangePwd(false);
      setPwdForm({ old: '', newPwd: '', confirm: '' });
      Alert.alert('✅ Password Changed!', 'Your password has been updated successfully.');
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Could not change password');
    } finally { setSavingPwd(false); }
  };

  const openDropdown = (type: 'state' | 'district' | 'taluk') => {
    if (type === 'district' && !form.state) { Alert.alert('Select State first'); return; }
    if (type === 'taluk' && !form.district) { Alert.alert('Select District first'); return; }
    setDropSearch(''); setDropdownType(type);
  };

  const selectDropdown = (val: string) => {
    if (dropdownType === 'state') {
      setForm(f => ({ ...f, state: val, district: '', taluk: '' }));
      fetchDistricts(val);
    } else if (dropdownType === 'district') {
      setForm(f => ({ ...f, district: val, taluk: '' }));
      fetchTaluks(form.state, val);
    } else if (dropdownType === 'taluk') {
      setForm(f => ({ ...f, taluk: val }));
    }
    setDropdownType(null);
  };

  const getDropItems = () => {
    const items = dropdownType === 'state' ? states : dropdownType === 'district' ? districts : taluks;
    return dropSearch ? items.filter(i => i.toLowerCase().includes(dropSearch.toLowerCase())) : items;
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Profile Photo */}
        <View style={s.photoSection}>
          <TouchableOpacity testID="pick-photo-btn" style={s.photoWrap} onPress={pickPhoto} activeOpacity={0.8}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={s.photoImg} />
            ) : (
              <View style={s.photoPlaceholder}>
                <Text style={s.photoPlaceholderText}>{form.name ? form.name[0]?.toUpperCase() : '🐾'}</Text>
              </View>
            )}
            <View style={s.cameraBadge}>
              <Text style={s.cameraEmoji}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={s.photoHint}>Tap to change profile photo</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Personal Information</Text>

          <Text style={s.label}>FULL NAME *</Text>
          <TextInput testID="profile-name-input" style={s.input}
            placeholder="Dr. Your Full Name" placeholderTextColor={C.muted}
            value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />

          <Text style={s.label}>VET REGISTRATION NUMBER</Text>
          <TextInput testID="profile-regno-input" style={s.input}
            placeholder="e.g. TN/VCI/12345" placeholderTextColor={C.muted}
            value={form.reg_no} onChangeText={v => setForm(f => ({ ...f, reg_no: v }))}
            autoCapitalize="characters" />

          <Text style={s.sectionTitle} style={{ marginTop: 16 }}>Practice Location</Text>

          {(['state', 'district', 'taluk'] as const).map(field => (
            <View key={field}>
              <Text style={s.label}>{field.toUpperCase()}</Text>
              <TouchableOpacity style={[s.dropdown, !form[field] && s.dropdownEmpty]}
                onPress={() => openDropdown(field)}>
                <Text style={[s.dropdownText, !form[field] && { color: C.muted }]}>
                  {form[field] || `Select ${field.charAt(0).toUpperCase() + field.slice(1)}`}
                </Text>
                <Text style={s.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Change Password */}
        <TouchableOpacity testID="change-password-btn"
          style={s.changePwdBtn}
          onPress={() => setShowChangePwd(true)}>
          <Text style={s.changePwdEmoji}>🔑</Text>
          <View>
            <Text style={s.changePwdTitle}>Change Password</Text>
            <Text style={s.changePwdSub}>Update your login password</Text>
          </View>
          <Text style={s.changePwdArrow}>›</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity testID="save-profile-btn"
          style={[s.saveBtn, saving && s.btnDisabled]}
          onPress={saveProfile} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <><Text style={{ fontSize: 16 }}>✅</Text><Text style={s.saveBtnText}>Save Profile</Text></>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Location Dropdown Modal */}
      <Modal visible={!!dropdownType} transparent animationType="slide" onRequestClose={() => setDropdownType(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setDropdownType(null)}>
          <View style={s.dropdownSheet} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>
              Select {dropdownType === 'state' ? 'State' : dropdownType === 'district' ? 'District' : 'Taluk'}
            </Text>
            <TextInput style={s.searchInput} placeholder="Search..." placeholderTextColor={C.muted}
              value={dropSearch} onChangeText={setDropSearch} />
            <FlatList data={getDropItems()} keyExtractor={i => i}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.dropItem} onPress={() => selectDropdown(item)}>
                  <Text style={s.dropItemText}>{item}</Text>
                </TouchableOpacity>
              )} />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showChangePwd} transparent animationType="slide" onRequestClose={() => setShowChangePwd(false)}>
        <View style={s.modalOverlay}>
          <View style={s.pwdSheet}>
            <View style={s.sheetHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={s.sheetTitle}>🔑 Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePwd(false)} style={{ padding: 6 }}>
                <Text style={{ fontSize: 18, color: C.sub }}>✕</Text>
              </TouchableOpacity>
            </View>

            {(['old', 'newPwd', 'confirm'] as const).map((field, i) => (
              <View key={field} style={{ marginBottom: 14 }}>
                <Text style={s.label}>{['CURRENT PASSWORD', 'NEW PASSWORD', 'CONFIRM NEW PASSWORD'][i]}</Text>
                <View style={s.pwdRow}>
                  <TextInput style={[s.input, { flex: 1 }]}
                    placeholder={['Enter current password', 'Minimum 6 characters', 'Re-enter new password'][i]}
                    placeholderTextColor={C.muted}
                    secureTextEntry={field === 'old' ? !showOld : !showNew}
                    value={pwdForm[field]}
                    onChangeText={v => setPwdForm(f => ({ ...f, [field]: v }))}
                    testID={`pwd-${field}-input`}
                  />
                  {field !== 'confirm' && (
                    <TouchableOpacity style={s.eyeBtn} onPress={() => field === 'old' ? setShowOld(!showOld) : setShowNew(!showNew)}>
                      <Text style={{ fontSize: 18 }}>{field === 'old' ? (showOld ? '🙈' : '👁️') : (showNew ? '🙈' : '👁️')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <TouchableOpacity testID="save-password-btn"
              style={[s.saveBtn, savingPwd && s.btnDisabled]}
              onPress={changePassword} disabled={savingPwd}>
              {savingPwd ? <ActivityIndicator color="#fff" /> : (
                <><Text style={{ fontSize: 16 }}>🔒</Text><Text style={s.saveBtnText}>Update Password</Text></>
              )}
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { paddingHorizontal: 4, minWidth: 60 },
  backText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: C.primary },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: C.text },
  scroll: { padding: 16, paddingBottom: 40 },
  // Photo
  photoSection: { alignItems: 'center', marginBottom: 20 },
  photoWrap: { width: 100, height: 100, borderRadius: 50, position: 'relative', marginBottom: 8 },
  photoImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: C.primary },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.fill, borderWidth: 3, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  photoPlaceholderText: { fontSize: 38, fontFamily: 'Inter_800ExtraBold', color: C.primary },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.surface },
  cameraEmoji: { fontSize: 16 },
  photoHint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: C.muted },
  // Form
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: C.text, marginBottom: 14 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: C.sub, letterSpacing: 0.8, marginBottom: 7, marginTop: 12 },
  input: { height: 50, borderRadius: 12, backgroundColor: C.fill, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 15, color: C.text },
  dropdown: { height: 50, borderRadius: 12, backgroundColor: C.fill, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownEmpty: { opacity: 0.8 },
  dropdownText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: C.text, flex: 1 },
  dropdownArrow: { fontSize: 12, color: C.sub },
  // Change password button
  changePwdBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  changePwdEmoji: { fontSize: 24 },
  changePwdTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: C.text },
  changePwdSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: C.sub, marginTop: 2 },
  changePwdArrow: { fontSize: 22, color: C.sub, marginLeft: 'auto' },
  // Save
  saveBtn: { height: 52, backgroundColor: C.primary, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, boxShadow: '0px 4px 16px rgba(0,96,100,0.30)' },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  dropdownSheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingBottom: 32 },
  pwdSheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 32 },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  sheetTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 18, color: C.text, textAlign: 'center', marginBottom: 12 },
  searchInput: { height: 46, borderRadius: 12, backgroundColor: C.fill, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 14, color: C.text, marginBottom: 8 },
  dropItem: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  dropItemText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: C.text },
  // Password
  pwdRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 12, height: 50, justifyContent: 'center', paddingHorizontal: 8 },
});
