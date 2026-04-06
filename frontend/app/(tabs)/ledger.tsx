import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Alert, Modal, TextInput, ScrollView, Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PAYMENT_MODES = ['Cash', 'GPay', 'Online', 'Cheque', 'Other'];

const C = {
  primary: '#2E7D32', bg: '#FDFBF7', surface: '#FFFFFF', secondary: '#E8F5E9',
  text: '#0A1F10', sub: '#4A5D4E', border: '#E0E8E1', error: '#D32F2F', warning: '#F57F17',
};

const PERIODS = [
  { key: 'all', label: 'All Time' },
  { key: 'month', label: 'This Month' },
  { key: 'week', label: 'This Week' },
];

interface Case {
  id: string; owner_name: string; mobile: string; village_name: string;
  animal_type: string; visit_reason: string; visit_date: string;
  amount: number; status: string; is_paid: boolean;
}

export default function LedgerScreen() {
  const { token } = useAuth();
  const [period, setPeriod] = useState('all');
  const [cases, setCases] = useState<Case[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Mark Paid Modal
  const [markPaidCase, setMarkPaidCase] = useState<Case | null>(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [paidMode, setPaidMode] = useState('Cash');
  const [marking, setMarking] = useState(false);

  useEffect(() => { fetchLedger(); }, [period, token]);

  const fetchLedger = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ledger/outstanding?period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCases(data.cases || []);
      setTotalOutstanding(data.total_outstanding || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchLedger(); }, [period, token]);

  const openMarkPaid = (c: Case) => {
    setMarkPaidCase(c);
    setPaidAmount(`${c.amount}`);
    setPaidMode('Cash');
  };

  const saveMarkPaid = async () => {
    if (!markPaidCase) return;
    if (!paidAmount || isNaN(parseFloat(paidAmount))) {
      Alert.alert('Required', 'Enter the amount received'); return;
    }
    setMarking(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases/${markPaidCase.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(paidAmount), payment_mode: paidMode }),
      });
      if (!res.ok) throw new Error('Failed');
      setMarkPaidCase(null); fetchLedger();
      Alert.alert('✅ Payment Recorded!', `₹${paidAmount} received from ${markPaidCase.owner_name}`);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setMarking(false); }
  };

  const renderCase = ({ item: c }: { item: Case }) => (
    <View testID={`ledger-case-${c.id}`} style={styles.card}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ownerName}>{c.owner_name}</Text>
          {c.village_name ? <Text style={styles.village}>📍 {c.village_name}</Text> : null}
          <Text style={styles.meta}>{c.animal_type} • {c.visit_reason}</Text>
          <Text style={styles.date}>
            {new Date(c.visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.amountOwed}>₹{c.amount.toLocaleString('en-IN')}</Text>
          <Text style={styles.amountLabel}>Outstanding</Text>
        </View>
      </View>
      <TouchableOpacity testID={`mark-paid-btn-${c.id}`} style={styles.markPaidBtn} onPress={() => openMarkPaid(c)}>
        <Text style={styles.markPaidText}>💰 Mark as Paid</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💳 Payment Ledger</Text>
        <Text style={styles.headerSub}>Outstanding farmer payments</Text>
      </View>

      {/* Total Outstanding */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Outstanding</Text>
        <Text style={styles.totalAmount}>₹{totalOutstanding.toLocaleString('en-IN')}</Text>
        <Text style={styles.totalCount}>{cases.length} unpaid {cases.length === 1 ? 'case' : 'cases'}</Text>
      </View>

      {/* Period Filter */}
      <View style={styles.filterRow}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.key} testID={`period-${p.key}`}
            style={[styles.filterBtn, period === p.key && styles.filterBtnActive]}
            onPress={() => setPeriod(p.key)}>
            <Text style={[styles.filterText, period === p.key && styles.filterTextActive]}>{p.label}</Text>
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
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>All Payments Cleared!</Text>
              <Text style={styles.emptyText}>No outstanding payments for this period</Text>
            </View>
          }
        />
      )}

      {/* Mark Paid Modal */}
      <Modal visible={!!markPaidCase} transparent animationType="slide" onRequestClose={() => setMarkPaidCase(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Mark as Paid</Text>
                <Text style={styles.sheetSub}>{markPaidCase?.owner_name} • ₹{markPaidCase?.amount}</Text>
              </View>
              <TouchableOpacity style={styles.xBtn} onPress={() => setMarkPaidCase(null)}>
                <Text style={styles.xText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>AMOUNT RECEIVED (₹)</Text>
            <TextInput testID="paid-amount-input" style={styles.input}
              placeholder="Amount received" placeholderTextColor="#9EB09F"
              keyboardType="numeric" value={paidAmount}
              onChangeText={setPaidAmount} />

            <Text style={styles.label}>PAYMENT MODE</Text>
            <View style={styles.chipRow}>
              {PAYMENT_MODES.map(m => (
                <TouchableOpacity key={m} testID={`ledger-mode-${m}`}
                  style={[styles.chip, paidMode === m && styles.chipSel]}
                  onPress={() => setPaidMode(m)}>
                  <Text style={[styles.chipText, paidMode === m && { color: '#fff' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity testID="confirm-mark-paid"
              style={[styles.saveBtn, marking && { opacity: 0.6 }]}
              onPress={saveMarkPaid} disabled={marking}>
              {marking ? <ActivityIndicator color="#fff" /> :
                <Text style={styles.saveBtnText}>✅ Confirm Payment Received</Text>}
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 13, color: C.sub, marginTop: 2 },
  totalCard: {
    marginHorizontal: 16, marginVertical: 12, backgroundColor: C.error,
    borderRadius: 20, padding: 20, alignItems: 'center',
  },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  totalAmount: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 4 },
  totalCount: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  filterBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: C.sub },
  filterTextActive: { color: '#fff' },
  listContent: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardRow: { flexDirection: 'row', marginBottom: 12 },
  ownerName: { fontSize: 16, fontWeight: '700', color: C.text },
  village: { fontSize: 12, color: C.sub, marginTop: 2 },
  meta: { fontSize: 12, color: C.sub, marginTop: 1 },
  date: { fontSize: 12, color: C.primary, fontWeight: '600', marginTop: 2 },
  amountBox: { alignItems: 'flex-end' },
  amountOwed: { fontSize: 20, fontWeight: '800', color: C.error },
  amountLabel: { fontSize: 11, color: C.sub, marginTop: 2 },
  markPaidBtn: { backgroundColor: C.secondary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#A5D6A7' },
  markPaidText: { fontSize: 14, fontWeight: '700', color: C.primary },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 4 },
  emptyText: { fontSize: 14, color: C.sub },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: C.text },
  sheetSub: { fontSize: 13, color: C.sub, marginTop: 2 },
  xBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F0F4F1', justifyContent: 'center', alignItems: 'center' },
  xText: { fontSize: 13, color: C.sub, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '600', color: C.sub, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: '#FDFBF7', paddingHorizontal: 14, fontSize: 15, color: C.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: C.secondary, borderWidth: 1.5, borderColor: C.border },
  chipSel: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: C.text },
  saveBtn: { height: 52, backgroundColor: C.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
