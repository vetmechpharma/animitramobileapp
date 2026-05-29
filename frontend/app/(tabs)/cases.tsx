import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Alert, Modal, TextInput, Linking, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import DatePickerModal from '../../components/DatePicker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PAYMENT_MODES = ['Cash', 'GPay', 'Online', 'Cheque', 'Other'];

const C = {
  primary: '#2E7D32', bg: '#F4F9F4', surface: '#FFFFFF', fill: '#EBF5EC',
  secondary: '#E8F5E9', text: '#1A2E1C', sub: '#4B6352', border: '#D0E8D2',
  warning: '#E65100', error: '#C62828', blue: '#1565C0', muted: '#8FA891',
};

const TABS = [
  { key: 'today', label: 'Today', emoji: '🩺' },
  { key: 'upcoming', label: 'Upcoming', emoji: '📅' },
  { key: 'pending', label: 'Overdue', emoji: '⚠️' },
  { key: 'closed', label: 'Closed', emoji: '✓' },
];

interface Case {
  id: string; owner_name: string; mobile: string; village_name: string;
  animal_type: string; visit_reason: string; visit_date: string;
  amount: number; status: string; is_paid: boolean; payment_mode: string | null;
  paid_amount: number; forwarded_to_name: string; forwarded_from: string; notes: string;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tom.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const statusBadge = (c: Case) => {
  if (c.status === 'closed') {
    return c.is_paid
      ? { label: '✓ Paid', bg: '#E8F5E9', text: C.primary }
      : { label: '⚡ Unpaid', bg: '#FFF8E1', text: C.warning };
  }
  if (c.status === 'pending') return { label: '⚠️ Overdue', bg: '#FFF3E0', text: C.warning };
  if (c.status === 'upcoming') return { label: '📅 Upcoming', bg: '#E3F2FD', text: C.blue };
  if (c.status === 'forwarded') return { label: '↗ Forwarded', bg: '#F3E5F5', text: '#6A1B9A' };
  return { label: '🩺 Active', bg: C.secondary, text: C.primary };
};

export default function CasesScreen() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Close Case
  const [closeCase, setCloseCase] = useState<Case | null>(null);
  const [closeForm, setCloseForm] = useState({ treatment_status: 'treated', amount: '', payment_status: 'full', payment_mode: 'Cash', paid_amount: '' });
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; });
  const [followUpReason, setFollowUpReason] = useState('');
  const [showFUPicker, setShowFUPicker] = useState(false);
  const [closeSaving, setCloseSaving] = useState(false);

  // Forward
  const [forwardCase, setForwardCase] = useState<Case | null>(null);
  const [forwardMobile, setForwardMobile] = useState('');
  const [forwardMsg, setForwardMsg] = useState('');
  const [forwarding, setForwarding] = useState(false);
  const [forwardHistory, setForwardHistory] = useState<{ name: string; mobile: string; forward_count: number }[]>([]);

  // Client outstanding + history
  const [clientHistory, setClientHistory] = useState<{ cases: Case[]; outstanding: number; total: number } | null>(null);
  const [showClientHistory, setShowClientHistory] = useState(false);
  const [closeClientOutstanding, setCloseClientOutstanding] = useState(0);

  const viewClientHistory = async (mobile: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases/client/${mobile}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      setClientHistory(d);
      setShowClientHistory(true);
    } catch (e) {}
  };
  const [editCase, setEditCase] = useState<Case | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editVisitReason, setEditVisitReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { fetchCases(); }, [activeTab, token]);

  const fetchCases = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const ep = activeTab === 'closed' ? '/api/cases/closed' : `/api/cases/${activeTab}`;
      const res = await fetch(`${BACKEND_URL}${ep}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCases(data.cases || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchCases(); }, [activeTab, token]);

  const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`);

  const confirmDelete = (c: Case) => {
    Alert.alert('Delete Case', `Delete case for ${c.owner_name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${BACKEND_URL}/api/cases/${c.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          fetchCases();
        } catch (e) { Alert.alert('Error', 'Could not delete'); }
      }},
    ]);
  };

  const openClose = async (c: Case) => {
    setCloseCase(c);
    setCloseForm({ treatment_status: 'treated', amount: c.amount ? `${c.amount}` : '', payment_status: 'full', payment_mode: 'Cash', paid_amount: '' });
    setShowFollowUp(false); setFollowUpReason('');
    // Fetch client's outstanding amount for warning
    if (token) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/cases/client-outstanding/${c.mobile}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        setCloseClientOutstanding(d.outstanding || 0);
      } catch (e) { setCloseClientOutstanding(0); }
    }
  };

  const saveClose = async () => {
    if (!closeCase) return;
    const { treatment_status, amount, payment_status, payment_mode, paid_amount } = closeForm;
    if (treatment_status === 'treated' && (!amount || isNaN(parseFloat(amount)))) {
      Alert.alert('Required', 'Enter amount (0 if free)'); return;
    }
    if (payment_status === 'partial' && (!paid_amount || parseFloat(paid_amount) >= parseFloat(amount))) {
      Alert.alert('Invalid', 'Partial amount must be less than total'); return;
    }
    setCloseSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases/${closeCase.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          treatment_status,
          amount: treatment_status === 'treated' ? parseFloat(amount) || 0 : 0,
          payment_status: treatment_status === 'treated' ? payment_status : 'not_applicable',
          payment_mode: payment_status !== 'not_paid' ? payment_mode : null,
          paid_amount: payment_status === 'partial' ? parseFloat(paid_amount) || 0 : (payment_status === 'full' ? parseFloat(amount) || 0 : 0),
          follow_up_date: showFollowUp ? followUpDate.toISOString().split('T')[0] : null,
          follow_up_reason: showFollowUp ? followUpReason.trim() || 'Follow-up' : '',
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setCloseCase(null); fetchCases();
      Alert.alert('✅ Case Closed', treatment_status === 'not_treated' ? 'Closed as Not Treated.' : (payment_status === 'full' ? `₹${amount} received.` : `Added to Outstanding Ledger.`));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setCloseSaving(false); }
  };

  const openForward = async (c: Case) => {
    setForwardCase(c);
    setForwardMobile('');
    setForwardMsg('');
    // Load forward history
    if (token) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/forward-history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        setForwardHistory(d.doctors || []);
      } catch (e) { setForwardHistory([]); }
    }
  };

  const saveForward = async () => {
    if (!forwardCase || !forwardMobile || forwardMobile.length < 10) {
      Alert.alert('Required', 'Enter valid 10-digit mobile'); return;
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

  const saveEdit = async () => {
    if (!editCase) return;
    setEditSaving(true);
    try {
      await fetch(`${BACKEND_URL}/api/cases/${editCase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: editNotes, visit_reason: editVisitReason }),
      });
      setEditCase(null); fetchCases();
      Alert.alert('✅ Updated!', 'Case details updated.');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setEditSaving(false); }
  };

  const badge = (c: Case) => statusBadge(c);

  const renderCase = ({ item: c }: { item: Case }) => {
    const b = badge(c);
    const isClosed = c.status === 'closed' || c.status === 'forwarded';

    return (
      <View testID={`case-card-${c.id}`}
        style={[styles.card, c.status === 'closed' && (c.is_paid ? styles.cardPaid : styles.cardUnpaid)]}>
        {c.forwarded_from ? (
          <View style={styles.fwdBadge}><Text style={styles.fwdText}>← From Dr. {c.forwarded_from}</Text></View>
        ) : null}

        {/* Header row */}
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => viewClientHistory(c.mobile)} activeOpacity={0.7}>
              <Text style={[styles.cardOwner, { textDecorationLine: 'underline' }]}>{c.owner_name}</Text>
            </TouchableOpacity>
            {c.village_name ? <Text style={styles.cardVillage}>📍 {c.village_name}</Text> : null}
            <Text style={styles.cardMeta}>{c.animal_type} · {c.visit_reason}</Text>
            <Text style={styles.cardDate}>{formatDate(c.visit_date)}</Text>
            {c.notes ? <Text style={styles.cardNotes}>📝 {c.notes}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[styles.badge, { backgroundColor: b.bg }]}>
              <Text style={[styles.badgeText, { color: b.text }]}>{b.label}</Text>
            </View>
            {c.amount > 0 && (
              <Text style={[styles.amountText, { color: c.is_paid ? C.primary : C.error }]}>
                ₹{c.amount.toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        </View>

        {/* Action buttons — based on status */}
        <View style={styles.cardActions}>
          {/* Call always visible */}
          <TouchableOpacity testID={`call-${c.id}`} style={styles.callBtn} onPress={() => callPhone(c.mobile)}>
            <Text style={styles.callBtnText}>📞 Call</Text>
          </TouchableOpacity>

          {/* ACTIVE / UPCOMING / PENDING (Overdue) */}
          {(c.status === 'active' || c.status === 'upcoming' || c.status === 'pending') && (
            <>
              <TouchableOpacity testID={`delete-${c.id}`} style={styles.trashBtn}
                onPress={() => confirmDelete(c)}>
                <Text style={{ fontSize: 16 }}>🗑</Text>
              </TouchableOpacity>
              <TouchableOpacity testID={`close-${c.id}`} style={styles.closeBtn} onPress={() => openClose(c)}>
                <Text style={styles.closeBtnText}>✓ Close</Text>
              </TouchableOpacity>
              <TouchableOpacity testID={`forward-${c.id}`} style={styles.fwdBtn}
                onPress={() => openForward(c)}>
                <Text style={styles.fwdBtnText}>↗</Text>
              </TouchableOpacity>
            </>
          )}

          {/* CLOSED — Edit only + Re-activate if forwarded */}
          {c.status === 'closed' && (
            <TouchableOpacity testID={`edit-${c.id}`} style={styles.editBtn}
              onPress={() => { setEditCase(c); setEditNotes(c.notes || ''); setEditVisitReason(c.visit_reason || ''); }}>
              <Text style={styles.editBtnText}>✏️ Edit</Text>
            </TouchableOpacity>
          )}

          {/* FORWARDED by original vet — Re-activate option */}
          {c.status === 'forwarded' && !c.forwarded_from && (
            <TouchableOpacity testID={`reactivate-${c.id}`} style={[styles.editBtn, { backgroundColor: '#E3F2FD' }]}
              onPress={() => {
                Alert.alert('Re-activate Case', `Bring case for ${c.owner_name} back to your active list?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Re-activate', onPress: async () => {
                    try {
                      await fetch(`${BACKEND_URL}/api/cases/${c.id}/reactivate`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                      fetchCases();
                      Alert.alert('✅ Re-activated', 'Case moved back to Today\'s list');
                    } catch (e) { Alert.alert('Error', 'Failed to re-activate'); }
                  }},
                ]);
              }}>
              <Text style={[styles.editBtnText, { color: C.blue }]}>↺ Re-activate</Text>
            </TouchableOpacity>
          )}

          {/* RECEIVED forwarded case — Decline option */}
          {c.forwarded_from && (c.status === 'active' || c.status === 'pending') && (
            <TouchableOpacity testID={`decline-${c.id}`} style={[styles.editBtn, { backgroundColor: '#FFF8E1' }]}
              onPress={() => {
                Alert.alert('Decline Case', `Return case for ${c.owner_name} to Dr. ${c.forwarded_from}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Decline', style: 'destructive', onPress: async () => {
                    try {
                      await fetch(`${BACKEND_URL}/api/cases/${c.id}/decline`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                      fetchCases();
                      Alert.alert('↩ Declined', `Case returned to Dr. ${c.forwarded_from}`);
                    } catch (e) { Alert.alert('Error', 'Failed to decline'); }
                  }},
                ]);
              }}>
              <Text style={[styles.editBtnText, { color: C.warning }]}>✗ Decline</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} testID={`tab-${t.key}`}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}>
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.emoji} {t.label}
            </Text>
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
              <Text style={styles.emptyText}>No {activeTab === 'pending' ? 'overdue' : activeTab} cases</Text>
            </View>
          }
        />
      )}

      {/* Close Case Modal */}
      <Modal visible={!!closeCase} transparent animationType="slide" onRequestClose={() => setCloseCase(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Close Case</Text>
                <Text style={styles.sheetSub}>{closeCase?.owner_name} · {closeCase?.animal_type}</Text>
              </View>
              <TouchableOpacity style={styles.xBtn} onPress={() => setCloseCase(null)}>
                <Text style={styles.xText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
              {/* Outstanding warning */}
              {closeClientOutstanding > 0 && (
                <View style={[styles.infoBox, { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2', marginBottom: 4 }]}>
                  <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: C.error }}>
                    ⚠️ Outstanding: ₹{closeClientOutstanding.toLocaleString('en-IN')} from previous visits
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: C.error, marginTop: 2 }}>
                    Collect old dues when closing this case
                  </Text>
                </View>
              )}
              {/* Treated/Not Treated */}
              <Text style={styles.label}>TREATMENT STATUS</Text>
              <View style={styles.toggleRow}>
                {[{ k: 'treated', l: '✅ Treated' }, { k: 'not_treated', l: '❌ Not Treated' }].map(({ k, l }) => (
                  <TouchableOpacity key={k}
                    style={[styles.toggleBtn, closeForm.treatment_status === k && (k === 'treated' ? styles.toggleActive : styles.toggleWarn)]}
                    onPress={() => setCloseForm(f => ({ ...f, treatment_status: k }))}>
                    <Text style={[styles.toggleText, closeForm.treatment_status === k && { color: '#fff' }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {closeForm.treatment_status === 'treated' && (
                <>
                  <Text style={styles.label}>AMOUNT CHARGED (₹)</Text>
                  <TextInput style={styles.input} placeholder="Total charged" placeholderTextColor="#9EB09F"
                    keyboardType="numeric" value={closeForm.amount}
                    onChangeText={v => setCloseForm(f => ({ ...f, amount: v }))} />

                  <Text style={[styles.label, { marginTop: 12 }]}>PAYMENT</Text>
                  <View style={{ gap: 8 }}>
                    {[
                      { key: 'full', emoji: '💰', label: 'Full Payment' },
                      { key: 'partial', emoji: '📑', label: 'Partial Payment' },
                      { key: 'not_paid', emoji: '⏳', label: 'Collect Later' },
                    ].map(opt => (
                      <TouchableOpacity key={opt.key}
                        style={[styles.payOption, closeForm.payment_status === opt.key && styles.payOptionActive]}
                        onPress={() => setCloseForm(f => ({ ...f, payment_status: opt.key }))}>
                        <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                        <Text style={[styles.payOptionLabel, closeForm.payment_status === opt.key && { color: C.primary }]}>{opt.label}</Text>
                        <View style={[styles.radio, closeForm.payment_status === opt.key && styles.radioActive]}>
                          {closeForm.payment_status === opt.key && <View style={styles.radioDot} />}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {closeForm.payment_status === 'partial' && (
                    <>
                      <Text style={styles.label}>RECEIVED NOW (₹)</Text>
                      <TextInput style={styles.input} placeholder="e.g. 300" placeholderTextColor="#9EB09F"
                        keyboardType="numeric" value={closeForm.paid_amount}
                        onChangeText={v => setCloseForm(f => ({ ...f, paid_amount: v }))} />
                    </>
                  )}
                  {closeForm.payment_status !== 'not_paid' && (
                    <>
                      <Text style={styles.label}>PAYMENT MODE</Text>
                      <View style={styles.chipRow}>
                        {PAYMENT_MODES.map(m => (
                          <TouchableOpacity key={m} style={[styles.chip, closeForm.payment_mode === m && styles.chipSel]}
                            onPress={() => setCloseForm(f => ({ ...f, payment_mode: m }))}>
                            <Text style={[styles.chipText, closeForm.payment_mode === m && { color: '#fff' }]}>{m}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}

              <Text style={[styles.label, { marginTop: 14 }]}>FOLLOW-UP?</Text>
              <View style={styles.toggleRow}>
                {[{ v: true, l: '📅 Yes' }, { v: false, l: '✕ No' }].map(({ v, l }) => (
                  <TouchableOpacity key={String(v)}
                    style={[styles.toggleBtn, showFollowUp === v && styles.toggleActive]}
                    onPress={() => setShowFollowUp(v)}>
                    <Text style={[styles.toggleText, showFollowUp === v && { color: '#fff' }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {showFollowUp && (
                <>
                  <TouchableOpacity style={styles.datePill} onPress={() => setShowFUPicker(true)}>
                    <Text style={styles.datePillText}>📅 {followUpDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </TouchableOpacity>
                  <Text style={styles.label}>REASON</Text>
                  <TextInput style={styles.input} placeholder="e.g. Check stitches" placeholderTextColor="#9EB09F"
                    value={followUpReason} onChangeText={setFollowUpReason} />
                </>
              )}

              <TouchableOpacity style={[styles.saveBtn, closeSaving && { opacity: 0.6 }]}
                onPress={saveClose} disabled={closeSaving}>
                {closeSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>✅ Confirm & Close</Text>}
              </TouchableOpacity>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Follow-up Date Picker */}
      <DatePickerModal visible={showFUPicker} date={followUpDate}
        onSelect={d => setFollowUpDate(d)} onClose={() => setShowFUPicker(false)} />

      {/* Forward Modal */}
      <Modal visible={!!forwardCase} transparent animationType="slide" onRequestClose={() => setForwardCase(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Forward Case</Text>
                <Text style={styles.sheetSub}>{forwardCase?.owner_name} · {forwardCase?.animal_type}</Text>
              </View>
              <TouchableOpacity style={styles.xBtn} onPress={() => setForwardCase(null)}>
                <Text style={styles.xText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Previously forwarded doctors — quick select */}
            {forwardHistory.length > 0 && (
              <>
                <Text style={styles.label}>PREVIOUSLY FORWARDED DOCTORS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {forwardHistory.map((doc, i) => (
                    <TouchableOpacity
                      key={i}
                      testID={`fwd-history-${doc.mobile}`}
                      style={[styles.historyChip, forwardMobile === doc.mobile && styles.historyChipSel]}
                      onPress={() => setForwardMobile(doc.mobile)}
                    >
                      <Text style={[styles.historyChipName, forwardMobile === doc.mobile && { color: '#fff' }]}>
                        Dr. {doc.name}
                      </Text>
                      <Text style={[styles.historyChipMeta, forwardMobile === doc.mobile && { color: 'rgba(255,255,255,0.75)' }]}>
                        {doc.mobile} · {doc.forward_count}×
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.dividerRow}>
                  <View style={styles.divLine} />
                  <Text style={styles.divText}>or enter new number</Text>
                  <View style={styles.divLine} />
                </View>
              </>
            )}

            <Text style={styles.label}>DOCTOR'S MOBILE (Animitra registered)</Text>
            <TextInput style={styles.input} placeholder="10-digit mobile number" placeholderTextColor="#9EB09F"
              keyboardType="phone-pad" value={forwardMobile}
              onChangeText={v => setForwardMobile(v.replace(/\D/g, '').slice(0, 10))} maxLength={10} />
            <Text style={styles.label}>MESSAGE <Text style={{ color: C.muted }}>Optional</Text></Text>
            <TextInput style={[styles.input, { height: 60, paddingTop: 10, textAlignVertical: 'top' }]}
              placeholder="Note for the doctor..." placeholderTextColor="#9EB09F"
              multiline value={forwardMsg} onChangeText={setForwardMsg} />
            <View style={[styles.infoBox, { marginTop: 8 }]}>
              <Text style={[styles.infoText, { color: C.blue }]}>📋 Case appears in their Today's dashboard · Original case marked as Forwarded</Text>
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.blue }, forwarding && { opacity: 0.6 }]}
              onPress={saveForward} disabled={forwarding}>
              {forwarding ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>↗ Forward Case</Text>}
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </View>
      </Modal>

      {/* Edit Closed Case Modal */}
      <Modal visible={!!editCase} transparent animationType="slide" onRequestClose={() => setEditCase(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>✏️ Edit Case</Text>
                <Text style={styles.sheetSub}>{editCase?.owner_name}</Text>
              </View>
              <TouchableOpacity style={styles.xBtn} onPress={() => setEditCase(null)}>
                <Text style={styles.xText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>VISIT REASON</Text>
            <TextInput style={styles.input} placeholder="Visit reason" placeholderTextColor="#9EB09F"
              value={editVisitReason} onChangeText={setEditVisitReason} />
            <Text style={styles.label}>NOTES</Text>
            <TextInput style={[styles.input, { height: 80, paddingTop: 10, textAlignVertical: 'top' }]}
              placeholder="Clinical notes, symptoms, treatment..." placeholderTextColor="#9EB09F"
              multiline value={editNotes} onChangeText={setEditNotes} />
            <TouchableOpacity style={[styles.saveBtn, editSaving && { opacity: 0.6 }]}
              onPress={saveEdit} disabled={editSaving}>
              {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>✅ Save Changes</Text>}
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </View>
      </Modal>
      {/* Client History Modal */}
      <Modal visible={showClientHistory} transparent animationType="slide" onRequestClose={() => setShowClientHistory(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: '80%' }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>📋 Client History</Text>
                {clientHistory && (
                  <Text style={styles.sheetSub}>
                    {clientHistory.total} visit{clientHistory.total !== 1 ? 's' : ''}
                    {clientHistory.outstanding > 0 && (
                      <Text style={{ color: C.error, fontFamily: 'Inter_700Bold' }}> · ₹{clientHistory.outstanding.toLocaleString('en-IN')} outstanding</Text>
                    )}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.xBtn} onPress={() => setShowClientHistory(false)}>
                <Text style={styles.xText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={clientHistory?.cases || []}
              keyExtractor={(_, i) => `${i}`}
              style={{ maxHeight: 400 }}
              renderItem={({ item: ch }) => (
                <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: C.text }}>{ch.animal_type} · {ch.visit_reason}</Text>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: ch.is_paid ? C.primary : C.error }}>
                      {ch.amount > 0 ? `₹${ch.amount.toLocaleString('en-IN')}` : 'Free'}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.sub, marginTop: 2 }}>
                    {new Date(ch.visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' · '}
                    <Text style={{ color: ch.status === 'closed' ? (ch.is_paid ? C.primary : C.warning) : C.blue }}>
                      {ch.status === 'closed' ? (ch.is_paid ? '✓ Paid' : '⚡ Unpaid') : ch.status}
                    </Text>
                  </Text>
                  {ch.notes ? <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: C.muted, marginTop: 2, fontStyle: 'italic' }}>📝 {ch.notes}</Text> : null}
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', padding: 20, color: C.sub, fontFamily: 'Inter_400Regular' }}>No case history found</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* FlatList import needed - already imported above */}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: C.primary },
  tabText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: C.sub },
  tabTextActive: { color: C.primary, fontFamily: 'Inter_700Bold' },
  // List
  listContent: { padding: 14, gap: 10, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 44, marginBottom: 10 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: C.sub },
  // Cards
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
    boxShadow: '0px 2px 8px rgba(46,125,50,0.06)',
  },
  cardPaid: { borderLeftWidth: 3, borderLeftColor: C.primary },
  cardUnpaid: { borderLeftWidth: 3, borderLeftColor: C.warning },
  fwdBadge: { backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  fwdText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: C.blue },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardOwner: { fontFamily: 'Inter_700Bold', fontSize: 15, color: C.text },
  cardVillage: { fontFamily: 'Inter_400Regular', fontSize: 12, color: C.sub, marginTop: 2 },
  cardMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: C.sub, marginTop: 1 },
  cardDate: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.primary, marginTop: 2 },
  cardNotes: { fontFamily: 'Inter_400Regular', fontSize: 12, color: C.muted, marginTop: 3, fontStyle: 'italic' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  amountText: { fontFamily: 'Inter_800ExtraBold', fontSize: 14 },
  // Action buttons
  cardActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  callBtn: { flex: 1, minWidth: 80, backgroundColor: C.fill, borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  callBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.primary },
  trashBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { flex: 1, minWidth: 80, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  closeBtnText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff' },
  fwdBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center' },
  fwdBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' },
  editBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F3E5F5', borderRadius: 10, alignItems: 'center' },
  editBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#6A1B9A' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10 },
  sheetTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 18, color: C.text },
  sheetSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: C.sub, marginTop: 2 },
  xBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.fill, justifyContent: 'center', alignItems: 'center' },
  xText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: C.sub },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: C.sub, letterSpacing: 0.8, marginBottom: 7, marginTop: 12 },
  input: { height: 48, borderRadius: 12, backgroundColor: C.fill, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 14, color: C.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50, backgroundColor: C.fill },
  chipSel: { backgroundColor: C.primary },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.text },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  toggleActive: { backgroundColor: C.primary, borderColor: C.primary },
  toggleWarn: { backgroundColor: C.warning, borderColor: C.warning },
  toggleText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.text },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.fill, borderRadius: 12, padding: 11, borderWidth: 1.5, borderColor: 'transparent' },
  payOptionActive: { borderColor: C.primary, backgroundColor: '#E4F0E6' },
  payOptionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: C.text, flex: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: C.primary },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.primary },
  datePill: { backgroundColor: C.fill, borderRadius: 10, padding: 10, marginTop: 6 },
  datePillText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: C.primary },
  infoBox: { backgroundColor: '#E3F2FD', borderRadius: 8, padding: 10 },
  infoText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  saveBtn: { height: 50, backgroundColor: C.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  saveBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  historyChip: { backgroundColor: C.fill, borderRadius: 12, padding: 10, marginRight: 8, borderWidth: 1, borderColor: C.border, minWidth: 100 },
  historyChipSel: { backgroundColor: C.blue, borderColor: C.blue },
  historyChipName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.text },
  historyChipMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: C.sub, marginTop: 2 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 8 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: C.muted },
  reasonChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 50, backgroundColor: C.fill },
  reasonChipSel: { backgroundColor: C.primary },
  reasonChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.text },
});
