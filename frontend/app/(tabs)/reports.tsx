import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

const C = {
  primary: '#2E7D32', bg: '#F6FBF6', surface: '#FFFFFF', fill: '#EDF7EE',
  secondary: '#E8F5E9', text: '#0A1F10', sub: '#5A7060', border: '#D4EAD6',
};

const PERIODS = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const REPORT_TABS = [
  { key: 'animal', label: '🐾 Animal', emoji: '🐾' },
  { key: 'reason', label: '🩺 Reason', emoji: '🩺' },
  { key: 'forwards', label: '↗ Forwards', emoji: '↗' },
];

const COLORS = ['#2E7D32','#1565C0','#E65100','#6A1B9A','#00695C','#AD1457','#4E342E','#37474F'];

export default function ReportsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('animal');
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchReport(); }, [activeTab, period]);

  const fetchReport = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const h = { Authorization: `Bearer ${token}` };
      if (activeTab === 'animal') {
        const r = await fetch(`${BACKEND_URL}/api/reports/animal-type?period=${period}`, { headers: h });
        const d = await r.json();
        setData(d.data || []);
        setTotal((d.data || []).reduce((s: number, i: any) => s + i.count, 0));
      } else if (activeTab === 'reason') {
        const r = await fetch(`${BACKEND_URL}/api/reports/visit-reason?period=${period}`, { headers: h });
        const d = await r.json();
        setData(d.data || []);
        setTotal((d.data || []).reduce((s: number, i: any) => s + i.count, 0));
      } else {
        const r = await fetch(`${BACKEND_URL}/api/reports/forwards`, { headers: h });
        const d = await r.json();
        setData(d.cases || []);
        setTotal(d.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchReport(); }, [activeTab, period]);

  const maxCount = data.length > 0 ? Math.max(...data.map((d: any) => d.count || 1)) : 1;

  return (
    <SafeAreaView style={s.safe}>
      {/* Back Header */}
      <View style={s.backHeader}>
        <TouchableOpacity testID="reports-back-btn" style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.backTitle}>Reports & Analytics</Text>
        <View style={{ width: 60 }} />
      </View>
      {/* Report type tabs */}
      <View style={s.tabBar}>
        {REPORT_TABS.map(t => (
          <TouchableOpacity key={t.key} testID={`report-tab-${t.key}`}
            style={[s.tab, activeTab === t.key && s.tabActive]}
            onPress={() => setActiveTab(t.key)}>
            <Text style={[s.tabText, activeTab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period filter (not for forwards) */}
      {activeTab !== 'forwards' && (
        <View style={s.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p.key} testID={`period-${p.key}`}
              style={[s.periodBtn, period === p.key && s.periodBtnActive]}
              onPress={() => setPeriod(p.key)}>
              <Text style={[s.periodText, period === p.key && s.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}>

        {loading ? (
          <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
        ) : data.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📊</Text>
            <Text style={s.emptyText}>No data for this period</Text>
          </View>
        ) : activeTab === 'forwards' ? (
          // Forwards list
          <>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{total}</Text>
              <Text style={s.summaryLabel}>Total Forwarded Cases</Text>
            </View>
            {data.map((c: any, i: number) => (
              <View key={c.id || i} style={s.forwardCard}>
                <View style={s.forwardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.forwardOwner}>{c.owner_name}</Text>
                    <Text style={s.forwardMeta}>{c.animal_type} • {c.visit_reason}</Text>
                    {c.village_name ? <Text style={s.forwardVillage}>📍 {c.village_name}</Text> : null}
                    {c.forwarded_to_name ? <Text style={s.forwardedTo}>↗ To Dr. {c.forwarded_to_name}</Text> : null}
                  </View>
                  <Text style={s.forwardDate}>
                    {new Date(c.visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          // Bar chart view
          <>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{total}</Text>
              <Text style={s.summaryLabel}>
                Total {activeTab === 'animal' ? 'Cases' : 'Visits'} · {PERIODS.find(p => p.key === period)?.label}
              </Text>
            </View>
            {data.map((item: any, i: number) => {
              const label = activeTab === 'animal' ? item.animal_type : item.reason;
              const count = item.count;
              const pct = Math.max(8, (count / maxCount) * 100);
              return (
                <View key={i} style={s.barCard}>
                  <View style={s.barLabelRow}>
                    <Text style={s.barLabel}>{label}</Text>
                    <View style={s.barMeta}>
                      <Text style={[s.barCount, { color: COLORS[i % COLORS.length] }]}>{count}</Text>
                      {activeTab === 'animal' && item.earnings > 0 && (
                        <Text style={s.barEarnings}> · ₹{item.earnings.toLocaleString('en-IN')}</Text>
                      )}
                    </View>
                  </View>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }]} />
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  backHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { paddingHorizontal: 4, paddingVertical: 4, minWidth: 60 },
  backBtnText: { fontSize: 14, color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  backTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  tabBar: { flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.primary },
  tabText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.sub },
  tabTextActive: { color: C.primary },
  periodRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  periodBtn: { flex: 1, paddingVertical: 7, borderRadius: 20, backgroundColor: C.fill, alignItems: 'center' },
  periodBtnActive: { backgroundColor: C.primary },
  periodText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.sub },
  periodTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  center: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: C.sub },
  summaryCard: {
    backgroundColor: C.primary, borderRadius: 20, padding: 14, alignItems: 'center', marginBottom: 16,
  },
  summaryNum: { fontSize: 40, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: '#fff' },
  summaryLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  barCard: { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  barLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.text, flex: 1 },
  barMeta: { flexDirection: 'row', alignItems: 'center' },
  barCount: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  barEarnings: { fontSize: 13, color: C.sub },
  barTrack: { height: 10, backgroundColor: C.fill, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  // Forwards
  forwardCard: { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10 },
  forwardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  forwardOwner: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  forwardMeta: { fontSize: 12, color: C.sub, marginTop: 2 },
  forwardVillage: { fontSize: 12, color: C.sub, marginTop: 1 },
  forwardedTo: { fontSize: 12, color: '#1565C0', fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  forwardDate: { fontSize: 13, color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
