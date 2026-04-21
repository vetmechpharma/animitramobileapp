import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
  TextInput, Modal, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const C = {
  primary: '#2E7D32', bg: '#F6FBF6', surface: '#FFFFFF', fill: '#EDF7EE',
  secondary: '#E8F5E9', text: '#0A1F10', sub: '#5A7060', border: '#D4EAD6',
  error: '#C62828', warning: '#E65100', blue: '#1565C0',
};

const ADMIN_TABS = [
  { key: 'stats', emoji: '📊', label: 'Overview' },
  { key: 'users', emoji: '👥', label: 'Users' },
  { key: 'payments', emoji: '💰', label: 'Payments' },
  { key: 'coupons', emoji: '🎟️', label: 'Coupons' },
];

export default function AdminScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('stats');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Stats
  const [summary, setSummary] = useState<any>(null);
  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  // Payments
  const [payments, setPayments] = useState<any[]>([]);
  // Coupons
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponStats, setCouponStats] = useState({ total: 0, unused: 0, activated: 0 });
  const [generating, setGenerating] = useState(false);

  // Suspend modal
  const [suspendUser, setSuspendUser] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => { fetchData(); }, [tab]);

  const h = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (tab === 'stats') {
        const r = await fetch(`${BACKEND_URL}/api/admin/reports/summary`, { headers: h });
        setSummary(await r.json());
      } else if (tab === 'users') {
        const r = await fetch(`${BACKEND_URL}/api/admin/users`, { headers: h });
        const d = await r.json();
        setUsers(d.users || []);
      } else if (tab === 'payments') {
        const r = await fetch(`${BACKEND_URL}/api/admin/payment-submissions`, { headers: h });
        const d = await r.json();
        setPayments(d.submissions || []);
      } else if (tab === 'coupons') {
        const r = await fetch(`${BACKEND_URL}/api/admin/coupons?limit=20`, { headers: h });
        const d = await r.json();
        setCoupons(d.coupons || []);
        setCouponStats({ total: d.total || 0, unused: d.unused || 0, activated: d.activated || 0 });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [tab]);

  const handleSuspend = async (uid: string, suspend: boolean) => {
    if (suspend && !suspendReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for suspension'); return;
    }
    try {
      const url = `${BACKEND_URL}/api/admin/users/${uid}/${suspend ? 'suspend' : 'unsuspend'}`;
      const body = suspend ? JSON.stringify({ reason: suspendReason }) : '{}';
      const r = await fetch(url, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body });
      if (!r.ok) throw new Error('Failed');
      setSuspendUser(null); setSuspendReason('');
      fetchData();
      Alert.alert('✅ Done', suspend ? 'User suspended successfully' : 'User unsuspended');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleProcessPayment = async (sid: string, name: string) => {
    Alert.alert('Mark as Processed', `Mark payment from ${name} as processed?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        try {
          await fetch(`${BACKEND_URL}/api/admin/payment-submissions/${sid}/process`,
            { method: 'POST', headers: h });
          fetchData();
          Alert.alert('✅ Processed', 'Payment marked as processed. Send coupon code to user.');
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleGenerateCoupons = async () => {
    setGenerating(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/coupons/generate`, {
        method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 100 }),
      });
      const d = await r.json();
      Alert.alert('✅ Generated', `${d.generated} new coupon codes created`);
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setGenerating(false); }
  };

  const handleExportUsers = async () => {
    Alert.alert('Export Users', 'User data will be available as CSV. Share the export URL with your team.', [
      { text: 'OK' }
    ]);
  };

  const filteredUsers = userSearch
    ? users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.mobile.includes(userSearch) || u.district?.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  return (
    <SafeAreaView style={s.safe}>
      {/* Back Header */}
      <View style={s.bkHeader}>
        <TouchableOpacity testID="admin-back-btn" style={s.bkBtn} onPress={() => router.back()}>
          <Text style={s.bkBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.bkTitle}>⚙️ Admin Panel</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {ADMIN_TABS.map(t => (
          <TouchableOpacity key={t.key} testID={`admin-tab-${t.key}`}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}>
            <Text style={s.tabEmoji}>{t.emoji}</Text>
            <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}>

        {loading && !refreshing ? (
          <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
        ) : (
          <>
            {/* ── STATS ── */}
            {tab === 'stats' && summary && (
              <>
                <View style={s.statsGrid}>
                  {[
                    { label: 'Total Vets', value: summary.total_users, color: C.primary },
                    { label: 'Active', value: summary.active_users, color: '#1565C0' },
                    { label: 'Suspended', value: summary.suspended, color: C.error },
                    { label: 'Total Cases', value: summary.total_cases, color: '#6A1B9A' },
                    { label: 'Paid Users', value: summary.total_payments, color: '#00695C' },
                    { label: 'Pending Pay', value: summary.pending_payments, color: C.warning },
                  ].map(item => (
                    <View key={item.label} style={s.statCard}>
                      <Text style={[s.statNum, { color: item.color }]}>{item.value}</Text>
                      <Text style={s.statLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                {summary.top_states?.length > 0 && (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>Top States</Text>
                    {summary.top_states.map((st: any) => (
                      <View key={st.state} style={s.stateRow}>
                        <Text style={s.stateName}>{st.state || 'Unknown'}</Text>
                        <Text style={s.stateCount}>{st.count} vets</Text>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity testID="export-users-btn" style={s.exportBtn} onPress={handleExportUsers}>
                  <Text style={s.exportBtnText}>📥 Export User Data (CSV)</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── USERS ── */}
            {tab === 'users' && (
              <>
                <TextInput
                  testID="user-search-input"
                  style={s.searchInput}
                  placeholder="Search by name, mobile, district..."
                  placeholderTextColor="#9EB09F"
                  value={userSearch}
                  onChangeText={setUserSearch}
                />
                <Text style={s.countText}>{filteredUsers.length} registered vets</Text>
                {filteredUsers.map(u => (
                  <View key={u.id} testID={`user-card-${u.id}`} style={[s.card, u.is_suspended && s.suspendedCard]}>
                    <View style={s.userRow}>
                      <View style={{ flex: 1 }}>
                        <View style={s.userNameRow}>
                          <Text style={s.userName}>{u.name}</Text>
                          {u.is_suspended && <View style={s.suspendedBadge}><Text style={s.suspendedText}>SUSPENDED</Text></View>}
                          {u.role === 'admin' && <View style={s.adminBadge}><Text style={s.adminText}>ADMIN</Text></View>}
                        </View>
                        <Text style={s.userMobile}>📞 {u.mobile} | {u.reg_no}</Text>
                        <Text style={s.userLocation}>📍 {u.taluk}, {u.district}, {u.state}</Text>
                        <Text style={s.userStats}>
                          {u.is_activated ? '✅ Active' : '⏳ Not Activated'} · {u.case_count} cases
                        </Text>
                      </View>
                    </View>
                    {u.role !== 'admin' && (
                      <View style={s.userActions}>
                        {u.is_suspended ? (
                          <TouchableOpacity testID={`unsuspend-${u.id}`}
                            style={s.unsuspendBtn}
                            onPress={() => handleSuspend(u.id, false)}>
                            <Text style={s.unsuspendBtnText}>✓ Unsuspend</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity testID={`suspend-${u.id}`}
                            style={s.suspendBtn}
                            onPress={() => { setSuspendUser(u); setSuspendReason(''); }}>
                            <Text style={s.suspendBtnText}>🚫 Suspend</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* ── PAYMENTS ── */}
            {tab === 'payments' && (
              <>
                <View style={s.paymentSummary}>
                  <Text style={s.paymentTotal}>{payments.filter(p => p.status === 'pending').length} Pending UTR Verifications</Text>
                </View>
                {payments.length === 0 ? (
                  <View style={s.empty}><Text style={s.emptyEmoji}>💰</Text><Text style={s.emptyText}>No payment submissions yet</Text></View>
                ) : payments.map(p => (
                  <View key={p.id} testID={`payment-${p.id}`} style={s.card}>
                    <View style={s.payRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.payName}>{p.name}</Text>
                        <Text style={s.payMobile}>📞 {p.mobile}</Text>
                        <Text style={s.payUTR}>UTR: <Text style={s.utrValue}>{p.utr_number}</Text></Text>
                        <Text style={s.payDate}>{new Date(p.created_at).toLocaleDateString('en-IN')}</Text>
                      </View>
                      <View style={[s.statusBadge, p.status === 'processed' ? s.statusDone : s.statusPending]}>
                        <Text style={s.statusText}>{p.status === 'processed' ? '✅ Done' : '⏳ Pending'}</Text>
                      </View>
                    </View>
                    {p.status === 'pending' && (
                      <TouchableOpacity testID={`process-payment-${p.id}`}
                        style={s.processBtn}
                        onPress={() => handleProcessPayment(p.id, p.name)}>
                        <Text style={s.processBtnText}>✅ Mark as Processed & Send Coupon</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* ── COUPONS ── */}
            {tab === 'coupons' && (
              <>
                <View style={s.couponStats}>
                  {[
                    { label: 'Total', value: couponStats.total, color: C.text },
                    { label: 'Unused', value: couponStats.unused, color: C.primary },
                    { label: 'Used', value: couponStats.activated, color: C.blue },
                  ].map(cs => (
                    <View key={cs.label} style={s.couponStatCard}>
                      <Text style={[s.couponStatNum, { color: cs.color }]}>{cs.value}</Text>
                      <Text style={s.couponStatLabel}>{cs.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.couponActions}>
                  <TouchableOpacity testID="generate-coupons-btn"
                    style={[s.genBtn, generating && { opacity: 0.6 }]}
                    onPress={handleGenerateCoupons} disabled={generating}>
                    {generating ? <ActivityIndicator color="#fff" size="small" /> :
                      <Text style={s.genBtnText}>🎟️ Generate 100 More</Text>}
                  </TouchableOpacity>
                </View>
                <Text style={s.countText}>Recent 20 coupons</Text>
                {coupons.map((c, i) => (
                  <View key={i} style={[s.couponRow, c.is_activated && s.couponUsed]}>
                    <Text style={[s.couponCode, c.is_activated && s.couponCodeUsed]}>{c.code}</Text>
                    <View style={[s.couponStatus, c.is_activated ? s.couponStatusUsed : s.couponStatusFree]}>
                      <Text style={s.couponStatusText}>{c.is_activated ? 'USED' : 'FREE'}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Suspend Modal */}
      <Modal visible={!!suspendUser} transparent animationType="slide" onRequestClose={() => setSuspendUser(null)}>
        <View style={s.overlay}>
          <View style={s.suspendSheet}>
            <View style={s.handle} />
            <Text style={s.suspendTitle}>🚫 Suspend Account</Text>
            <Text style={s.suspendUserName}>{suspendUser?.name} · {suspendUser?.mobile}</Text>
            <Text style={s.suspendLabel}>REASON FOR SUSPENSION</Text>
            <TextInput
              testID="suspend-reason-input"
              style={s.suspendInput}
              placeholder="Enter reason (e.g., fraudulent activity)..."
              placeholderTextColor="#9EB09F"
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline numberOfLines={3}
            />
            <View style={s.suspendBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setSuspendUser(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="confirm-suspend-btn"
                style={s.confirmSuspendBtn}
                onPress={() => handleSuspend(suspendUser.id, true)}>
                <Text style={s.confirmSuspendText}>Confirm Suspend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  bkHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  bkBtn: { paddingHorizontal: 4, paddingVertical: 4, minWidth: 60 },
  bkBtnText: { fontSize: 16, color: C.primary, fontWeight: '600' },
  bkTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  tabBar: { flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.primary },
  tabEmoji: { fontSize: 18 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: C.sub, marginTop: 2 },
  tabLabelActive: { color: C.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  center: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, color: C.sub },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '31%', backgroundColor: C.surface, borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: C.sub, marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 10 },
  stateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  stateName: { fontSize: 14, color: C.text },
  stateCount: { fontSize: 14, fontWeight: '600', color: C.primary },
  exportBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4 },
  exportBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Users
  searchInput: { height: 50, backgroundColor: C.fill, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, color: C.text, marginBottom: 10 },
  countText: { fontSize: 13, color: C.sub, marginBottom: 8 },
  userRow: { flexDirection: 'row' },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  userName: { fontSize: 15, fontWeight: '700', color: C.text },
  userMobile: { fontSize: 12, color: C.sub, marginTop: 2 },
  userLocation: { fontSize: 12, color: C.sub, marginTop: 1 },
  userStats: { fontSize: 12, color: C.primary, marginTop: 4, fontWeight: '600' },
  suspendedCard: { borderLeftWidth: 3, borderLeftColor: C.error },
  suspendedBadge: { backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  suspendedText: { fontSize: 10, fontWeight: '700', color: C.error },
  adminBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adminText: { fontSize: 10, fontWeight: '700', color: C.blue },
  userActions: { marginTop: 10, flexDirection: 'row' },
  suspendBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFEBEE' },
  suspendBtnText: { fontSize: 13, fontWeight: '700', color: C.error },
  unsuspendBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.secondary },
  unsuspendBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },
  // Payments
  paymentSummary: { backgroundColor: C.warning, borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center' },
  paymentTotal: { fontSize: 16, fontWeight: '700', color: '#fff' },
  payRow: { flexDirection: 'row', alignItems: 'flex-start' },
  payName: { fontSize: 15, fontWeight: '700', color: C.text },
  payMobile: { fontSize: 13, color: C.sub, marginTop: 2 },
  payUTR: { fontSize: 13, color: C.sub, marginTop: 2 },
  utrValue: { color: C.primary, fontWeight: '700' },
  payDate: { fontSize: 12, color: C.sub, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, height: 28 },
  statusDone: { backgroundColor: C.secondary },
  statusPending: { backgroundColor: '#FFF8E1' },
  statusText: { fontSize: 12, fontWeight: '700', color: C.text },
  processBtn: { marginTop: 10, backgroundColor: C.primary, borderRadius: 10, padding: 10, alignItems: 'center' },
  processBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  // Coupons
  couponStats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  couponStatCard: { flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 14, alignItems: 'center' },
  couponStatNum: { fontSize: 24, fontWeight: '800' },
  couponStatLabel: { fontSize: 12, color: C.sub, marginTop: 4 },
  couponActions: { marginBottom: 12 },
  genBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  genBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  couponRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, borderRadius: 10, padding: 12, marginBottom: 6 },
  couponUsed: { opacity: 0.6 },
  couponCode: { fontSize: 16, fontWeight: '800', color: C.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  couponCodeUsed: { color: C.sub },
  couponStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  couponStatusFree: { backgroundColor: C.secondary },
  couponStatusUsed: { backgroundColor: '#EEEEEE' },
  couponStatusText: { fontSize: 11, fontWeight: '700', color: C.text },
  // Suspend modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  suspendSheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  suspendTitle: { fontSize: 20, fontWeight: '800', color: C.error, marginBottom: 4 },
  suspendUserName: { fontSize: 14, color: C.sub, marginBottom: 16 },
  suspendLabel: { fontSize: 11, fontWeight: '600', color: C.sub, letterSpacing: 0.8, marginBottom: 8 },
  suspendInput: { backgroundColor: C.fill, borderRadius: 12, padding: 14, fontSize: 14, color: C.text, height: 80, textAlignVertical: 'top', marginBottom: 16 },
  suspendBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, height: 50, backgroundColor: C.fill, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: C.sub },
  confirmSuspendBtn: { flex: 1, height: 50, backgroundColor: C.error, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  confirmSuspendText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
