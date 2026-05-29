import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const C = {
  primary: '#2E7D32', bg: '#F4F9F4', surface: '#FFFFFF', fill: '#EBF5EC',
  secondary: '#E8F5E9', text: '#1A2E1C', sub: '#4B6352', border: '#D0E8D2',
  warning: '#E65100', error: '#C62828', blue: '#1565C0', muted: '#8FA891',
};

const PERIODS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const CHART_COLORS = ['#2E7D32', '#1565C0', '#E65100', '#6A1B9A', '#00695C', '#AD1457', '#F57F17', '#37474F'];

const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(75, 99, 82, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  decimalPlaces: 0,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#2E7D32' },
};

const earningsChartConfig = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(21, 101, 192, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#1565C0' },
};

export default function ReportsScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const chartWidth = width - 32;
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'admin_overview' : 'animal');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // End user data
  const [animalData, setAnimalData] = useState<any[]>([]);
  const [reasonData, setReasonData] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<any[]>([]);

  // Admin data
  const [adminStatus, setAdminStatus] = useState<any>(null);
  const [adminTrend, setAdminTrend] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);

  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchData(); }, [activeTab, period]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (activeTab === 'animal') {
        const r = await fetch(`${BACKEND_URL}/api/reports/animal-type?period=${period}`, { headers: h });
        const d = await r.json();
        setAnimalData(d.data || []);
      } else if (activeTab === 'reason') {
        const r = await fetch(`${BACKEND_URL}/api/reports/visit-reason?period=${period}`, { headers: h });
        const d = await r.json();
        setReasonData(d.data || []);
      } else if (activeTab === 'earnings') {
        const r = await fetch(`${BACKEND_URL}/api/reports/earnings-trend?period=${period}`, { headers: h });
        const d = await r.json();
        setEarningsData(d.data || []);
      } else if (activeTab === 'admin_overview') {
        const r = await fetch(`${BACKEND_URL}/api/admin/reports/user-status`, { headers: h });
        const d = await r.json();
        setAdminStatus(d.status);
        setAdminTrend(d.cases_trend || []);
      } else if (activeTab === 'admin_performers') {
        const r = await fetch(`${BACKEND_URL}/api/admin/analytics/top-performers`, { headers: h });
        const d = await r.json();
        setTopPerformers((d.by_cases || []).slice(0, 8));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [activeTab, period]);

  const USER_TABS = [
    { key: 'animal', label: '🐾 Animals', emoji: '🐾' },
    { key: 'reason', label: '🩺 Reasons', emoji: '🩺' },
    { key: 'earnings', label: '📈 Earnings', emoji: '📈' },
  ];

  const ADMIN_TABS = [
    { key: 'admin_overview', label: '📊 Overview', emoji: '📊' },
    { key: 'admin_performers', label: '🏆 Top Vets', emoji: '🏆' },
  ];

  const tabs = isAdmin ? [...USER_TABS, ...ADMIN_TABS] : USER_TABS;

  // Prepare bar chart data for animal types
  const animalBarData = animalData.slice(0, 6).length > 0 ? {
    labels: animalData.slice(0, 6).map(d => d.animal_type?.slice(0, 5) || '?'),
    datasets: [{ data: animalData.slice(0, 6).map(d => d.count) }],
  } : null;

  // Prepare bar chart data for reasons
  const reasonBarData = reasonData.slice(0, 6).length > 0 ? {
    labels: reasonData.slice(0, 6).map(d => (d.reason || '?').slice(0, 6)),
    datasets: [{ data: reasonData.slice(0, 6).map(d => d.count) }],
  } : null;

  // Prepare line chart for earnings
  const earningsLineData = earningsData.length > 0 ? {
    labels: earningsData.map(d => d.label),
    datasets: [{ data: earningsData.map(d => d.earnings || 0) }],
  } : null;

  // Prepare pie chart for user status
  const pieData = adminStatus ? [
    { name: `Activated`, population: adminStatus.activated || 0, color: C.primary, legendFontColor: C.text, legendFontSize: 12 },
    { name: `Trial`, population: adminStatus.trial || 0, color: C.warning, legendFontColor: C.text, legendFontSize: 12 },
    { name: `Suspended`, population: adminStatus.suspended || 0, color: C.error, legendFontColor: C.text, legendFontSize: 12 },
  ].filter(d => d.population > 0) : [];

  // Prepare bar chart for admin trend
  const trendBarData = adminTrend.length > 0 ? {
    labels: adminTrend.map(d => d.label),
    datasets: [{ data: adminTrend.map(d => d.count || 0) }],
  } : null;

  // Top performers bar data
  const performersBarData = topPerformers.length > 0 ? {
    labels: topPerformers.slice(0, 6).map(v => v.name?.split(' ')[0]?.slice(0, 6) || '?'),
    datasets: [{ data: topPerformers.slice(0, 6).map(v => v.total_cases || 0) }],
  } : null;

  const totalAnimal = animalData.reduce((s, d) => s + d.count, 0);
  const totalReason = reasonData.reduce((s, d) => s + d.count, 0);
  const totalEarnings = earningsData.reduce((s, d) => s + d.earnings, 0);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {/* Back */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>📈 Reports</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} testID={`report-tab-${t.key}`}
            style={[s.tab, activeTab === t.key && s.tabActive]}
            onPress={() => setActiveTab(t.key)}>
            <Text style={[s.tabText, activeTab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Period filter */}
      {!activeTab.startsWith('admin') && (
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

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {loading && !refreshing ? (
          <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
        ) : (
          <>
            {/* ──── ANIMAL TYPE ──── */}
            {activeTab === 'animal' && (
              <View>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{totalAnimal}</Text>
                  <Text style={s.summaryLabel}>Total Cases · {PERIODS.find(p => p.key === period)?.label}</Text>
                </View>
                {animalBarData ? (
                  <View style={s.chartCard}>
                    <Text style={s.chartTitle}>🐾 Cases by Animal Type</Text>
                    <BarChart
                      data={animalBarData}
                      width={chartWidth - 32}
                      height={220}
                      chartConfig={chartConfig}
                      style={s.chart}
                      showValuesOnTopOfBars
                      fromZero
                      yAxisLabel=""
                      yAxisSuffix=""
                    />
                  </View>
                ) : <View style={s.empty}><Text style={s.emptyText}>No data for this period</Text></View>}

                {/* Legend list */}
                {animalData.slice(0, 8).map((d, i) => (
                  <View key={i} style={s.legendRow}>
                    <View style={[s.legendDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                    <Text style={s.legendName}>{d.animal_type}</Text>
                    <Text style={s.legendCount}>{d.count} cases</Text>
                    <Text style={s.legendEarnings}>₹{d.earnings?.toLocaleString('en-IN') || 0}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ──── VISIT REASON ──── */}
            {activeTab === 'reason' && (
              <View>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{totalReason}</Text>
                  <Text style={s.summaryLabel}>Total Visits · {PERIODS.find(p => p.key === period)?.label}</Text>
                </View>
                {reasonBarData ? (
                  <View style={s.chartCard}>
                    <Text style={s.chartTitle}>🩺 Visits by Reason</Text>
                    <BarChart
                      data={reasonBarData}
                      width={chartWidth - 32}
                      height={220}
                      chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(21, 101, 192, ${opacity})` }}
                      style={s.chart}
                      showValuesOnTopOfBars
                      fromZero
                      yAxisLabel=""
                      yAxisSuffix=""
                    />
                  </View>
                ) : <View style={s.empty}><Text style={s.emptyText}>No data for this period</Text></View>}
                {reasonData.slice(0, 8).map((d, i) => (
                  <View key={i} style={s.legendRow}>
                    <View style={[s.legendDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                    <Text style={s.legendName}>{d.reason}</Text>
                    <Text style={s.legendCount}>{d.count} visits</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ──── EARNINGS TREND ──── */}
            {activeTab === 'earnings' && (
              <View>
                <View style={[s.summaryCard, { backgroundColor: '#1565C0' }]}>
                  <Text style={s.summaryNum}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
                  <Text style={s.summaryLabel}>Total Earnings · {PERIODS.find(p => p.key === period)?.label}</Text>
                </View>
                {earningsLineData && earningsLineData.datasets[0].data.some(v => v > 0) ? (
                  <View style={s.chartCard}>
                    <Text style={s.chartTitle}>💰 Earnings Trend (₹)</Text>
                    <LineChart
                      data={earningsLineData}
                      width={chartWidth - 32}
                      height={220}
                      chartConfig={earningsChartConfig}
                      style={s.chart}
                      bezier
                      fromZero
                      yAxisLabel="₹"
                      yAxisSuffix=""
                    />
                  </View>
                ) : (
                  <View style={s.empty}><Text style={s.emptyText}>No earnings recorded for this period</Text></View>
                )}
                {/* Cases per day summary */}
                {earningsData.length > 0 && (
                  <View style={s.chartCard}>
                    <Text style={s.chartTitle}>📋 Cases Count</Text>
                    <BarChart
                      data={{ labels: earningsData.map(d => d.label), datasets: [{ data: earningsData.map(d => d.cases || 0) }] }}
                      width={chartWidth - 32}
                      height={180}
                      chartConfig={chartConfig}
                      style={s.chart}
                      fromZero
                      showValuesOnTopOfBars
                      yAxisLabel=""
                      yAxisSuffix=""
                    />
                  </View>
                )}
              </View>
            )}

            {/* ──── ADMIN OVERVIEW ──── */}
            {activeTab === 'admin_overview' && adminStatus && (
              <View>
                {/* Stat cards */}
                <View style={s.statsGrid}>
                  {[
                    { label: 'Total Vets', value: adminStatus.total, color: C.primary },
                    { label: 'Activated', value: adminStatus.activated, color: C.primary },
                    { label: 'Trial', value: adminStatus.trial, color: C.warning },
                    { label: 'Suspended', value: adminStatus.suspended, color: C.error },
                  ].map(item => (
                    <View key={item.label} style={s.statCard}>
                      <Text style={[s.statNum, { color: item.color }]}>{item.value}</Text>
                      <Text style={s.statLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Pie Chart - User Status */}
                {pieData.length > 0 && (
                  <View style={s.chartCard}>
                    <Text style={s.chartTitle}>👥 User Status Distribution</Text>
                    <PieChart
                      data={pieData}
                      width={chartWidth - 32}
                      height={200}
                      chartConfig={chartConfig}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      style={s.chart}
                    />
                  </View>
                )}

                {/* Bar Chart - Daily Cases Trend (last 7 days) */}
                {trendBarData && (
                  <View style={s.chartCard}>
                    <Text style={s.chartTitle}>📊 Cases This Week</Text>
                    <BarChart
                      data={trendBarData}
                      width={chartWidth - 32}
                      height={200}
                      chartConfig={chartConfig}
                      style={s.chart}
                      showValuesOnTopOfBars
                      fromZero
                      yAxisLabel=""
                      yAxisSuffix=""
                    />
                  </View>
                )}
              </View>
            )}

            {/* ──── ADMIN TOP PERFORMERS ──── */}
            {activeTab === 'admin_performers' && (
              <View>
                {performersBarData ? (
                  <View style={s.chartCard}>
                    <Text style={s.chartTitle}>🏆 Top Vets by Cases</Text>
                    <BarChart
                      data={performersBarData}
                      width={chartWidth - 32}
                      height={240}
                      chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(106, 27, 154, ${opacity})` }}
                      style={s.chart}
                      showValuesOnTopOfBars
                      fromZero
                      yAxisLabel=""
                      yAxisSuffix=""
                    />
                  </View>
                ) : null}

                {/* Earnings bar chart */}
                {topPerformers.length > 0 && (
                  <View style={s.chartCard}>
                    <Text style={s.chartTitle}>💰 Top Vets by Earnings</Text>
                    <BarChart
                      data={{
                        labels: topPerformers.slice(0, 6).sort((a, b) => b.total_earnings - a.total_earnings).map(v => v.name?.split(' ')[0]?.slice(0, 6) || '?'),
                        datasets: [{ data: topPerformers.slice(0, 6).sort((a, b) => b.total_earnings - a.total_earnings).map(v => v.total_earnings || 0) }],
                      }}
                      width={chartWidth - 32}
                      height={220}
                      chartConfig={earningsChartConfig}
                      style={s.chart}
                      showValuesOnTopOfBars
                      fromZero
                      yAxisLabel="₹"
                      yAxisSuffix=""
                    />
                  </View>
                )}

                {/* Ranked list */}
                {topPerformers.map((v, i) => (
                  <View key={v.id} style={s.performerRow}>
                    <View style={[s.rankBadge, { backgroundColor: i < 3 ? '#FFF8E1' : C.fill }]}>
                      <Text style={[s.rankNum, { color: i < 3 ? '#F9A825' : C.sub }]}>#{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.perfName}>{v.name}</Text>
                      <Text style={s.perfMeta}>{v.district}, {v.state}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.perfCases}>{v.total_cases} cases</Text>
                      <Text style={s.perfEarnings}>₹{v.total_earnings?.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { paddingHorizontal: 4, minWidth: 60 },
  backText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: C.primary },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: C.text },
  tabBar: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 10, marginRight: 4, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.primary },
  tabText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: C.sub },
  tabTextActive: { fontFamily: 'Inter_700Bold', color: C.primary },
  periodRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: C.fill },
  periodBtnActive: { backgroundColor: C.primary },
  periodText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.sub },
  periodTextActive: { color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  center: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: C.muted },
  summaryCard: { backgroundColor: C.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 16 },
  summaryNum: { fontFamily: 'Inter_800ExtraBold', fontSize: 36, color: '#fff' },
  summaryLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  chartCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  chartTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: C.text, marginBottom: 12 },
  chart: { borderRadius: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: C.border },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.text, flex: 1 },
  legendCount: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.primary, marginRight: 8 },
  legendEarnings: { fontFamily: 'Inter_500Medium', fontSize: 12, color: C.sub },
  // Admin
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '47%', backgroundColor: C.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statNum: { fontFamily: 'Inter_800ExtraBold', fontSize: 28 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: C.sub, marginTop: 2 },
  performerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  rankBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  rankNum: { fontFamily: 'Inter_800ExtraBold', fontSize: 14 },
  perfName: { fontFamily: 'Inter_700Bold', fontSize: 14, color: C.text },
  perfMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: C.sub },
  perfCases: { fontFamily: 'Inter_700Bold', fontSize: 13, color: C.primary },
  perfEarnings: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#6A1B9A' },
});
