import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator, TouchableOpacity, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  Animated, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import * as Contacts from 'expo-contacts';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const ANIMAL_TYPES = ['Dog', 'Cat', 'Cow', 'Buffalo', 'Goat', 'Sheep', 'Poultry', 'Horse', 'Bird', 'Rabbit', 'Pig', 'Other'];
const VISIT_REASONS = ['Vaccination', 'Check-up', 'Treatment', 'Emergency', 'Surgery', 'Follow-up', 'Deworming', 'Grooming', 'Other'];

interface Stats {
  today_cases: number;
  pending_cases: number;
  today_earnings: number;
  total_earnings: number;
  pending_payments: number;
  total_cases: number;
}

const STAT_CARDS = [
  { key: 'today_cases', label: "Today's Cases", emoji: '🩺', color: '#E8F5E9', numColor: '#2E7D32' },
  { key: 'pending_cases', label: 'Pending Cases', emoji: '⏳', color: '#FFF8E1', numColor: '#F57F17' },
  { key: 'today_earnings', label: "Today's Earnings", emoji: '💰', color: '#E3F2FD', numColor: '#1565C0', isMoney: true },
  { key: 'total_earnings', label: 'Total Earnings', emoji: '📈', color: '#F3E5F5', numColor: '#6A1B9A', isMoney: true },
  { key: 'pending_payments', label: 'Pending Payment', emoji: '💳', color: '#FBE9E7', numColor: '#BF360C', isMoney: true },
  { key: 'total_cases', label: 'Total Cases', emoji: '📋', color: '#E0F2F1', numColor: '#004D40' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick Add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quickForm, setQuickForm] = useState({
    owner_name: '', mobile: '', animal_type: '', visit_reason: '', estimated_amount: '', notes: '',
  });
  const [pickerType, setPickerType] = useState<'animal' | 'reason' | null>(null);
  const fabAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [user, authLoading]);

  useEffect(() => {
    if (token) fetchStats();
  }, [token]);

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) { logout(); router.replace('/'); return; }
        throw new Error('Failed to fetch stats');
      }
      setStats(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchStats(); }, [token]);

  // FAB pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fabAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(fabAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const openQuickAdd = () => {
    setQuickForm({ owner_name: '', mobile: '', animal_type: '', visit_reason: '', estimated_amount: '', notes: '' });
    setShowQuickAdd(true);
  };

  const pickFromContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow contact access to pick a contact.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });
      if (!data.length) { Alert.alert('No Contacts', 'No contacts found on this device.'); return; }

      // Show contact picker
      const contactItems = data
        .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
        .slice(0, 200)
        .map(c => ({
          name: c.name || 'Unknown',
          phone: c.phoneNumbers![0].number?.replace(/[\s\-\(\)]/g, '') || '',
        }));

      setContactList(contactItems);
      setShowContactPicker(true);
    } catch (e) {
      Alert.alert('Error', 'Could not access contacts');
    }
  };

  const [contactList, setContactList] = useState<{ name: string; phone: string }[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  const selectContact = (contact: { name: string; phone: string }) => {
    setQuickForm(f => ({ ...f, owner_name: contact.name, mobile: contact.phone.replace(/\D/g, '').slice(-10) }));
    setShowContactPicker(false);
    setContactSearch('');
  };

  const handleSaveCase = async () => {
    const { owner_name, mobile, animal_type, visit_reason } = quickForm;
    if (!owner_name.trim()) { Alert.alert('Required', 'Please enter owner name'); return; }
    if (!mobile.trim() || mobile.length < 10) { Alert.alert('Required', 'Please enter a valid 10-digit mobile number'); return; }
    if (!animal_type) { Alert.alert('Required', 'Please select animal type'); return; }
    if (!visit_reason) { Alert.alert('Required', 'Please select visit reason'); return; }

    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases/quick-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          owner_name: owner_name.trim(),
          mobile: mobile.trim(),
          animal_type,
          visit_reason,
          estimated_amount: parseFloat(quickForm.estimated_amount) || 0,
          notes: quickForm.notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save');
      setShowQuickAdd(false);
      fetchStats();
      Alert.alert('✅ Case Added!', `${animal_type} case for ${owner_name} has been recorded.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save case');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  const formatValue = (val: number, isMoney: boolean) => {
    if (isMoney) return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    return val.toString();
  };

  if (authLoading || !user) {
    return <View style={styles.centerLoader}><ActivityIndicator size="large" color="#2E7D32" /></View>;
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const filteredContacts = contactSearch
    ? contactList.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch))
    : contactList;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E7D32" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.doctorName}>Dr. {user.name}</Text>
            <Text style={styles.regNo}>{user.reg_no || 'Veterinarian'}</Text>
          </View>
          <TouchableOpacity testID="logout-btn" style={styles.avatarBtn} onPress={handleLogout}>
            <Text style={styles.avatarEmoji}>🐾</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.locationPill}>
          <Text style={styles.locationText}>📍 {user.taluk}, {user.district}, {user.state}</Text>
        </View>

        {/* Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Practice Overview</Text>
          <TouchableOpacity testID="refresh-stats-btn" onPress={onRefresh}>
            <Text style={styles.refreshText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Loading stats...</Text>
          </View>
        ) : (
          <View style={styles.grid} testID="stats-grid">
            {STAT_CARDS.map(card => (
              <View key={card.key} testID={`stat-card-${card.key}`} style={[styles.card, { backgroundColor: card.color }]}>
                <View style={styles.emojiWrap}>
                  <Text style={styles.cardEmoji}>{card.emoji}</Text>
                </View>
                <Text style={[styles.cardNumber, { color: card.numColor }]}>
                  {stats ? formatValue((stats as any)[card.key], card.isMoney || false) : '--'}
                </Text>
                <Text style={styles.cardLabel}>{card.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionsRow}>
          {[
            { id: 'new-case', emoji: '➕', label: 'New Case', onPress: openQuickAdd },
            { id: 'appointments', emoji: '🗓️', label: 'Schedule', onPress: () => {} },
            { id: 'patients', emoji: '🐕', label: 'Patients', onPress: () => {} },
            { id: 'billing', emoji: '🧾', label: 'Billing', onPress: () => {} },
          ].map(a => (
            <TouchableOpacity key={a.id} testID={`${a.id}-btn`} style={styles.actionBtn} onPress={a.onPress}>
              <Text style={styles.actionEmoji}>{a.emoji}</Text>
              <Text style={styles.actionText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.comingSoonBanner, { marginBottom: 100 }]} testID="coming-soon-banner">
          <Text style={styles.comingSoonEmoji}>🚀</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.comingSoonTitle}>More Features Coming!</Text>
            <Text style={styles.comingSoonSubtitle}>Patient records, prescriptions & billing</Text>
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabAnim }] }]}>
        <TouchableOpacity testID="fab-quick-add" style={styles.fab} onPress={openQuickAdd} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
          <Text style={styles.fabLabel}>Quick Add</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Quick Add Modal */}
      <Modal visible={showQuickAdd} transparent animationType="slide" onRequestClose={() => setShowQuickAdd(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Quick Add Case</Text>
                  <Text style={styles.modalSubtitle}>Add a walk-in or call lead</Text>
                </View>
                <TouchableOpacity testID="close-quick-add" onPress={() => setShowQuickAdd(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Mobile + Contacts */}
                <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                <View style={styles.mobileRow}>
                  <TextInput
                    testID="quick-mobile-input"
                    style={[styles.modalInput, { flex: 1 }]}
                    placeholder="10-digit number"
                    placeholderTextColor="#9EB09F"
                    keyboardType="phone-pad"
                    value={quickForm.mobile}
                    onChangeText={v => setQuickForm(f => ({ ...f, mobile: v.replace(/\D/g, '').slice(0, 10) }))}
                    maxLength={10}
                  />
                  <TouchableOpacity
                    testID="pick-contact-btn"
                    style={styles.contactBtn}
                    onPress={pickFromContacts}
                  >
                    <Text style={styles.contactBtnEmoji}>📱</Text>
                    <Text style={styles.contactBtnText}>Contacts</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>OWNER NAME</Text>
                <TextInput
                  testID="quick-owner-input"
                  style={styles.modalInput}
                  placeholder="Pet owner's name"
                  placeholderTextColor="#9EB09F"
                  value={quickForm.owner_name}
                  onChangeText={v => setQuickForm(f => ({ ...f, owner_name: v }))}
                />

                {/* Animal + Reason - side by side */}
                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>ANIMAL TYPE</Text>
                    <TouchableOpacity
                      testID="animal-type-picker"
                      style={styles.pickerBtn}
                      onPress={() => setPickerType('animal')}
                    >
                      <Text style={[styles.pickerText, !quickForm.animal_type && styles.pickerPlaceholder]}>
                        {quickForm.animal_type || 'Select'}
                      </Text>
                      <Text style={styles.pickerArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>VISIT REASON</Text>
                    <TouchableOpacity
                      testID="visit-reason-picker"
                      style={styles.pickerBtn}
                      onPress={() => setPickerType('reason')}
                    >
                      <Text style={[styles.pickerText, !quickForm.visit_reason && styles.pickerPlaceholder]}>
                        {quickForm.visit_reason || 'Select'}
                      </Text>
                      <Text style={styles.pickerArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.inputLabel}>ESTIMATED AMOUNT (₹) <Text style={styles.optionalTag}>Optional</Text></Text>
                <TextInput
                  testID="quick-amount-input"
                  style={styles.modalInput}
                  placeholder="e.g. 500"
                  placeholderTextColor="#9EB09F"
                  keyboardType="numeric"
                  value={quickForm.estimated_amount}
                  onChangeText={v => setQuickForm(f => ({ ...f, estimated_amount: v }))}
                />

                <Text style={styles.inputLabel}>NOTES <Text style={styles.optionalTag}>Optional</Text></Text>
                <TextInput
                  testID="quick-notes-input"
                  style={[styles.modalInput, styles.notesInput]}
                  placeholder="Any quick notes..."
                  placeholderTextColor="#9EB09F"
                  multiline
                  numberOfLines={2}
                  value={quickForm.notes}
                  onChangeText={v => setQuickForm(f => ({ ...f, notes: v }))}
                />

                <TouchableOpacity
                  testID="save-case-btn"
                  style={[styles.saveBtn, saving && styles.btnDisabled]}
                  onPress={handleSaveCase}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <><Text style={styles.saveBtnEmoji}>✅</Text><Text style={styles.saveBtnText}>Save Case</Text></>
                  }
                </TouchableOpacity>

                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Mini picker modal (animal/reason) */}
      <Modal visible={!!pickerType} transparent animationType="fade" onRequestClose={() => setPickerType(null)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerType(null)}>
          <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>
              {pickerType === 'animal' ? '🐾 Select Animal Type' : '🩺 Select Visit Reason'}
            </Text>
            <View style={styles.chipGrid}>
              {(pickerType === 'animal' ? ANIMAL_TYPES : VISIT_REASONS).map(item => (
                <TouchableOpacity
                  key={item}
                  testID={`picker-${item}`}
                  style={[
                    styles.chip,
                    ((pickerType === 'animal' ? quickForm.animal_type : quickForm.visit_reason) === item) && styles.chipSelected,
                  ]}
                  onPress={() => {
                    if (pickerType === 'animal') setQuickForm(f => ({ ...f, animal_type: item }));
                    else setQuickForm(f => ({ ...f, visit_reason: item }));
                    setPickerType(null);
                  }}
                >
                  <Text style={[
                    styles.chipText,
                    ((pickerType === 'animal' ? quickForm.animal_type : quickForm.visit_reason) === item) && styles.chipTextSelected,
                  ]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Contact picker modal */}
      <Modal visible={showContactPicker} transparent animationType="slide" onRequestClose={() => setShowContactPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>📱 Pick Contact</Text>
            <TextInput
              style={[styles.modalInput, { marginHorizontal: 0, marginBottom: 8 }]}
              placeholder="Search name or number..."
              placeholderTextColor="#9EB09F"
              value={contactSearch}
              onChangeText={setContactSearch}
            />
            <FlatList
              data={filteredContacts}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={`contact-item-${item.phone}`}
                  style={styles.contactItem}
                  onPress={() => selectContact(item)}
                >
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>{item.name[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactPhone}>{item.phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14, color: C.textSecondary },
  doctorName: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginTop: 2 },
  regNo: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  avatarBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  locationPill: {
    marginHorizontal: 24, marginBottom: 20, backgroundColor: C.surfaceSecondary,
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  locationText: { fontSize: 13, color: C.primary, fontWeight: '500' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  refreshText: { fontSize: 14, color: C.primaryLight, fontWeight: '600' },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: C.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 24 },
  card: {
    width: '47%', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, minHeight: 110,
  },
  emojiWrap: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  cardEmoji: { fontSize: 20 },
  cardNumber: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  cardLabel: { fontSize: 13, fontWeight: '500', color: C.textSecondary, lineHeight: 18 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 24 },
  actionBtn: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  actionEmoji: { fontSize: 24, marginBottom: 6 },
  actionText: { fontSize: 11, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },
  comingSoonBanner: {
    marginHorizontal: 16, backgroundColor: C.primary, borderRadius: 20,
    padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  comingSoonEmoji: { fontSize: 36 },
  comingSoonTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  comingSoonSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  // FAB
  fabContainer: {
    position: 'absolute', bottom: 24, right: 20,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fab: {
    backgroundColor: C.primary, borderRadius: 28,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  fabIcon: { fontSize: 22, color: '#fff', fontWeight: '800' },
  fabLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  modalSubtitle: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0F4F1', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 14, color: C.textSecondary, fontWeight: '700' },
  modalScroll: { maxHeight: 480 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: C.textSecondary, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  optionalTag: { fontSize: 10, color: '#9EB09F', fontWeight: '400', textTransform: 'none' },
  modalInput: {
    height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: '#FDFBF7', paddingHorizontal: 14, fontSize: 15, color: C.textPrimary,
  },
  mobileRow: { flexDirection: 'row', gap: 8 },
  contactBtn: {
    height: 52, backgroundColor: C.surfaceSecondary, borderRadius: 12,
    paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  contactBtnEmoji: { fontSize: 18 },
  contactBtnText: { fontSize: 10, color: C.primary, fontWeight: '600', marginTop: 2 },
  rowInputs: { flexDirection: 'row' },
  pickerBtn: {
    height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: '#FDFBF7', paddingHorizontal: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 14, color: C.textPrimary, flex: 1 },
  pickerPlaceholder: { color: '#9EB09F' },
  pickerArrow: { fontSize: 10, color: C.textSecondary },
  notesInput: { height: 72, paddingTop: 12, textAlignVertical: 'top' },
  saveBtn: {
    height: 56, backgroundColor: C.primary, borderRadius: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginTop: 20,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnEmoji: { fontSize: 18 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Picker chips
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 16 },
  pickerSheet: { backgroundColor: C.surface, borderRadius: 24, padding: 20 },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 16, textAlign: 'center' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: C.surfaceSecondary, borderWidth: 1.5, borderColor: C.border,
  },
  chipSelected: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  chipTextSelected: { color: '#fff' },

  // Contact picker
  contactItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F4F1', gap: 12,
  },
  contactAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  contactAvatarText: { fontSize: 16, fontWeight: '700', color: C.primary },
  contactName: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  contactPhone: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
});
