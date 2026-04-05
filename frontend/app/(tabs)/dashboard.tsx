import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
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
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Stats fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [token]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  const formatValue = (val: number, isMoney: boolean) => {
    if (isMoney) return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return val.toString();
  };

  if (authLoading || (!user)) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

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
          <View style={styles.headerRight}>
            <TouchableOpacity
              testID="logout-btn"
              style={styles.avatarBtn}
              onPress={handleLogout}
            >
              <Text style={styles.avatarEmoji}>🐾</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Practice info pill */}
        <View style={styles.locationPill}>
          <Text style={styles.locationText}>
            📍 {user.taluk}, {user.district}, {user.state}
          </Text>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Practice Overview</Text>
          <TouchableOpacity testID="refresh-stats-btn" onPress={onRefresh}>
            <Text style={styles.refreshText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Loading stats...</Text>
          </View>
        ) : (
          <View style={styles.grid} testID="stats-grid">
            {STAT_CARDS.map(card => (
              <View
                key={card.key}
                testID={`stat-card-${card.key}`}
                style={[styles.card, { backgroundColor: card.color }]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.emojiWrap}>
                    <Text style={styles.cardEmoji}>{card.emoji}</Text>
                  </View>
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
          <TouchableOpacity testID="new-case-btn" style={styles.actionBtn}>
            <Text style={styles.actionEmoji}>➕</Text>
            <Text style={styles.actionText}>New Case</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="appointments-btn" style={styles.actionBtn}>
            <Text style={styles.actionEmoji}>🗓️</Text>
            <Text style={styles.actionText}>Appointments</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="patients-btn" style={styles.actionBtn}>
            <Text style={styles.actionEmoji}>🐕</Text>
            <Text style={styles.actionText}>Patients</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="billing-btn" style={styles.actionBtn}>
            <Text style={styles.actionEmoji}>🧾</Text>
            <Text style={styles.actionText}>Billing</Text>
          </TouchableOpacity>
        </View>

        {/* Coming Soon banner */}
        <View style={styles.comingSoonBanner} testID="coming-soon-banner">
          <Text style={styles.comingSoonEmoji}>🚀</Text>
          <View>
            <Text style={styles.comingSoonTitle}>More Features Coming!</Text>
            <Text style={styles.comingSoonSubtitle}>Patient records, prescriptions & billing coming soon</Text>
          </View>
        </View>
      </ScrollView>
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
  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14, color: C.textSecondary },
  doctorName: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginTop: 2 },
  regNo: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  headerRight: {},
  avatarBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.textPrimary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatarEmoji: { fontSize: 24 },
  // Location pill
  locationPill: {
    marginHorizontal: 24, marginBottom: 20,
    backgroundColor: C.surfaceSecondary, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  locationText: { fontSize: 13, color: C.primary, fontWeight: '500' },
  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  refreshText: { fontSize: 14, color: C.primaryLight, fontWeight: '600' },
  // Loading
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: C.textSecondary },
  // Grid
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 12, marginBottom: 24,
  },
  card: {
    width: '47%', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    minHeight: 110,
  },
  cardTop: { marginBottom: 8 },
  emojiWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardEmoji: { fontSize: 20 },
  cardNumber: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  cardLabel: { fontSize: 13, fontWeight: '500', color: C.textSecondary, lineHeight: 18 },
  // Quick actions
  actionsRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 24,
  },
  actionBtn: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  actionEmoji: { fontSize: 24, marginBottom: 6 },
  actionText: { fontSize: 11, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },
  // Coming soon
  comingSoonBanner: {
    marginHorizontal: 16, backgroundColor: C.primary, borderRadius: 20,
    padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  comingSoonEmoji: { fontSize: 36 },
  comingSoonTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  comingSoonSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
});
