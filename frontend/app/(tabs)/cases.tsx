import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Alert, Modal, TextInput, Linking, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import DatePickerModal from '../../components/DatePicker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PAYMENT_MODES = ['Cash', 'GPay', 'Online', 'Cheque', 'Other'];

const C = {
  primary: '#2E7D32', bg: '#FDFBF7', surface: '#FFFFFF', secondary: '#E8F5E9',
  text: '#0A1F10', sub: '#4A5D4E', border: '#E0E8E1',
  warning: '#F57F17', error: '#D32F2F', blue: '#1565C0',
};

const TABS = [
  { key: 'today', label: 'Today', emoji: '🩺' },
  { key: 'upcoming', label: 'Upcoming', emoji: '📅' },
  { key: 'pending', label: 'Pending', emoji: '⏳' },
  { key: 'closed', label: 'Closed', emoji: '✓' },
];

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tom.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

interface Case {
  id: string; owner_name: string; mobile: string; village_name: string;
  animal_type: string; visit_reason: string; visit_date: string;
  amount: number; status: string; is_paid: boolean; payment_mode: string | null;
  paid_amount: number; forwarded_to_name: string; forwarded_from: string;
}

export default function CasesScreen() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Close Case
  const [closeCase, setCloseCase] = useState<Case | null>(null);
  const [closeForm, setCloseForm] = useState({ amount: '', payment_mode: 'Cash', is_paid: true });
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; });
  const [showFUPicker, setShowFUPicker] = useState(false);
  const [closeSaving, setCloseSaving] = useState(false);

  // Forward to Doctor
  const [forwardCase, setForwardCase] = useState<Case | null>(null);
  const [forwardMobile, setForwardMobile] = useState('');
  const [forwardMsg, setForwardMsg] = useState('');
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => { fetchCases(); }, [activeTab, token]);

  const fetchCases = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const endpoint = activeTab === 'closed'
        ? '/api/cases/closed'
        : `/api/cases/${activeTab}`;
      const res = await fetch(`${BACKEND_URL}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCases(data.cases || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchCases(); }, [activeTab, token]);

  const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`);

  const openClose = (c: Case) => {
    setCloseCase(c);
    setCloseForm({ amount: c.amount ? `${c.amount}` : '', payment_mode: 'Cash', is_paid: true });
    setShowFollowUp(false);
  };

  const saveClose = async () => {
    if (!closeCase) return;
    if (!closeForm.amount) { Alert.alert('Required', 'Enter amount charged (0 if free)'); return; }
    setCloseSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases/${closeCase.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: parseFloat(closeForm.amount) || 0,
          payment_mode: closeForm.payment_mode,
          is_paid: closeForm.is_paid,
          follow_up_date: showFollowUp ? followUpDate.toISOString().split('T')[0] : null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setCloseCase(null); fetchCases();
      Alert.alert('✅ Case Closed', closeForm.is_paid ? 'Payment recorded!' : 'Added to Outstanding ledger.');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setCloseSaving(false); }
  };

  const saveForward = async () => {
    if (!forwardCase || !forwardMobile || forwardMobile.length < 10) {
      Alert.alert('Required', 'Enter valid 10-digit mobile number'); return;
    }
    setForwarding(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases/${forwardCase.id}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to_mobile: forwardMobile, message: forwardMsg }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Failed');
      setForwardCase(null); setForwardMobile(''); setForwardMsg('');
      fetchCases();
      Alert.alert('✅ Forwarded!', `Case forwarded to Dr. ${d.forwarded_to}`);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setForwarding(false); }
  };

  const statusColor = (c: Case) => {
    if (c.status === 'closed') return c.is_paid ? '#E8F5E9' : '#FBE9E7';
    if (c.status === 'pending') return '#FFF8E1';
    if (c.status === 'upcoming') return '#E3F2FD';
    if (c.status === 'forwarded') return '#F3E5F5';
    return C.secondary;
  };

  const statusLabel = (c: Case) => {
    if (c.status === 'closed') return c.is_paid ? '✓ Paid' : '⚡ Unpaid';
    if (c.status === 'pending') return '⏳ Pending';
    if (c.status === 'upcoming') return `📅 ${formatDate(c.visit_date)}`;
    if (c.status === 'forwarded') return `↗ Forwarded`;
    return '🩺 Active';
  };

  const renderCase = ({ item: c }: { item: Case }) => (
    <View testID={`case-card-${c.id}`} style={styles.card}>
      {c.forwarded_from ? (
        <View style={styles.fwdBadge}><Text style={styles.fwdText}>↩ From Dr. {c.forwarded_from}</Text></View>
      ) : null}
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardOwner}>{c.owner_name}</Text>
          {c.village_name ? <Text style={styles.cardVillage}>📍 {c.village_name}</Text> : null}
          <Text style={styles.cardMeta}>{c.animal_type} • {c.visit_reason}</Text>
          <Text style={styles.cardDate}>{formatDate(c.visit_date)}</Text>
        </View>
        <View>
          <View style={[styles.badge, { backgroundColor: statusColor(c) }]}>
            <Text style={styles.badgeText}>{statusLabel(c)}</Text>
          </View>
          {c.amount > 0 && (
            <Text style={[styles.amountText, { color: c.is_paid ? C.primary : C.error }]}>
              ₹{c.amount.toLocaleString('en-IN')}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity testID={`cases-call-${c.id}`} style={styles.callBtn} onPress={() => callPhone(c.mobile)}>
          <Text style={styles.callBtnText}>📞 Call</Text>
        </TouchableOpacity>

        {(c.status === 'active' || c.status === 'upcoming') && (
          <TouchableOpacity testID={`cases-close-${c.id}`} style={styles.closeBtn} onPress={() => openClose(c)}>
            <Text style={styles.closeBtnText}>✓ Close</Text>
          </TouchableOpacity>
        )}

        {c.status === 'pending' && (
          <>
            <TouchableOpacity testID={`cases-close-pend-${c.id}`} style={styles.closeBtn} onPress={() => openClose(c)}>
              <Text style={styles.closeBtnText}>✓ Close</Text>
            </TouchableOpacity>
            <TouchableOpacity testID={`cases-forward-${c.id}`} style={styles.fwdBtn}
              onPress={() => { setForwardCase(c); setForwardMobile(''); setForwardMsg(''); }}>
              <Text style={styles.fwdBtnText}>↗ Forward</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.key} testID={`tab-${tab.key}`}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}>
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={c => c.id}
          renderItem={renderCase}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>{TABS.find(t => t.key === activeTab)?.emoji}</Text>
              <Text style={styles.emptyText}>No {activeTab} cases</Text>
            </View>
          }
        />
      )}

      {/* Close Case Modal */}
      <Modal visible={!!closeCase} transparent animationType="slide" onRequestClose={() => setCloseCase(null)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Close Case</Text>
                  <Text style={styles.sheetSub}>{closeCase?.owner_name} • {closeCase?.animal_type}</Text>
                </View>
                <TouchableOpacity style={styles.xBtn} onPress={() => setCloseCase(null)}>
                  <Text style={styles.xText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
                <Text style={styles.label}>AMOUNT CHARGED (₹)</Text>
                <TextInput testID="close-amount" style={styles.input}
                  placeholder="Amount (0 if free)" placeholderTextColor="#9EB09F"
                  keyboardType="numeric" value={closeForm.amount}
                  onChangeText={v => setCloseForm(f => ({ ...f, amount: v }))} />

                <Text style={styles.label}>PAYMENT MODE</Text>
                <View style={styles.chipRow}>
                  {PAYMENT_MODES.map(m => (
                    <TouchableOpacity key={m} testID={`mode-${m}`}
                      style={[styles.chip, closeForm.payment_mode === m && styles.chipSel]}
                      onPress={() => setCloseForm(f => ({ ...f, payment_mode: m }))}>
                      <Text style={[styles.chipText, closeForm.payment_mode === m && { color: '#fff' }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 14 }]}>PAYMENT STATUS</Text>
                <View style={styles.toggleRow}>
                  {[{ v: true, l: '✓ Paid Now' }, { v: false, l: '⏳ Collect Later' }].map(({ v, l }) => (
                    <TouchableOpacity key={l} testID={`paid-${v}`}
                      style={[styles.toggleBtn, closeForm.is_paid === v && (v ? styles.toggleActive : styles.toggleWarn)]}
                      onPress={() => setCloseForm(f => ({ ...f, is_paid: v }))}>
                      <Text style={[styles.toggleText, closeForm.is_paid === v && { color: '#fff' }]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 14 }]}>FOLLOW-UP?</Text>
                <View style={styles.toggleRow}>
                  {[{ v: true, l: '📅 Yes' }, { v: false, l: '✕ No' }].map(({ v, l }) => (
                    <TouchableOpacity key={l} testID={`fu-${v}`}
                      style={[styles.toggleBtn, showFollowUp === v && styles.toggleActive]}
                      onPress={() => setShowFollowUp(v)}>
                      <Text style={[styles.toggleText, showFollowUp === v && { color: '#fff' }]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {showFollowUp && (
                  <TouchableOpacity testID="fu-date-btn" style={styles.datePill} onPress={() => setShowFUPicker(true)}>
                    <Text style={styles.datePillText}>
                      📅 Follow-up: {followUpDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity testID="confirm-close-cases"
                  style={[styles.saveBtn, closeSaving && { opacity: 0.6 }]}
                  onPress={saveClose} disabled={closeSaving}>
                  {closeSaving ? <ActivityIndicator color="#fff" /> :
                    <Text style={styles.saveBtnText}>✅ Confirm & Close</Text>}
                </TouchableOpacity>
                <View style={{ height: 16 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Follow-up Date Picker */}
      <DatePickerModal visible={showFUPicker} date={followUpDate}
        onSelect={d => setFollowUpDate(d)} onClose={() => setShowFUPicker(false)} />

      {/* Forward to Doctor Modal */}
      <Modal visible={!!forwardCase} transparent animationType="slide" onRequestClose={() => setForwardCase(null)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Forward Case</Text>
                  <Text style={styles.sheetSub}>{forwardCase?.owner_name} • {forwardCase?.animal_type}</Text>
                </View>
                <TouchableOpacity style={styles.xBtn} onPress={() => setForwardCase(null)}>
                  <Text style={styles.xText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>DOCTOR'S MOBILE NUMBER (Animitra registered)</Text>
              <TextInput testID="forward-mobile-input" style={styles.input}
                placeholder="10-digit mobile number" placeholderTextColor="#9EB09F"
                keyboardType="phone-pad" value={forwardMobile}
                onChangeText={v => setForwardMobile(v.replace(/\D/g, '').slice(0, 10))} maxLength={10} />
              <Text style={styles.label}>MESSAGE <Text style={{ color: '#9EB09F' }}>Optional</Text></Text>
              <TextInput testID="forward-msg-input" style={[styles.input, { height: 64, paddingTop: 10, textAlignVertical: 'top' }]}
                placeholder="Note for the doctor..." placeholderTextColor="#9EB09F"
                multiline value={forwardMsg} onChangeText={setForwardMsg} />
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>📋 The case will appear in their Today's Cases dashboard</Text>
              </View>
              <TouchableOpacity testID="confirm-forward-btn"
                style={[styles.saveBtn, { backgroundColor: C.blue }, forwarding && { opacity: 0.6 }]}
                onPress={saveForward} disabled={forwarding}>
                {forwarding ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>↗ Forward Case</Text>}
              </TouchableOpacity>
              <View style={{ height: 16 }} />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.primary },
  tabEmoji: { fontSize: 16 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: C.sub, marginTop: 2 },
  tabLabelActive: { color: C.primary },
  listContent: { padding: 16, gap: 12, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: C.sub },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  fwdBadge: { backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  fwdText: { fontSize: 11, color: C.blue, fontWeight: '600' },
  cardRow: { flexDirection: 'row', marginBottom: 10 },
  cardOwner: { fontSize: 15, fontWeight: '700', color: C.text },
  cardVillage: { fontSize: 12, color: C.sub, marginTop: 1 },
  cardMeta: { fontSize: 12, color: C.sub, marginTop: 1 },
  cardDate: { fontSize: 12, color: C.primary, fontWeight: '600', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', color: C.text },
  amountText: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  cardActions: { flexDirection: 'row', gap: 8 },
  callBtn: { flex: 1, backgroundColor: C.secondary, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  callBtnText: { fontSize: 13, fontWeight: '600', color: C.primary },
  closeBtn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  fwdBtn: { backgroundColor: C.blue, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  fwdBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: C.text },
  sheetSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  xBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F0F4F1', justifyContent: 'center', alignItems: 'center' },
  xText: { fontSize: 13, color: C.sub, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '600', color: C.sub, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: '#FDFBF7', paddingHorizontal: 14, fontSize: 15, color: C.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: C.secondary, borderWidth: 1.5, borderColor: C.border },
  chipSel: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: C.text },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  toggleActive: { backgroundColor: C.primary, borderColor: C.primary },
  toggleWarn: { backgroundColor: C.warning, borderColor: C.warning },
  toggleText: { fontSize: 13, fontWeight: '600', color: C.text },
  datePill: { backgroundColor: C.secondary, borderRadius: 10, padding: 12, marginTop: 8 },
  datePillText: { fontSize: 14, fontWeight: '600', color: C.primary },
  infoBox: { backgroundColor: '#E3F2FD', borderRadius: 10, padding: 10, marginTop: 8 },
  infoText: { fontSize: 13, color: C.blue },
  saveBtn: { height: 52, backgroundColor: C.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
