import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
  TextInput, Modal, Platform, Share, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const C = {
  primary: '#2E7D32', bg: '#F6FBF6', surface: '#FFFFFF', fill: '#EDF7EE',
  secondary: '#E8F5E9', text: '#0A1F10', sub: '#5A7060', border: '#D4EAD6',
  error: '#C62828', warning: '#E65100', blue: '#1565C0',
};

const ADMIN_TABS = [
  { key: 'stats', emoji: '📊', label: 'Overview' },
  { key: 'users', emoji: '👥', label: 'Users' },
  { key: 'analytics', emoji: '🏆', label: 'Top' },
  { key: 'banners', emoji: '🖼️', label: 'Banners' },
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
  // Analytics
  const [performers, setPerformers] = useState<{ by_cases: any[]; by_earnings: any[] }>({ by_cases: [], by_earnings: [] });
  const [perfView, setPerfView] = useState<'cases' | 'earnings'>('cases');
  // Banners
  const [banners, setBanners] = useState<any[]>([]);
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [newBanner, setNewBanner] = useState({ title: '', image_url: '', link_url: '' });
  const [savingBanner, setSavingBanner] = useState(false);
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
      } else if (tab === 'banners') {
        const r = await fetch(`${BACKEND_URL}/api/admin/banners`, { headers: h });
        const d = await r.json();
        setBanners(d.banners || []);
      } else if (tab === 'analytics') {
        const r = await fetch(`${BACKEND_URL}/api/admin/analytics/top-performers`, { headers: h });
        const d = await r.json();
        setPerformers({ by_cases: d.by_cases || [], by_earnings: d.by_earnings || [] });
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

            {/* ── BANNERS ── */}
            {tab === 'banners' && (
              <>
                <TouchableOpacity testID="add-banner-btn" style={s.exportBtn}
                  onPress={() => { setNewBanner({ title: '', image_url: '', link_url: '' }); setShowAddBanner(true); }}>
                  <Text style={s.exportBtnText}>＋ Add New Banner</Text>
                </TouchableOpacity>

                {banners.length === 0 ? (
                  <View style={s.empty}>
                    <Text style={s.emptyEmoji}>🖼️</Text>
                    <Text style={s.emptyText}>No banners yet. Add one above.</Text>
                  </View>
                ) : (
                  banners.map(b => (
                    <View key={b.id} testID={`banner-${b.id}`} style={[s.card, { marginBottom: 10 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.text }}>{b.title || 'No Title'}</Text>
                          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: C.sub, marginTop: 2 }} numberOfLines={1}>🔗 {b.link_url}</Text>
                          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: C.sub, marginTop: 1 }} numberOfLines={1}>🖼 {b.image_url}</Text>
                        </View>
                        <View style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }, b.is_active ? { backgroundColor: '#E8F5E9' } : { backgroundColor: '#F5F5F5' }]}>
                          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: b.is_active ? C.primary : C.sub }}>
                            {b.is_active ? '● LIVE' : '○ OFF'}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity testID={`toggle-banner-${b.id}`} style={[s.unsuspendBtn, { flex: 1 }]}
                          onPress={async () => {
                            await fetch(`${BACKEND_URL}/api/admin/banners/${b.id}/toggle`, { method: 'PUT', headers: h });
                            fetchData();
                          }}>
                          <Text style={s.unsuspendBtnText}>{b.is_active ? 'Deactivate' : '✓ Activate'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity testID={`delete-banner-${b.id}`} style={[s.suspendBtn, { flex: 1 }]}
                          onPress={() => {
                            Alert.alert('Delete Banner', 'Are you sure?', [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: async () => {
                                await fetch(`${BACKEND_URL}/api/admin/banners/${b.id}`, { method: 'DELETE', headers: h });
                                fetchData();
                              }},
                            ]);
                          }}>
                          <Text style={s.suspendBtnText}>🗑 Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}

                {/* Add Banner Modal */}
                <Modal visible={showAddBanner} transparent animationType="slide" onRequestClose={() => setShowAddBanner(false)}>
                  <View style={s.overlay}>
                    <View style={s.suspendSheet}>
                      <View style={s.handle} />
                      <Text style={[s.suspendTitle, { color: C.primary }]}>🖼️ Add Advertisement Banner</Text>
                      <Text style={s.suspendLabel}>BANNER TITLE <Text style={{ color: C.sub, fontWeight: '400' }}>Optional</Text></Text>
                      <TextInput testID="banner-title-input" style={s.suspendInput}
                        placeholder="e.g. Special Offer — 20% off medicines"
                        placeholderTextColor="#9EB09F" value={newBanner.title}
                        onChangeText={v => setNewBanner(n => ({ ...n, title: v }))} />
                      <Text style={s.suspendLabel}>IMAGE URL <Text style={{ color: C.sub, fontWeight: '400' }}>or pick from gallery</Text></Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                        <TextInput testID="banner-img-input" style={[s.suspendInput, { flex: 1, marginBottom: 0 }]}
                          placeholder="https://your-site.com/banner.jpg"
                          placeholderTextColor="#9EB09F" value={newBanner.image_url}
                          onChangeText={v => setNewBanner(n => ({ ...n, image_url: v }))}
                          autoCapitalize="none" keyboardType="url" />
                        <TouchableOpacity
                          style={{ height: 52, width: 52, backgroundColor: C.fill, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border }}
                          onPress={async () => {
                            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (status !== 'granted') { Alert.alert('Permission needed', 'Allow gallery access'); return; }
                            const result = await ImagePicker.launchImageLibraryAsync({
                              mediaTypes: ImagePicker.MediaTypeOptions.Images,
                              base64: true,
                              quality: 0.7,
                              allowsEditing: true,
                              aspect: [16, 9],
                            });
                            if (!result.canceled && result.assets[0].base64) {
                              const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
                              setNewBanner(n => ({ ...n, image_url: b64 }));
                            }
                          }}>
                          <Text style={{ fontSize: 22 }}>🖼</Text>
                        </TouchableOpacity>
                      </View>
                      {newBanner.image_url ? (
                        <Image source={{ uri: newBanner.image_url }} style={{ width: '100%', height: 100, borderRadius: 8, marginBottom: 8 }} resizeMode="cover" />
                      ) : null}
                      <Text style={s.suspendLabel}>LINK URL *</Text>
                      <TextInput testID="banner-link-input" style={s.suspendInput}
                        placeholder="https://wa.me/919486544884 or any link"
                        placeholderTextColor="#9EB09F" value={newBanner.link_url}
                        onChangeText={v => setNewBanner(n => ({ ...n, link_url: v }))}
                        autoCapitalize="none" keyboardType="url" />
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: C.sub, marginBottom: 12 }}>
                        💡 Tip: Use WhatsApp link (wa.me/...), website URL, or any link.{'\n'}Banner shows once per day to each user.
                      </Text>
                      <View style={s.suspendBtns}>
                        <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAddBanner(false)}>
                          <Text style={s.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity testID="save-banner-btn" style={[s.confirmSuspendBtn, { backgroundColor: C.primary }, savingBanner && { opacity: 0.6 }]}
                          disabled={savingBanner}
                          onPress={async () => {
                            if (!newBanner.image_url || !newBanner.link_url) {
                              Alert.alert('Required', 'Image URL and Link URL are required'); return;
                            }
                            setSavingBanner(true);
                            try {
                              const r = await fetch(`${BACKEND_URL}/api/admin/banners`, {
                                method: 'POST',
                                headers: { ...h, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...newBanner, is_active: true }),
                              });
                              if (!r.ok) throw new Error('Failed');
                              setShowAddBanner(false);
                              fetchData();
                              Alert.alert('✅ Banner Added!', 'It is now live and will show to users once per day.');
                            } catch (e: any) { Alert.alert('Error', e.message); }
                            finally { setSavingBanner(false); }
                          }}>
                          {savingBanner ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmSuspendText}>Save & Activate</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
              </>
            )}
            {tab === 'analytics' && (
              <>
                <View style={s.toggleRow}>
                  {[{k:'cases',l:'🏆 By Cases'},{k:'earnings',l:'💰 By Earnings'}].map(({k,l}) => (
                    <TouchableOpacity key={k} testID={`perf-${k}`}
                      style={[s.toggleBtn, perfView===k && s.toggleActive]}
                      onPress={() => setPerfView(k as any)}>
                      <Text style={[{fontSize:13,fontFamily:'Inter_600SemiBold',color:C.text}, perfView===k && {color:'#fff'}]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity testID="export-owner-data-btn"
                  style={[s.exportBtn, {marginTop:8}]}
                  onPress={async () => {
                    try {
                      const r = await fetch(`${BACKEND_URL}/api/admin/export/owner-data`, {headers: h});
                      const csv = await r.text();
                      await Share.share({
                        message: csv,
                        title: 'Animitra Owner Data Export',
                      });
                    } catch(e) { Alert.alert('Error', 'Could not export data'); }
                  }}>
                  <Text style={s.exportBtnText}>📤 Export & Share via WhatsApp</Text>
                </TouchableOpacity>
                <Text style={[s.countText,{marginTop:12}]}>
                  {perfView === 'cases' ? 'Ranked by Total Cases' : 'Ranked by Total Earnings'}
                </Text>
                {(perfView === 'cases' ? performers.by_cases : performers.by_earnings).map((v, i) => (
                  <View key={v.id} style={[s.card, {marginBottom:8}]}>
                    <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                      <View style={{width:28,height:28,borderRadius:14,backgroundColor:i<3?'#FFD700':'#E8F5E9',justifyContent:'center',alignItems:'center'}}>
                        <Text style={{fontFamily:'Inter_800ExtraBold',fontSize:13,color:i<3?'#795548':C.primary}}>#{i+1}</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontFamily:'Inter_700Bold',fontSize:14,color:C.text}}>{v.name}</Text>
                        <Text style={{fontFamily:'Inter_400Regular',fontSize:11,color:C.sub}}>{v.mobile} · {v.district}, {v.state}</Text>
                        <View style={{flexDirection:'row',gap:12,marginTop:3}}>
                          <Text style={{fontFamily:'Inter_600SemiBold',fontSize:12,color:C.primary}}>{v.total_cases} cases</Text>
                          <Text style={{fontFamily:'Inter_600SemiBold',fontSize:12,color:'#6A1B9A'}}>₹{v.total_earnings.toLocaleString('en-IN')}</Text>
                          {v.outstanding > 0 && <Text style={{fontFamily:'Inter_500Medium',fontSize:11,color:C.error}}>₹{v.outstanding.toLocaleString('en-IN')} outstanding</Text>}
                        </View>
                      </View>
                      <View style={{alignItems:'flex-end'}}>
                        {!v.is_activated && <View style={{backgroundColor:'#FFF8E1',borderRadius:6,paddingHorizontal:6,paddingVertical:2}}><Text style={{fontSize:9,fontFamily:'Inter_700Bold',color:'#E65100'}}>TRIAL</Text></View>}
                        {v.is_suspended && <View style={{backgroundColor:'#FFEBEE',borderRadius:6,paddingHorizontal:6,paddingVertical:2}}><Text style={{fontSize:9,fontFamily:'Inter_700Bold',color:C.error}}>SUSPENDED</Text></View>}
                      </View>
                    </View>
                  </View>
                ))}
                {performers.by_cases.length === 0 && (
                  <View style={s.empty}><Text style={s.emptyText}>No vet data yet</Text></View>
                )}
              </>
            )}
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
  bkBtnText: { fontSize: 14, color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  bkTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  tabBar: { flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.primary },
  tabEmoji: { fontSize: 13 },
  tabLabel: { fontSize: 10, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.sub, marginTop: 2 },
  tabLabelActive: { color: C.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  center: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 13, color: C.sub },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '31%', backgroundColor: C.surface, borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  statLabel: { fontSize: 11, color: C.sub, marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text, marginBottom: 10 },
  stateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  stateName: { fontSize: 14, color: C.text },
  stateCount: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.primary },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  toggleBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  toggleActive: { backgroundColor: C.primary, borderColor: C.primary },
  exportBtn: { backgroundColor: C.primary, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 4 },
  exportBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#fff' },
  // Users
  searchInput: { height: 44, backgroundColor: C.fill, borderRadius: 14, paddingHorizontal: 14, fontSize: 13, color: C.text, marginBottom: 10 },
  countText: { fontSize: 13, color: C.sub, marginBottom: 8 },
  userRow: { flexDirection: 'row' },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  userName: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  userMobile: { fontSize: 12, color: C.sub, marginTop: 2 },
  userLocation: { fontSize: 12, color: C.sub, marginTop: 1 },
  userStats: { fontSize: 12, color: C.primary, marginTop: 4, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  suspendedCard: { borderLeftWidth: 3, borderLeftColor: C.error },
  suspendedBadge: { backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  suspendedText: { fontSize: 10, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.error },
  adminBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adminText: { fontSize: 10, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.blue },
  userActions: { marginTop: 10, flexDirection: 'row' },
  suspendBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFEBEE' },
  suspendBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.error },
  unsuspendBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.secondary },
  unsuspendBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.primary },
  // Payments
  paymentSummary: { backgroundColor: C.warning, borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center' },
  paymentTotal: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#fff' },
  payRow: { flexDirection: 'row', alignItems: 'flex-start' },
  payName: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  payMobile: { fontSize: 13, color: C.sub, marginTop: 2 },
  payUTR: { fontSize: 13, color: C.sub, marginTop: 2 },
  utrValue: { color: C.primary, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  payDate: { fontSize: 12, color: C.sub, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, height: 28 },
  statusDone: { backgroundColor: C.secondary },
  statusPending: { backgroundColor: '#FFF8E1' },
  statusText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  processBtn: { marginTop: 10, backgroundColor: C.primary, borderRadius: 10, padding: 10, alignItems: 'center' },
  processBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#fff' },
  // Coupons
  couponStats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  couponStatCard: { flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 14, alignItems: 'center' },
  couponStatNum: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  couponStatLabel: { fontSize: 12, color: C.sub, marginTop: 4 },
  couponActions: { marginBottom: 12 },
  genBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  genBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#fff' },
  couponRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, borderRadius: 10, padding: 12, marginBottom: 6 },
  couponUsed: { opacity: 0.6 },
  couponCode: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  couponCodeUsed: { color: C.sub },
  couponStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  couponStatusFree: { backgroundColor: C.secondary },
  couponStatusUsed: { backgroundColor: '#EEEEEE' },
  couponStatusText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  // Suspend modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  suspendSheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 14, paddingBottom: Platform.OS === 'ios' ? 36 : 20 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  suspendTitle: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.error, marginBottom: 4 },
  suspendUserName: { fontSize: 14, color: C.sub, marginBottom: 16 },
  suspendLabel: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.sub, letterSpacing: 0.8, marginBottom: 8 },
  suspendInput: { backgroundColor: C.fill, borderRadius: 12, padding: 14, fontSize: 14, color: C.text, height: 80, textAlignVertical: 'top', marginBottom: 16 },
  suspendBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, height: 44, backgroundColor: C.fill, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.sub },
  confirmSuspendBtn: { flex: 1, height: 44, backgroundColor: C.error, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  confirmSuspendText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#fff' },
});
