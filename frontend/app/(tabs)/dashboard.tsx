import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Linking,
  Animated, FlatList, Image} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

const APP_ICON = require('../../assets/images/icon.png');
import * as Contacts from 'expo-contacts';
import * as Clipboard from 'expo-clipboard';
import DatePickerModal from '../../components/DatePicker';
import AdBanner from '../../components/AdBanner';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const ANIMAL_TYPES = ['Dog', 'Cat', 'Cow', 'Buffalo', 'Goat', 'Sheep', 'Poultry', 'Horse', 'Bird', 'Rabbit', 'Pig', 'Other'];
const VISIT_REASONS = ['Vaccination', 'Check-up', 'Treatment', 'Emergency', 'Surgery', 'Follow-up', 'Deworming', 'Grooming', 'Other'];
const PAYMENT_MODES = ['Cash', 'GPay', 'Online', 'Cheque', 'Other'];

const C = {
  primary: '#006064', primaryLight: '#00838F', primaryDark: '#004D40',
  bg: '#F0FAFA', surface: '#FFFFFF', fill: '#E0F2F1', fillDark: '#D6EDD8',
  text: '#1A2E1C', sub: '#4B6352', muted: '#8FA891',
  border: '#B2DFDB', borderLight: '#E8F5EA',
  warning: '#E65100', error: '#C62828', blue: '#1565C0'};

// Inter font helpers
const FN = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold'};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tom.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' });
}

function formatDateLabel(date: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tom.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Case {
  id: string; owner_name: string; mobile: string; village_name: string;
  animal_type: string; visit_reason: string; visit_date: string;
  amount: number; status: string; is_paid: boolean; payment_mode: string | null;
  paid_amount: number; follow_up_date: string | null; forwarded_from: string;
}

const STAT_CARDS = [
  { key: 'today_cases', label: "Today's Cases", emoji: '🩺', color: '#E0F2F1', num: '#006064', route: '/(tabs)/cases', routeParam: 'today' },
  { key: 'upcoming_cases', label: 'Upcoming', emoji: '📅', color: '#E3F2FD', num: C.blue, route: '/(tabs)/cases', routeParam: 'upcoming' },
  { key: 'today_earnings', label: "Today's Earnings", emoji: '💰', color: '#FFF8E1', num: C.warning, money: true, route: '/(tabs)/reports', routeParam: 'earnings' },
  { key: 'total_earnings', label: 'Total Earnings', emoji: '📈', color: '#F3E5F5', num: '#6A1B9A', money: true, route: '/(tabs)/reports', routeParam: 'earnings' },
  { key: 'pending_payments', label: 'Outstanding', emoji: '💳', color: '#FBE9E7', num: C.error, money: true, route: '/(tabs)/ledger' },
  { key: 'total_cases', label: 'Total Cases', emoji: '📋', color: '#E0F2F1', num: '#004D40', route: '/(tabs)/cases', routeParam: 'closed' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [todayCases, setTodayCases] = useState<Case[]>([]);
  const [upcomingCases, setUpcomingCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fabAnim = useRef(new Animated.Value(1)).current;

  // Quick Add
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState({ owner_name: '', mobile: '', village_name: '', animal_type: '', visit_reason: '', notes: '', opening_balance: '' });
  const [visitDate, setVisitDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [allVillages, setAllVillages] = useState<string[]>([]);
  const [villageSuggestions, setVillageSuggestions] = useState<string[]>([]);
  const [showVillageSug, setShowVillageSug] = useState(false);
  const [pickerType, setPickerType] = useState<'animal' | 'reason' | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [contactList, setContactList] = useState<{ name: string; phone: string }[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  // Clipboard + farmer lookup
  const [clipboardBanner, setClipboardBanner] = useState('');
  const [knownFarmers, setKnownFarmers] = useState<any[]>([]);
  const [farmerSuggestions, setFarmerSuggestions] = useState<any[]>([]);
  const [showFarmerSug, setShowFarmerSug] = useState(false);
  const [autoFilledBanner, setAutoFilledBanner] = useState('');
  const [globalSuggestion, setGlobalSuggestion] = useState<{ name: string; village: string } | null>(null);

  // Close Case
  const [closeCase, setCloseCase] = useState<Case | null>(null);
  const [closeForm, setCloseForm] = useState({
    treatment_status: 'treated',   // 'treated' | 'not_treated'
    amount: '',
    payment_status: 'full',        // 'full' | 'partial' | 'not_paid'
    payment_mode: 'Cash',
    paid_amount: '',               // for partial
  });
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(new Date());
  const [followUpReason, setFollowUpReason] = useState('');
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false);
  const [closeSaving, setCloseSaving] = useState(false);

  useEffect(() => { if (!authLoading && !user) router.replace('/'); }, [user, authLoading]);
  useEffect(() => { if (token) fetchAll(); }, [token]);
  useEffect(() => {
    const p = Animated.loop(Animated.sequence([
      Animated.timing(fabAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
      Animated.timing(fabAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    p.start(); return () => p.stop();
  }, []);

  const fetchAll = async () => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [s, t, u] = await Promise.all([
        fetch(`${BACKEND_URL}/api/dashboard/stats`, { headers: h }).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/cases/today`, { headers: h }).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/cases/upcoming`, { headers: h }).then(r => r.json()),
      ]);
      // Auto-logout if any response indicates expired token
      if (s?.detail === 'Not authenticated' || t?.detail === 'Not authenticated') {
        await logout(); router.replace('/'); return;
      }
      setStats(s); setTodayCases(t.cases || []); setUpcomingCases(u.cases || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchAll(); }, [token]);

  const openQuickAdd = async () => {
    // Block new entries if trial expired
    if (user?.is_trial_expired) {
      Alert.alert(
        '⛔ Trial Expired',
        'Your 7-day free trial has ended. Activate your account to continue adding cases.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Activate Now', onPress: () => router.push('/activate') },
        ]
      );
      return;
    }
    setQuickForm({ owner_name: '', mobile: '', village_name: '', animal_type: '', visit_reason: '', notes: '', opening_balance: '' });
    setVisitDate(new Date());
    setClipboardBanner('');
    setAutoFilledBanner('');
    setFarmerSuggestions([]);
    setShowFarmerSug(false);
    setShowQuickAdd(true);

    if (token) {
      // Load villages + known farmers in parallel
      const [vRes, fRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/villages`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/cases/farmer-lookup`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [vData, fData] = await Promise.all([vRes.json(), fRes.json()]);
      setAllVillages(vData.villages || []);
      setKnownFarmers(fData.farmers || []);

      // Check clipboard for an Indian phone number (handles +91, 91, 0 prefixes)
      try {
        const clip = await Clipboard.getStringAsync();
        if (clip) {
          const normalized = normalizeIndianMobile(clip);
          if (normalized.length === 10) {
            setClipboardBanner(normalized);
          }
        }
      } catch (e) { /* clipboard permission denied on some devices */ }
    }
  };

  const applyClipboardNumber = (num: string) => {
    setQuickForm(f => ({ ...f, mobile: num }));
    setClipboardBanner('');
    checkAndAutoFillFarmer(num);
  };

  const checkAndAutoFillFarmer = async (mobile: string) => {
    if (mobile.length !== 10) return;

    // 1. Check cached known farmers (fast, in-memory)
    const match = knownFarmers.find(f => f.mobile === mobile);
    if (match) {
      setQuickForm(f => ({ ...f, mobile, owner_name: match.owner_name, village_name: match.village_name || f.village_name }));
      setAutoFilledBanner(`✅ Previous client: ${match.owner_name}${match.village_name ? ` · ${match.village_name}` : ''} (${match.case_count} visit${match.case_count > 1 ? 's' : ''})`);
      setShowFarmerSug(false);
      return;
    }

    // 2. Direct API lookup by exact mobile — finds ALL farmers regardless of age
    if (token) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/cases/farmer-lookup?q=${mobile}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.farmers?.length > 0) {
          const farmer = data.farmers[0];
          setAutoFilledBanner(`✅ Previous client: ${farmer.owner_name}${farmer.village_name ? ` · ${farmer.village_name}` : ''} (${farmer.case_count} visit${farmer.case_count > 1 ? 's' : ''})`);
          setGlobalSuggestion({ name: farmer.owner_name, village: farmer.village_name || '' });
          return;
        }
      } catch (e) { /* silent */ }
    }

    // 3. Cross-vet global suggestion
    if (token) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/farmer-suggest?mobile=${mobile}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.names?.length > 0) {
          const sugName = data.names[0];
          const sugVillage = data.villages?.[0] || '';
          setAutoFilledBanner(`💡 Known as: ${sugName}${sugVillage ? ` · ${sugVillage}` : ''} — Tap to use`);
          setGlobalSuggestion({ name: sugName, village: sugVillage });
          return;
        }
      } catch (e) { /* silent */ }
    }
    setAutoFilledBanner('');
    setGlobalSuggestion(null);
  };

  // Smart Indian mobile number normalizer — handles all paste formats
  const normalizeIndianMobile = (raw: string): string => {
    // Step 1: Remove all non-digit characters (+, spaces, hyphens, brackets etc.)
    let digits = raw.replace(/\D/g, '');
    // Step 2: Strip country code prefixes
    if (digits.length === 13 && digits.startsWith('091')) digits = digits.slice(3);   // 091XXXXXXXXXX
    else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2); // 91XXXXXXXXXX
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1); // 0XXXXXXXXXX
    // Step 3: If still >10 digits, take the last 10 (most reliable for all formats)
    if (digits.length > 10) digits = digits.slice(-10);
    return digits.slice(0, 10);
  };

  const handleMobileChange = (v: string) => {
    const digits = normalizeIndianMobile(v);
    setQuickForm(f => ({ ...f, mobile: digits }));
    setAutoFilledBanner('');
    setGlobalSuggestion(null);
    if (digits.length === 10) checkAndAutoFillFarmer(digits);
  };

  const handleOwnerNameChange = (v: string) => {
    setQuickForm(f => ({ ...f, owner_name: v }));
    setAutoFilledBanner('');
    if (v.length >= 2) {
      const matches = knownFarmers.filter(f =>
        f.owner_name.toLowerCase().includes(v.toLowerCase())
      ).slice(0, 5);
      setFarmerSuggestions(matches);
      setShowFarmerSug(matches.length > 0);
    } else {
      setShowFarmerSug(false);
    }
  };

  const selectFarmerSuggestion = (farmer: any) => {
    setQuickForm(f => ({ ...f, owner_name: farmer.owner_name, mobile: farmer.mobile, village_name: farmer.village_name || f.village_name }));
    setAutoFilledBanner(`✅ Loaded: ${farmer.owner_name}${farmer.village_name ? ` · ${farmer.village_name}` : ''} (${farmer.case_count} visit${farmer.case_count > 1 ? 's' : ''})`);
    setShowFarmerSug(false);
  };

  const handleVillageChange = (text: string) => {
    setQuickForm(f => ({ ...f, village_name: text }));
    if (text.length > 0) {
      const filtered = allVillages.filter(v => v.toLowerCase().includes(text.toLowerCase()));
      setVillageSuggestions(filtered.slice(0, 5));
      setShowVillageSug(filtered.length > 0);
    } else { setShowVillageSug(false); }
  };

  const pickFromContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Allow contacts access to pick a contact.'); return; }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers] });
      const items = data.filter(c => c.phoneNumbers?.length).slice(0, 200).map(c => ({
        name: c.name || 'Unknown', phone: c.phoneNumbers![0].number?.replace(/[\s\-\(\)]/g, '') || ''}));
      setContactList(items); setContactSearch(''); setShowContactPicker(true);
    } catch (e) { Alert.alert('Error', 'Could not access contacts'); }
  };

  const saveQuickAdd = async () => {
    if (!quickForm.owner_name || !quickForm.mobile || !quickForm.animal_type || !quickForm.visit_reason) {
      Alert.alert('Required', 'Please fill:\n• Owner Name\n• Mobile Number\n• Animal Type\n• Visit Reason'); return;
    }
    if (quickForm.mobile.length < 10) { Alert.alert('Invalid Mobile', 'Enter a valid 10-digit mobile number'); return; }
    // Check token exists
    if (!token) {
      Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
        { text: 'Login', onPress: async () => { await logout(); router.replace('/'); } }
      ]); return;
    }
    setQuickSaving(true);
    try {
      const visitDateStr = visitDate.toISOString().split('T')[0];
      const res = await fetch(`${BACKEND_URL}/api/cases/quick-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...quickForm, visit_date: visitDateStr, opening_balance: parseFloat(quickForm.opening_balance) || 0 })});
      const d = await res.json();
      if (res.status === 401) {
        // Token expired — auto logout
        Alert.alert('Session Expired', 'Your session has expired. Please login again to continue.', [
          { text: 'Login Now', onPress: async () => { await logout(); router.replace('/'); } }
        ]); return;
      }
      if (!res.ok) throw new Error(d.detail || 'Failed to save case');
      setShowQuickAdd(false); fetchAll();
      Alert.alert('✅ Case Added!', `${quickForm.animal_type} case for ${quickForm.owner_name} saved.`);
    } catch (e: any) {
      if (e.message?.includes('401') || e.message === 'Not authenticated') {
        Alert.alert('Session Expired', 'Please login again.', [
          { text: 'Login', onPress: async () => { await logout(); router.replace('/'); } }
        ]);
      } else {
        Alert.alert('Save Failed', e.message || 'Could not save case. Check your internet connection.');
      }
    }
    finally { setQuickSaving(false); }
  };

  const openCloseCase = (c: Case) => {
    setCloseCase(c);
    setCloseForm({ treatment_status: 'treated', amount: '', payment_status: 'full', payment_mode: 'Cash', paid_amount: '' });
    setShowFollowUp(false);
    setFollowUpReason('');
    const fu = new Date(); fu.setDate(fu.getDate() + 7);
    setFollowUpDate(fu);
  };

  const saveClose = async () => {
    if (!closeCase) return;
    const { treatment_status, amount, payment_status, payment_mode, paid_amount } = closeForm;

    if (treatment_status === 'treated') {
      if (!amount || isNaN(parseFloat(amount))) {
        Alert.alert('Required', 'Please enter the amount charged (0 if free)'); return;
      }
      if (payment_status === 'partial') {
        if (!paid_amount || isNaN(parseFloat(paid_amount))) {
          Alert.alert('Required', 'Enter the amount received now'); return;
        }
        if (parseFloat(paid_amount) >= parseFloat(amount)) {
          Alert.alert('Invalid', 'Partial amount must be less than total charged'); return;
        }
      }
    }
    setCloseSaving(true);
    try {
      const fuStr = showFollowUp ? followUpDate.toISOString().split('T')[0] : null;
      const res = await fetch(`${BACKEND_URL}/api/cases/${closeCase.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          treatment_status,
          amount: treatment_status === 'treated' ? parseFloat(amount) || 0 : 0,
          payment_status: treatment_status === 'treated' ? payment_status : 'not_applicable',
          payment_mode: payment_status !== 'not_paid' ? payment_mode : null,
          paid_amount: payment_status === 'partial' ? parseFloat(paid_amount) || 0 : (payment_status === 'full' ? parseFloat(amount) || 0 : 0),
          follow_up_date: fuStr,
          follow_up_reason: showFollowUp ? followUpReason.trim() || 'Follow-up' : ''})});
      if (!res.ok) throw new Error('Failed to close case');
      setCloseCase(null); fetchAll();

      const msgs: string[] = [];
      if (treatment_status === 'not_treated') {
        msgs.push('Case closed as Not Treated.');
      } else if (payment_status === 'full') {
        msgs.push(`✅ ₹${amount} received. Added to earnings.`);
      } else if (payment_status === 'partial') {
        const outstanding = parseFloat(amount) - parseFloat(paid_amount);
        msgs.push(`₹${paid_amount} received. ₹${outstanding.toFixed(0)} added to Outstanding Ledger.`);
      } else {
        msgs.push(`₹${amount} added to Outstanding Ledger.`);
      }
      if (fuStr) msgs.push('Follow-up scheduled.');
      Alert.alert('✅ Case Closed', msgs.join('\n'));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setCloseSaving(false); }
  };

  const callPhone = (phone: string) => { Linking.openURL(`tel:${phone}`); };

  const handleLogout = () => Alert.alert('Logout', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
  ]);

  const fmt = (val: number, money: boolean) =>
    money ? `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : `${val}`;

  const filteredContacts = contactSearch
    ? contactList.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch))
    : contactList;

  if (authLoading || !user) return <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <SafeAreaView style={styles.safe} edges={["top","left","right"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.name}>Dr. {user.name}</Text>
            <Text style={styles.reg}>{user.reg_no}</Text>
          </View>
          <TouchableOpacity testID="logout-btn" style={styles.avatarBtn} onPress={handleLogout}>
            <Image source={APP_ICON} style={styles.avatarIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>
        <View style={styles.locPill}>
          <Text style={styles.locText}>📍 {user.taluk}, {user.district}, {user.state}</Text>
        </View>

        {/* Trial Banner — Active */}
        {user.is_trial && !user.is_trial_expired && (user.trial_days_left ?? 0) > 0 && (
          <TouchableOpacity testID="trial-banner"
            style={[styles.trialBanner, (user.trial_days_left ?? 0) <= 2 && styles.trialBannerUrgent]}
            onPress={() => router.push('/activate')}>
            <Text style={styles.trialBannerText}>
              ⏳ {user.trial_days_left} day{(user.trial_days_left ?? 0) !== 1 ? 's' : ''} left in free trial
            </Text>
            <Text style={styles.trialBannerAction}>Activate Now →</Text>
          </TouchableOpacity>
        )}

        {/* Trial Expired Banner */}
        {user.is_trial_expired && (
          <TouchableOpacity testID="trial-expired-banner"
            style={styles.trialExpiredBanner}
            onPress={() => router.push('/activate')}>
            <View>
              <Text style={styles.trialExpiredTitle}>⛔ Free Trial Ended</Text>
              <Text style={styles.trialExpiredSub}>Activate your account to add new cases & payments</Text>
            </View>
            <Text style={styles.trialExpiredAction}>Pay ₹200 →</Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Practice Overview</Text>
          <TouchableOpacity testID="refresh-stats-btn" onPress={onRefresh}>
            <Text style={styles.refreshBtn}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.loadBox}><ActivityIndicator color={C.primary} size="large" /></View>
        ) : (
          <View style={styles.grid} testID="stats-grid">
            {STAT_CARDS.map(card => (
              <TouchableOpacity
                key={card.key}
                testID={`stat-${card.key}`}
                style={[styles.card, { backgroundColor: card.color }]}
                activeOpacity={0.78}
                onPress={() => {
                  if (card.route === '/(tabs)/cases' && card.routeParam) {
                    router.push({ pathname: '/(tabs)/cases', params: { tab: card.routeParam } });
                  } else if (card.route === '/(tabs)/reports' && card.routeParam) {
                    router.push({ pathname: '/(tabs)/reports', params: { tab: card.routeParam } });
                  } else if (card.route) {
                    router.push(card.route as any);
                  }
                }}
              >
                <View style={styles.emojiWrap}><Text style={{ fontSize: 14 }}>{card.emoji}</Text></View>
                <Text style={[styles.statNum, { color: card.num }]}>
                  {stats ? fmt((stats as any)[card.key] || 0, card.money || false) : '--'}
                </Text>
                <Text style={styles.statLabel}>{card.label}</Text>
                <Text style={[styles.cardArrow, { color: card.num }]}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Today's Cases */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Today's Cases ({todayCases.length})</Text>
        </View>
        {todayCases.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No cases scheduled for today</Text>
            <TouchableOpacity onPress={openQuickAdd}><Text style={styles.emptyAction}>+ Add a case</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.caseList}>
            {todayCases.map(c => (
              <View key={c.id} testID={`today-case-${c.id}`} style={styles.caseCard}>
                {c.forwarded_from ? (
                  <View style={styles.forwardBadge}>
                    <Text style={styles.forwardText}>↩ Forwarded by Dr. {c.forwarded_from}</Text>
                  </View>
                ) : null}
                <View style={styles.caseRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.caseOwner}>{c.owner_name}</Text>
                    <Text style={styles.caseVillage}>
                      {c.village_name ? `📍 ${c.village_name}` : ''}
                    </Text>
                    <Text style={styles.caseMeta}>{c.animal_type} • {c.visit_reason}</Text>
                    {c.notes ? <Text style={styles.caseNotes}>📝 {c.notes}</Text> : null}
                  </View>
                  <View style={styles.caseStatus}>
                    <View style={[styles.statusBadge,
                      c.status === 'closed' ? styles.statusClosed : styles.statusActive]}>
                      <Text style={styles.statusText}>
                        {c.status === 'closed' ? (c.is_paid ? '✓ Paid' : '✓ Unpaid') : 'Active'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.caseActions}>
                  <TouchableOpacity
                    testID={`call-btn-${c.id}`}
                    style={styles.callBtn}
                    onPress={() => callPhone(c.mobile)}
                  >
                    <Text style={styles.callBtnText}>📞 {c.mobile}</Text>
                  </TouchableOpacity>
                  {c.status !== 'closed' && c.status !== 'forwarded' && (
                    <TouchableOpacity
                      testID={`close-case-btn-${c.id}`}
                      style={styles.closeBtn}
                      onPress={() => openCloseCase(c)}
                    >
                      <Text style={styles.closeBtnText}>✓ Close</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming Cases mini */}
        {upcomingCases.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Upcoming ({upcomingCases.length})</Text>
            </View>
            <View style={styles.upcomingList}>
              {upcomingCases.slice(0, 5).map(c => (
                <View key={c.id} style={styles.upcomingCard}>
                  <View style={styles.upcomingDate}>
                    <Text style={styles.upcomingDateText}>{formatDate(c.visit_date)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upcomingName}>{c.owner_name}</Text>
                    <Text style={styles.upcomingMeta}>{c.animal_type} • {c.village_name || c.visit_reason}</Text>
                  </View>
                  <TouchableOpacity onPress={() => callPhone(c.mobile)} style={styles.miniCallBtn}>
                    <Text style={{ fontSize: 13 }}>📞</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB — Circle "+" button */}
      <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabAnim }] }]}>
        <TouchableOpacity testID="fab-quick-add" style={styles.fab} onPress={openQuickAdd} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Quick Add Modal */}
      <Modal visible={showQuickAdd} transparent animationType="slide" onRequestClose={() => setShowQuickAdd(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Quick Add Case</Text>
                  <Text style={styles.sheetSub}>Walk-in or call lead</Text>
                </View>
                <TouchableOpacity testID="close-quick-add" onPress={() => setShowQuickAdd(false)} style={styles.xBtn}>
                  <Text style={styles.xBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Clipboard Banner */}
                {!!clipboardBanner && (
                  <TouchableOpacity testID="clipboard-banner"
                    style={styles.clipboardBanner}
                    onPress={() => applyClipboardNumber(clipboardBanner)}>
                    <Text style={styles.clipboardEmoji}>📋</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clipboardText}>Copied number detected</Text>
                      <Text style={styles.clipboardNumber}>{clipboardBanner}</Text>
                    </View>
                    <Text style={styles.clipboardUse}>Use ▶</Text>
                  </TouchableOpacity>
                )}

                {/* Visit Date */}
                <Text style={styles.inputLabel}>VISIT DATE</Text>
                <TouchableOpacity testID="date-picker-btn" style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateEmoji}>📅</Text>
                  <Text style={styles.dateBtnText}>{formatDateLabel(visitDate)}</Text>
                  <Text style={styles.dateSub}>{visitDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
                </TouchableOpacity>

                {/* Mobile */}
                <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                <View style={styles.mobileRow}>
                  <TextInput
                    testID="quick-mobile-input"
                    style={[styles.input, { flex: 1 }]}
                    placeholder="10-digit number"
                    placeholderTextColor="#9EB09F"
                    keyboardType="phone-pad"
                    value={quickForm.mobile}
                    onChangeText={handleMobileChange}
                    maxLength={10}
                  />
                  <TouchableOpacity testID="pick-contact-btn" style={styles.contactBtn} onPress={pickFromContacts}>
                    <Text style={{ fontSize: 13 }}>📱</Text>
                    <Text style={styles.contactBtnLabel}>Contacts</Text>
                  </TouchableOpacity>
                </View>

                {/* Owner Name with farmer suggestions */}
                <Text style={styles.inputLabel}>OWNER NAME</Text>
                <TextInput
                  testID="quick-owner-input"
                  style={styles.input}
                  placeholder="Pet owner's name"
                  placeholderTextColor="#9EB09F"
                  value={quickForm.owner_name}
                  onChangeText={handleOwnerNameChange}
                />
                {showFarmerSug && (
                  <View style={styles.farmerDropdown}>
                    {farmerSuggestions.map(f => (
                      <TouchableOpacity key={f.mobile} testID={`farmer-sug-${f.mobile}`}
                        style={styles.farmerDropdownItem}
                        onPress={() => selectFarmerSuggestion(f)}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.farmerSugName}>{f.owner_name}</Text>
                          <Text style={styles.farmerSugMeta}>
                            {f.mobile}{f.village_name ? ` · ${f.village_name}` : ''} · {f.case_count} visit{f.case_count > 1 ? 's' : ''}
                          </Text>
                        </View>
                        <Text style={styles.farmerSugArrow}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Auto-fill banner */}
                {!!autoFilledBanner && (
                  <TouchableOpacity
                    testID="autofill-banner"
                    style={styles.autoFilledBanner}
                    onPress={() => {
                      if (globalSuggestion) {
                        setQuickForm(f => ({
                          ...f,
                          owner_name: f.owner_name || globalSuggestion.name,
                          village_name: f.village_name || globalSuggestion.village}));
                        setAutoFilledBanner(`✅ Applied: ${globalSuggestion.name}${globalSuggestion.village ? ` · ${globalSuggestion.village}` : ''}`);
                        setGlobalSuggestion(null);
                      }
                    }}
                    activeOpacity={globalSuggestion ? 0.7 : 1}
                  >
                    <Text style={styles.autoFilledText}>{autoFilledBanner}</Text>
                    {globalSuggestion && <Text style={[styles.autoFilledText, { fontSize: 11, marginTop: 2 }]}>Tap to apply →</Text>}
                  </TouchableOpacity>
                )}

                {/* Village */}
                <Text style={styles.inputLabel}>VILLAGE / AREA</Text>
                <TextInput
                  testID="quick-village-input"
                  style={styles.input}
                  placeholder="Village or area name"
                  placeholderTextColor="#9EB09F"
                  value={quickForm.village_name}
                  onChangeText={handleVillageChange}
                  onFocus={() => { if (quickForm.village_name) setShowVillageSug(true); }}
                />
                {showVillageSug && (
                  <View style={styles.villageDropdown}>
                    {villageSuggestions.map(v => (
                      <TouchableOpacity key={v} testID={`village-sug-${v}`}
                        style={styles.villageItem}
                        onPress={() => { setQuickForm(f => ({ ...f, village_name: v })); setShowVillageSug(false); }}>
                        <Text style={styles.villageItemText}>📍 {v}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Animal + Reason */}
                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>ANIMAL TYPE</Text>
                    <TouchableOpacity testID="animal-type-picker" style={styles.pickerBtn} onPress={() => setPickerType('animal')}>
                      <Text style={[styles.pickerText, !quickForm.animal_type && { color: '#9EB09F' }]}>
                        {quickForm.animal_type || 'Select'}
                      </Text>
                      <Text style={{ fontSize: 10, color: C.sub }}>▼</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>VISIT REASON</Text>
                    <TouchableOpacity testID="visit-reason-picker" style={styles.pickerBtn} onPress={() => setPickerType('reason')}>
                      <Text style={[styles.pickerText, !quickForm.visit_reason && { color: '#9EB09F' }]}>
                        {quickForm.visit_reason || 'Select'}
                      </Text>
                      <Text style={{ fontSize: 10, color: C.sub }}>▼</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Opening Balance — only for NEW clients (no previous cases) */}
                {!knownFarmers.find(f => f.mobile === quickForm.mobile) && quickForm.mobile.length === 10 && (
                  <>
                    <Text style={styles.inputLabel}>OPENING BALANCE (₹) <Text style={styles.optionalTag}>First visit only</Text></Text>
                    <TextInput
                      testID="quick-opening-balance-input"
                      style={styles.input}
                      placeholder="Previous pending amount (if any)"
                      placeholderTextColor="#9EB09F"
                      keyboardType="numeric"
                      value={quickForm.opening_balance}
                      onChangeText={v => setQuickForm(f => ({ ...f, opening_balance: v }))}
                    />
                    {!!quickForm.opening_balance && parseFloat(quickForm.opening_balance) > 0 && (
                      <View style={[styles.infoBox, { backgroundColor: '#FFF8E1' }]}>
                        <Text style={[styles.infoText, { color: C.warning }]}>
                          💡 ₹{parseFloat(quickForm.opening_balance).toLocaleString('en-IN')} → Outstanding Ledger only
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {/* Notes */}
                <Text style={styles.inputLabel}>NOTES <Text style={{ color: '#9EB09F', fontSize: 10 }}>Optional</Text></Text>
                <TextInput
                  testID="quick-notes-input"
                  style={[styles.input, { height: 64, paddingTop: 10, textAlignVertical: 'top' }]}
                  placeholder="Any quick notes..."
                  placeholderTextColor="#9EB09F"
                  multiline
                  value={quickForm.notes}
                  onChangeText={v => setQuickForm(f => ({ ...f, notes: v }))}
                />

                <TouchableOpacity testID="save-case-btn"
                  style={[styles.saveBtn, quickSaving && styles.btnDisabled]}
                  onPress={saveQuickAdd} disabled={quickSaving}>
                  {quickSaving ? <ActivityIndicator color="#fff" /> :
                    <><Text style={{ fontSize: 14 }}>✅</Text><Text style={styles.saveBtnText}>Save Case</Text></>}
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Date Picker */}
      <DatePickerModal visible={showDatePicker} date={visitDate}
        onSelect={d => setVisitDate(d)} onClose={() => setShowDatePicker(false)} />

      {/* Animal / Reason Picker */}
      <Modal visible={!!pickerType} transparent animationType="fade" onRequestClose={() => setPickerType(null)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerType(null)}>
          <View style={styles.chipSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.chipTitle}>
              {pickerType === 'animal' ? '🐾 Animal Type' : '🩺 Visit Reason'}
            </Text>
            <View style={styles.chipGrid}>
              {(pickerType === 'animal' ? ANIMAL_TYPES : VISIT_REASONS).map(item => {
                const sel = pickerType === 'animal' ? quickForm.animal_type === item : quickForm.visit_reason === item;
                return (
                  <TouchableOpacity key={item} testID={`picker-${item}`}
                    style={[styles.chip, sel && styles.chipSel]}
                    onPress={() => {
                      if (pickerType === 'animal') setQuickForm(f => ({ ...f, animal_type: item }));
                      else setQuickForm(f => ({ ...f, visit_reason: item }));
                      setPickerType(null);
                    }}>
                    <Text style={[styles.chipText, sel && { color: '#fff' }]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Contact Picker */}
      <Modal visible={showContactPicker} transparent animationType="slide" onRequestClose={() => setShowContactPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { maxHeight: '80%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { textAlign: 'center', marginBottom: 8 }]}>📱 Pick Contact</Text>
            <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Search..." placeholderTextColor="#9EB09F"
              value={contactSearch} onChangeText={setContactSearch} />
            <FlatList data={filteredContacts} keyExtractor={(_, i) => `${i}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.contactItem} onPress={() => {
                  const digits = normalizeIndianMobile(item.phone);
                  setQuickForm(f => ({ ...f, owner_name: item.name, mobile: digits }));
                  setShowContactPicker(false);
                  setContactSearch('');
                  checkAndAutoFillFarmer(digits);
                }}>
                  <View style={styles.contactAvatar}><Text style={styles.contactAvatarText}>{item.name[0]?.toUpperCase()}</Text></View>
                  <View><Text style={styles.contactName}>{item.name}</Text><Text style={styles.contactPhone}>{item.phone}</Text></View>
                </TouchableOpacity>
              )} style={{ maxHeight: 360 }} />
          </View>
        </View>
      </Modal>

      {/* Close Case Modal */}
      <Modal visible={!!closeCase} transparent animationType="slide" onRequestClose={() => setCloseCase(null)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Close Case</Text>
                  <Text style={styles.sheetSub}>{closeCase?.owner_name} • {closeCase?.animal_type}</Text>
                </View>
                <TouchableOpacity style={styles.xBtn} onPress={() => setCloseCase(null)}>
                  <Text style={styles.xBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">

                {/* STEP 1: Treated / Not Treated */}
                <Text style={styles.inputLabel}>TREATMENT STATUS</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity testID="treated-btn"
                    style={[styles.toggleBtn, closeForm.treatment_status === 'treated' && styles.toggleBtnActive]}
                    onPress={() => setCloseForm(f => ({ ...f, treatment_status: 'treated' }))}>
                    <Text style={[styles.toggleText, closeForm.treatment_status === 'treated' && { color: '#fff' }]}>✅ Treated</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="not-treated-btn"
                    style={[styles.toggleBtn, closeForm.treatment_status === 'not_treated' && styles.toggleBtnWarn]}
                    onPress={() => setCloseForm(f => ({ ...f, treatment_status: 'not_treated' }))}>
                    <Text style={[styles.toggleText, closeForm.treatment_status === 'not_treated' && { color: '#fff' }]}>❌ Not Treated</Text>
                  </TouchableOpacity>
                </View>
                {closeForm.treatment_status === 'not_treated' && (
                  <View style={styles.infoBox}><Text style={styles.infoText}>ℹ️ Case closed with no charges recorded.</Text></View>
                )}

                {/* STEP 2: Payment — only if Treated */}
                {closeForm.treatment_status === 'treated' && (
                  <>
                    <Text style={styles.inputLabel}>AMOUNT CHARGED (₹)</Text>
                    <TextInput testID="close-amount-input" style={styles.input}
                      placeholder="Total charged (e.g. 1000)" placeholderTextColor="#9EB09F"
                      keyboardType="numeric" value={closeForm.amount}
                      onChangeText={v => setCloseForm(f => ({ ...f, amount: v }))} />

                    <Text style={[styles.inputLabel, { marginTop: 14 }]}>PAYMENT RECEIVED</Text>
                    <View style={{ gap: 8 }}>
                      {[
                        { key: 'full', emoji: '💰', label: 'Full Payment', desc: 'All amount received now' },
                        { key: 'partial', emoji: '📑', label: 'Partial Payment', desc: 'Part received, rest goes to ledger' },
                        { key: 'not_paid', emoji: '⏳', label: 'Collect Later', desc: 'Full amount to Outstanding Ledger' },
                      ].map(opt => (
                        <TouchableOpacity key={opt.key} testID={`pay-opt-${opt.key}`}
                          style={[styles.payOption, closeForm.payment_status === opt.key && styles.payOptionActive]}
                          onPress={() => setCloseForm(f => ({ ...f, payment_status: opt.key }))}>
                          <Text style={styles.payOptionEmoji}>{opt.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.payOptionLabel, closeForm.payment_status === opt.key && { color: C.primary }]}>{opt.label}</Text>
                            <Text style={styles.payOptionDesc}>{opt.desc}</Text>
                          </View>
                          <View style={[styles.radioOuter, closeForm.payment_status === opt.key && styles.radioOuterActive]}>
                            {closeForm.payment_status === opt.key && <View style={styles.radioInner} />}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {closeForm.payment_status === 'partial' && (
                      <>
                        <Text style={styles.inputLabel}>AMOUNT RECEIVED NOW (₹)</Text>
                        <TextInput testID="partial-amount-input" style={styles.input}
                          placeholder="e.g. 300" placeholderTextColor="#9EB09F"
                          keyboardType="numeric" value={closeForm.paid_amount}
                          onChangeText={v => setCloseForm(f => ({ ...f, paid_amount: v }))} />
                        {closeForm.amount && closeForm.paid_amount &&
                          parseFloat(closeForm.paid_amount) < parseFloat(closeForm.amount) && (
                          <View style={styles.outstandingPreview}>
                            <Text style={styles.outstandingPreviewText}>
                              💳 Outstanding: ₹{(parseFloat(closeForm.amount) - parseFloat(closeForm.paid_amount)).toFixed(0)} → Ledger
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                    {closeForm.payment_status === 'not_paid' && !!closeForm.amount && (
                      <View style={styles.outstandingPreview}>
                        <Text style={styles.outstandingPreviewText}>
                          💳 ₹{parseFloat(closeForm.amount || '0').toFixed(0)} → Outstanding Ledger
                        </Text>
                      </View>
                    )}

                    {closeForm.payment_status !== 'not_paid' && (
                      <>
                        <Text style={styles.inputLabel}>PAYMENT MODE</Text>
                        <View style={styles.chipGrid}>
                          {PAYMENT_MODES.map(m => (
                            <TouchableOpacity key={m} testID={`pay-mode-${m}`}
                              style={[styles.chip, closeForm.payment_mode === m && styles.chipSel]}
                              onPress={() => setCloseForm(f => ({ ...f, payment_mode: m }))}>
                              <Text style={[styles.chipText, closeForm.payment_mode === m && { color: '#fff' }]}>{m}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}
                  </>
                )}

                {/* STEP 3: Follow-up */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>FOLLOW-UP NEEDED?</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity testID="followup-yes-btn"
                    style={[styles.toggleBtn, showFollowUp && styles.toggleBtnActive]}
                    onPress={() => setShowFollowUp(true)}>
                    <Text style={[styles.toggleText, showFollowUp && { color: '#fff' }]}>📅 Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="followup-no-btn"
                    style={[styles.toggleBtn, !showFollowUp && styles.toggleBtnActive]}
                    onPress={() => setShowFollowUp(false)}>
                    <Text style={[styles.toggleText, !showFollowUp && { color: '#fff' }]}>✕ No</Text>
                  </TouchableOpacity>
                </View>
                {showFollowUp && (
                  <TouchableOpacity testID="followup-date-btn" style={styles.dateBtn} onPress={() => setShowFollowUpPicker(true)}>
                    <Text style={styles.dateEmoji}>📅</Text>
                    <Text style={styles.dateBtnText}>Follow-up: {formatDateLabel(followUpDate)}</Text>
                  </TouchableOpacity>
                )}
                {showFollowUp && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>FOLLOW-UP REASON</Text>
                    <TextInput testID="followup-reason-input" style={styles.input}
                      placeholder="e.g. Check stitches, Re-vaccination..."
                      placeholderTextColor="#9EB09F" value={followUpReason} onChangeText={setFollowUpReason} />
                    <View style={styles.reasonChips}>
                      {['Check Stitches','Re-vaccination','Re-examination','Medicine Review','Dressing Change','Test Results'].map(r => (
                        <TouchableOpacity key={r} testID={`reason-chip-${r}`}
                          style={[styles.reasonChip, followUpReason === r && styles.reasonChipSel]}
                          onPress={() => setFollowUpReason(r)}>
                          <Text style={[styles.reasonChipText, followUpReason === r && { color: '#fff' }]}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <TouchableOpacity testID="confirm-close-btn"
                  style={[styles.saveBtn, closeSaving && styles.btnDisabled]}
                  onPress={saveClose} disabled={closeSaving}>
                  {closeSaving ? <ActivityIndicator color="#fff" /> :
                    <><Text style={{ fontSize: 14 }}>✅</Text><Text style={styles.saveBtnText}>Confirm & Close Case</Text></>}
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Follow-up Date Picker */}
      <DatePickerModal visible={showFollowUpPicker} date={followUpDate}
        onSelect={d => setFollowUpDate(d)} onClose={() => setShowFollowUpPicker(false)} />

      {/* Ad Banner — shows once per day */}
      {token && (
        <AdBanner
          token={token}
          backendUrl={BACKEND_URL}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 }, scrollContent: { paddingBottom: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  greeting: { fontSize: 13, color: C.sub },
  name: { fontSize: 13, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.text, marginTop: 2 },
  reg: { fontSize: 12, color: C.sub },
  avatarBtn: { width: 46, height: 46, borderRadius: 10, backgroundColor: C.secondary, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  avatarIcon: { width: 42, height: 42, borderRadius: 8 },
  locPill: { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.secondary, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, alignSelf: 'flex-start' },
  locText: { fontSize: 11, color: C.primary, fontFamily: 'Inter_500Medium' },
  trialBanner: { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#FFF8E1', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#FFE082' },
  trialBannerUrgent: { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' },
  trialBannerText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#E65100' },
  trialBannerAction: { fontFamily: 'Inter_700Bold', fontSize: 11, color: C.primary },
  trialExpiredBanner: { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#FFEBEE', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#EF9A9A' },
  trialExpiredTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: C.error },
  trialExpiredSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#5A7060', marginTop: 2 },
  trialExpiredAction: { fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: C.primary },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  refreshBtn: { fontSize: 13, color: C.primaryLight, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  loadBox: { paddingVertical: 32, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  card: { width: '47%', borderRadius: 18, padding: 16, minHeight: 110, borderWidth: 1, borderColor: C.border, boxShadow: '0px 2px 10px rgba(0,96,100,0.07)' },
  emojiWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statNum: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium', color: C.sub, lineHeight: 16 },
  cardArrow: { fontFamily: 'Inter_700Bold', fontSize: 11, marginTop: 3, opacity: 0.5 },
  // Cases
  caseList: { paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  caseCard: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, boxShadow: '0px 2px 10px rgba(0,96,100,0.07)' },
  forwardBadge: { backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8, alignSelf: 'flex-start' },
  forwardText: { fontSize: 11, color: C.blue, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  caseRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  caseOwner: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  caseVillage: { fontSize: 12, color: C.sub, marginTop: 1 },
  caseMeta: { fontSize: 12, color: C.sub, marginTop: 2 },
  caseNotes: { fontSize: 12, color: C.sub, marginTop: 3, fontStyle: 'italic' },
  caseStatus: { marginLeft: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusActive: { backgroundColor: C.secondary },
  statusClosed: { backgroundColor: '#E3F2FD' },
  statusText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.primary },
  caseActions: { flexDirection: 'row', gap: 8 },
  callBtn: { flex: 1, backgroundColor: C.secondary, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  callBtnText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.primary },
  closeBtn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  closeBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#fff' },
  emptyBox: { paddingHorizontal: 16, paddingVertical: 16 },
  emptyText: { fontSize: 14, color: C.sub, marginBottom: 6 },
  emptyAction: { fontSize: 14, color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  // Upcoming
  upcomingList: { paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  upcomingCard: { backgroundColor: C.surface, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border },
  upcomingDate: { backgroundColor: C.secondary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 64, alignItems: 'center' },
  upcomingDateText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.primary },
  upcomingName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.text },
  upcomingMeta: { fontSize: 12, color: C.sub },
  miniCallBtn: { padding: 6 },
  // FAB
  fabWrap: { position: 'absolute', bottom: 24, right: 20, boxShadow: '0px 4px 16px rgba(0,96,100,0.38)' },
  fab: { width: 56, height: 56, borderRadius: 10, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  fabIcon: { fontSize: 30, color: '#fff', lineHeight: 34 },
  fabLabel: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#fff' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10 },
  sheetTitle: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.text },
  sheetSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  xBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F0F4F1', justifyContent: 'center', alignItems: 'center' },
  xBtnText: { fontSize: 13, color: C.sub, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  sheetScroll: { maxHeight: 500 },
  inputLabel: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.sub, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  input: { height: 44, borderRadius: 14, backgroundColor: C.fill, paddingHorizontal: 14, fontSize: 13, color: C.text },
  dateBtn: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.primary, backgroundColor: C.secondary, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateEmoji: { fontSize: 14 },
  dateBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.primary },
  dateSub: { fontSize: 12, color: C.sub, marginLeft: 4 },
  mobileRow: { flexDirection: 'row', gap: 8 },
  contactBtn: { height: 44, backgroundColor: C.secondary, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  contactBtnLabel: { fontSize: 10, color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  villageDropdown: { backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginTop: -6, marginBottom: 4 },
  villageItem: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F0F4F1' },
  villageItemText: { fontSize: 14, color: C.text },
  // Clipboard + farmer lookup styles
  clipboardBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#E8F4FD', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#90CAF9'},
  clipboardEmoji: { fontSize: 14 },
  clipboardText: { fontSize: 12, color: '#1565C0', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  clipboardNumber: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: '#0D47A1' },
  clipboardUse: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#1565C0', paddingHorizontal: 4 },
  farmerDropdown: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    marginTop: -6, marginBottom: 6, overflow: 'hidden'},
  farmerDropdownItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F7F0'},
  farmerSugName: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  farmerSugMeta: { fontSize: 12, color: C.sub, marginTop: 2 },
  farmerSugArrow: { fontSize: 14, color: C.primary },
  autoFilledBanner: {
    backgroundColor: '#E0F2F1', borderRadius: 10, padding: 10, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: C.primary},
  autoFilledText: { fontSize: 13, color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  rowInputs: { flexDirection: 'row' },
  pickerBtn: { height: 44, borderRadius: 14, backgroundColor: C.fill, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { fontSize: 14, color: C.text, flex: 1 },
  saveBtn: { height: 46, backgroundColor: C.primary, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 18 },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#fff' },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  toggleBtnWarn: { backgroundColor: C.warning, borderColor: C.warning },
  toggleText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.text },
  infoBox: { backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10, marginTop: 8 },
  infoText: { fontSize: 13, color: C.warning },
  // Reason chips
  reasonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reasonChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50, backgroundColor: C.fill },
  reasonChipSel: { backgroundColor: C.primary },
  reasonChipText: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.text },
  // Pay options
  payOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.fill, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: 'transparent' },
  payOptionActive: { borderColor: C.primary, backgroundColor: C.secondary },
  payOptionEmoji: { fontSize: 14 },
  payOptionLabel: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  payOptionDesc: { fontSize: 12, color: C.sub, marginTop: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { borderColor: C.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  outstandingPreview: { backgroundColor: '#FFF3E0', borderRadius: 10, padding: 10, marginTop: 8, borderLeftWidth: 3, borderLeftColor: C.warning },
  outstandingPreviewText: { fontSize: 13, color: C.warning, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 16 },
  chipSheet: { backgroundColor: C.surface, borderRadius: 20, padding: 14 },
  chipTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text, marginBottom: 14, textAlign: 'center' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, backgroundColor: C.fill },
  chipSel: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.text },
  // Contacts
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F4F1', gap: 12 },
  contactAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.secondary, justifyContent: 'center', alignItems: 'center' },
  contactAvatarText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.primary },
  contactName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.text },
  contactPhone: { fontSize: 12, color: C.sub }});
