import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Alert, Modal, TextInput, ScrollView, Platform, Linking} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PAYMENT_MODES = ['Cash', 'GPay', 'Online', 'Cheque', 'Other'];

const C = {
  primary: '#2E7D32', bg: '#F6FBF6', surface: '#FFFFFF', fill: '#EDF7EE',
  secondary: '#E8F5E9', text: '#0A1F10', sub: '#5A7060', border: '#D4EAD6',
  error: '#C62828', warning: '#E65100', blue: '#1565C0'};

const PERIODS = [
  { key: 'all', label: 'All Time' },
  { key: 'month', label: 'This Month' },
  { key: 'week', label: 'This Week' },
];

interface CaseItem {
  id: string; visit_date: string; visit_reason: string; animal_type: string;
  amount: number; paid_amount: number; outstanding: number; notes: string;
  payment_status: string;
}

interface Farmer {
  owner_name: string; mobile: string; village_name: string;
  total_outstanding: number; case_count: number; cases: CaseItem[];
}

export default function LedgerScreen() {
  const { token } = useAuth();
  const [period, setPeriod] = useState('all');
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [totalFarmers, setTotalFarmers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null);

  // Collect Payment Modal
  const [collectFarmer, setCollectFarmer] = useState<Farmer | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMode, setCollectMode] = useState('Cash');
  const [collecting, setCollecting] = useState(false);

  useEffect(() => { fetchLedger(); }, [period, token]);

  const fetchLedger = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ledger/outstanding?period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFarmers(data.farmers || []);
      setTotalOutstanding(data.total_outstanding || 0);
      setTotalFarmers(data.total_farmers || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchLedger(); }, [period, token]);

  const openCollect = (farmer: Farmer) => {
    setCollectFarmer(farmer);
    setCollectAmount(`${farmer.total_outstanding}`);
    setCollectMode('Cash');
  };

  const saveCollect = async () => {
    if (!collectFarmer) return;
    const amount = parseFloat(collectAmount);
    if (!amount || amount <= 0) { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    if (amount > collectFarmer.total_outstanding) {
      Alert.alert('Invalid', `Amount cannot exceed outstanding ₹${collectFarmer.total_outstanding}`); return;
    }
    setCollecting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ledger/farmer-collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mobile: collectFarmer.mobile,
          owner_name: collectFarmer.owner_name,
          amount: amount,
          payment_mode: collectMode})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      setCollectFarmer(null);
      fetchLedger();

      const remaining = Math.max(0, collectFarmer.total_outstanding - amount);
      Alert.alert('✅ Payment Collected!',
        `₹${amount.toLocaleString('en-IN')} received from ${collectFarmer.owner_name}.\n` +
        (remaining > 0 ? `Remaining balance: ₹${remaining.toLocaleString('en-IN')}` : '✅ All cleared!')
      );
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setCollecting(false); }
  };

  const renderFarmer = ({ item: f }: { item: Farmer }) => {
    const isExpanded = expandedMobile === f.mobile;
    return (
      <View testID={`farmer-card-${f.mobile}`} style={s.farmerCard}>
        {/* Farmer Header */}
        <TouchableOpacity style={s.farmerHeader} onPress={() => setExpandedMobile(isExpanded ? null : f.mobile)} activeOpacity={0.7}>
          <View style={s.farmerInfo}>
            <View style={s.farmerAvatar}>
              <Text style={s.farmerAvatarText}>{f.owner_name[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.farmerName}>{f.owner_name}</Text>
              {f.village_name ? <Text style={s.farmerVillage}>📍 {f.village_name}</Text> : null}
              <Text style={s.farmerCases}>{f.case_count} visit{f.case_count > 1 ? 's' : ''} pending</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.farmerTotal}>₹{f.total_outstanding.toLocaleString('en-IN')}</Text>
              <Text style={s.farmerTotalLabel}>outstanding</Text>
              <Text style={s.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded Case Breakdown */}
        {isExpanded && (
          <View style={s.caseList}>
            <View style={s.caseListHeader}>
              <Text style={s.caseListTitle}>Visit Breakdown</Text>
            </View>
            {f.cases.map((c, idx) => {
              const isPartial = c.paid_amount > 0;
              return (
                <View key={c.id} style={s.caseRow}>
                  <View style={s.caseNum}><Text style={s.caseNumText}>{idx + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.caseReason}>{c.animal_type} · {c.visit_reason}</Text>
                    <Text style={s.caseDate}>
                      {new Date(c.visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                    {isPartial && (
                      <Text style={s.casePartialNote}>Charged ₹{c.amount} · Paid ₹{c.paid_amount}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.caseOutstanding}>₹{c.outstanding.toLocaleString('en-IN')}</Text>
                    {isPartial && <Text style={s.casePartialBadge}>PARTIAL</Text>}
                  </View>
                </View>
              );
            })}
            {/* Total row */}
            <View style={s.totalRow}>
              <Text style={s.totalRowLabel}>Total Outstanding</Text>
              <Text style={s.totalRowAmount}>₹{f.total_outstanding.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={s.farmerActions}>
          <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${f.mobile}`)}>
            <Text style={s.callBtnText}>📞 {f.mobile}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID={`collect-btn-${f.mobile}`}
            style={s.collectBtn} onPress={() => openCollect(f)}>
            <Text style={s.collectBtnText}>💰 Collect</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top","left","right"]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>💳 Payment Ledger</Text>
        <Text style={s.headerSub}>Outstanding farmer payments</Text>
      </View>

      {/* Total Outstanding Banner */}
      <View style={s.totalBanner}>
        <View style={s.totalLeft}>
          <Text style={s.totalAmount}>₹{totalOutstanding.toLocaleString('en-IN')}</Text>
          <Text style={s.totalLabel}>Total Outstanding</Text>
        </View>
        <View style={s.totalRight}>
          <Text style={s.totalFarmerNum}>{totalFarmers}</Text>
          <Text style={s.totalFarmerLabel}>Farmers</Text>
        </View>
      </View>

      {/* Period Filter */}
      <View style={s.filterRow}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.key} testID={`period-${p.key}`}
            style={[s.filterBtn, period === p.key && s.filterBtnActive]}
            onPress={() => setPeriod(p.key)}>
            <Text style={[s.filterText, period === p.key && s.filterTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={farmers}
          keyExtractor={f => f.mobile}
          renderItem={renderFarmer}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>🎉</Text>
              <Text style={s.emptyTitle}>All Payments Cleared!</Text>
              <Text style={s.emptyText}>No outstanding payments for this period</Text>
            </View>
          }
        />
      )}

      {/* Collect Payment Modal */}
      <Modal visible={!!collectFarmer} transparent animationType="slide" onRequestClose={() => setCollectFarmer(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>💰 Collect Payment</Text>
                <Text style={s.sheetSub}>{collectFarmer?.owner_name}</Text>
                {collectFarmer?.village_name ? <Text style={s.sheetSub}>📍 {collectFarmer.village_name}</Text> : null}
              </View>
              <TouchableOpacity style={s.xBtn} onPress={() => setCollectFarmer(null)}>
                <Text style={s.xText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Outstanding Summary */}
            <View style={s.outstandingSummary}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Total Outstanding</Text>
                <Text style={s.summaryTotal}>₹{collectFarmer?.total_outstanding.toLocaleString('en-IN')}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>{collectFarmer?.case_count} visits pending</Text>
                {collectFarmer && collectAmount && parseFloat(collectAmount) < collectFarmer.total_outstanding && (
                  <Text style={s.summaryBalance}>
                    Balance: ₹{Math.max(0, collectFarmer.total_outstanding - parseFloat(collectAmount || '0')).toLocaleString('en-IN')}
                  </Text>
                )}
              </View>
            </View>

            <Text style={s.label}>AMOUNT RECEIVING NOW (₹)</Text>
            <TextInput testID="collect-amount-input" style={s.input}
              placeholder={`Full amount: ${collectFarmer?.total_outstanding}`}
              placeholderTextColor="#9EB09F"
              keyboardType="numeric" value={collectAmount}
              onChangeText={setCollectAmount}
            />

            {/* Quick fill buttons */}
            {collectFarmer && (
              <View style={s.quickFill}>
                <TouchableOpacity testID="fill-full" style={s.quickBtn}
                  onPress={() => setCollectAmount(`${collectFarmer.total_outstanding}`)}>
                  <Text style={s.quickBtnText}>Full ₹{collectFarmer.total_outstanding.toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
                {collectFarmer.total_outstanding >= 500 && (
                  <TouchableOpacity testID="fill-half" style={s.quickBtn}
                    onPress={() => setCollectAmount(`${Math.floor(collectFarmer.total_outstanding / 2)}`)}>
                    <Text style={s.quickBtnText}>Half ₹{Math.floor(collectFarmer.total_outstanding / 2).toLocaleString('en-IN')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={s.label}>PAYMENT MODE</Text>
            <View style={s.chipRow}>
              {PAYMENT_MODES.map(m => (
                <TouchableOpacity key={m} testID={`ledger-mode-${m}`}
                  style={[s.chip, collectMode === m && s.chipSel]}
                  onPress={() => setCollectMode(m)}>
                  <Text style={[s.chipText, collectMode === m && { color: '#fff' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Distribution note */}
            <View style={s.distributionNote}>
              <Text style={s.distributionText}>
                📋 Payment applied to oldest visits first (FIFO)
              </Text>
            </View>

            <TouchableOpacity testID="confirm-collect-btn"
              style={[s.saveBtn, collecting && { opacity: 0.6 }]}
              onPress={saveCollect} disabled={collecting}>
              {collecting ? <ActivityIndicator color="#fff" /> :
                <Text style={s.saveBtnText}>✅ Confirm Collection</Text>}
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  header: { paddingHorizontal: 14, paddingVertical: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.text },
  headerSub: { fontSize: 13, color: C.sub, marginTop: 2 },
  // Total banner
  totalBanner: {
    marginHorizontal: 16, marginVertical: 12, backgroundColor: C.error,
    borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center'},
  totalLeft: { flex: 1 },
  totalAmount: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: '#fff' },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  totalRight: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: 12, minWidth: 64 },
  totalFarmerNum: { fontSize: 13, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: '#fff' },
  totalFarmerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  // Filters
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  filterBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.sub },
  filterTextActive: { color: '#fff' },
  listContent: { padding: 16, gap: 12, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text, marginBottom: 4 },
  emptyText: { fontSize: 14, color: C.sub },
  // Farmer card
  farmerCard: { backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden', boxShadow: '0px 2px 10px rgba(46,125,50,0.07)' },
  farmerHeader: { padding: 16 },
  farmerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  farmerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  farmerAvatarText: { fontSize: 13, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.error },
  farmerName: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.text },
  farmerVillage: { fontSize: 12, color: C.sub, marginTop: 1 },
  farmerCases: { fontSize: 12, color: C.sub, marginTop: 2 },
  farmerTotal: { fontSize: 13, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.error },
  farmerTotalLabel: { fontSize: 11, color: C.sub, textAlign: 'right' },
  expandIcon: { fontSize: 11, color: C.sub, marginTop: 4 },
  // Case list (expanded)
  caseList: { backgroundColor: C.fill, marginHorizontal: 12, borderRadius: 12, marginBottom: 4, padding: 12 },
  caseListHeader: { marginBottom: 8 },
  caseListTitle: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.sub },
  caseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  caseNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.secondary, justifyContent: 'center', alignItems: 'center' },
  caseNumText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.primary },
  caseReason: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.text },
  caseDate: { fontSize: 11, color: C.sub, marginTop: 2 },
  casePartialNote: { fontSize: 11, color: C.warning, marginTop: 2 },
  caseOutstanding: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.error },
  casePartialBadge: { fontSize: 9, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.warning, backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 4, borderTopWidth: 1.5, borderTopColor: C.border },
  totalRowLabel: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  totalRowAmount: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.error },
  // Farmer actions
  farmerActions: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 0 },
  callBtn: { flex: 1, backgroundColor: C.fill, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  callBtnText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.primary },
  collectBtn: { flex: 1, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  collectBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#fff' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 36 : 20 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  sheetTitle: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.text },
  sheetSub: { fontSize: 13, color: C.sub, marginTop: 1 },
  xBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.fill, justifyContent: 'center', alignItems: 'center' },
  xText: { fontSize: 13, color: C.sub, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  outstandingSummary: { backgroundColor: '#FFEBEE', borderRadius: 14, padding: 14, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  summaryLabel: { fontSize: 13, color: C.sub },
  summaryTotal: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.error },
  summaryBalance: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.warning },
  label: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.sub, letterSpacing: 0.8, marginBottom: 8, marginTop: 12 },
  input: { height: 46, borderRadius: 14, backgroundColor: C.fill, paddingHorizontal: 16, fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  quickFill: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.secondary, borderWidth: 1, borderColor: C.primary },
  quickBtnText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: C.fill },
  chipSel: { backgroundColor: C.primary },
  chipText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.text },
  distributionNote: { backgroundColor: '#E3F2FD', borderRadius: 10, padding: 10, marginTop: 10 },
  distributionText: { fontSize: 13, color: C.blue },
  saveBtn: { height: 46, backgroundColor: C.primary, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  saveBtnText: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#fff' }});
