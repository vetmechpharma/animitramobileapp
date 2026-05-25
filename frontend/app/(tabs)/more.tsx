import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, useWindowDimensions, Linking, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const C = {
  primary: '#2E7D32', bg: '#F6FBF6', surface: '#FFFFFF', fill: '#EDF7EE',
  secondary: '#E8F5E9', text: '#0A1F10', sub: '#5A7060', border: '#D4EAD6',
  error: '#C62828', warning: '#E65100',
};

interface MenuItem {
  testID: string;
  emoji: string;
  label: string;
  sub: string;
  route?: string;
  onPress?: () => void;
  admin?: boolean;
  danger?: boolean;
}

export default function MoreScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isAdmin = user?.role === 'admin';
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (token) fetchQuickStats();
  }, [token]);

  const fetchQuickStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      setTodayCount(d.today_cases || 0);
      setTotalCount(d.total_cases || 0);
    } catch (e) {}
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/'); },
      },
    ]);
  };

  const handleExportClients = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/export/my-clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const csv = await res.text();
      await Share.share({
        message: csv,
        title: `${user?.name} - Client Data Export`,
      });
    } catch (e) {
      Alert.alert('Error', 'Could not export data. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This will permanently delete ALL your cases, payments, and account data. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything', style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/users/me`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              await logout();
              router.replace('/');
            } catch (e) {
              Alert.alert('Error', 'Could not delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'TOOLS',
      items: [
        { testID: 'more-reports', emoji: '📈', label: 'Reports & Analytics', sub: 'Animal-wise, visit-wise, forwards', route: '/(tabs)/reports' },
        { testID: 'more-export', emoji: '📊', label: 'Export My Clients', sub: 'Download client data as CSV, share WhatsApp', onPress: handleExportClients },
        { testID: 'more-about', emoji: 'ℹ️', label: 'About ANIMitraVET', sub: 'Features, T&C, support contact', route: '/(tabs)/about' },
      ],
    },
    ...(isAdmin ? [{
      title: 'ADMIN',
      items: [
        { testID: 'more-admin', emoji: '⚙️', label: 'Admin Panel', sub: 'Users, coupons, payments, export', route: '/(tabs)/admin', admin: true },
      ],
    }] : []),
    {
      title: 'ACCOUNT',
      items: [
        { testID: 'more-support', emoji: '📞', label: 'Support', sub: '+91 94865 44884 · Mon-Sat 9AM-6PM', onPress: () => Linking.openURL('tel:+919486544884') },
        { testID: 'more-logout', emoji: '🚪', label: 'Logout', sub: 'Sign out from this device', onPress: handleLogout, danger: true },
        // Delete Account — only for regular vets, NOT for admin
        ...(!isAdmin ? [{ testID: 'more-delete-account', emoji: '🗑️', label: 'Delete Account', sub: 'Delete all your data permanently', onPress: handleDeleteAccount, danger: true } as MenuItem] : []),
      ],
    },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.content, { paddingHorizontal: Math.max(16, (width - 500) / 2) }]}
        showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarEmoji}>🐾</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.docName} numberOfLines={1}>Dr. {user?.name}</Text>
            <Text style={s.docReg}>{user?.reg_no}</Text>
            <Text style={s.docLoc} numberOfLines={1}>📍 {user?.taluk}, {user?.district}</Text>
          </View>
          {isAdmin && (
            <View style={s.adminBadge}>
              <Text style={s.adminBadgeText}>ADMIN</Text>
            </View>
          )}
        </View>

        {/* Quick stats strip */}
        <View style={s.statsStrip}>
          <View style={s.statPill}>
            <Text style={s.statPillNum}>{todayCount}</Text>
            <Text style={s.statPillLabel}>Today</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statPill}>
            <Text style={s.statPillNum}>{totalCount}</Text>
            <Text style={s.statPillLabel}>Total Cases</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statPill}>
            <Text style={s.statPillNum}>₹200</Text>
            <Text style={s.statPillLabel}>Lifetime</Text>
          </View>
        </View>

        {/* Menu sections */}
        {sections.map(section => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionLabel}>{section.title}</Text>
            <View style={s.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.testID}
                  testID={item.testID}
                  activeOpacity={0.7}
                  style={[
                    s.menuItem,
                    idx < section.items.length - 1 && s.menuItemBorder,
                  ]}
                  onPress={() => {
                    if (item.onPress) { item.onPress(); }
                    else if (item.route) { router.push(item.route as any); }
                  }}
                >
                  <View style={[s.menuIconWrap, item.admin && s.menuIconAdmin, item.danger && s.menuIconDanger]}>
                    <Text style={s.menuEmoji}>{item.emoji}</Text>
                  </View>
                  <View style={s.menuTextWrap}>
                    <Text style={[s.menuLabel, item.danger && s.menuLabelDanger]}>{item.label}</Text>
                    <Text style={s.menuSub} numberOfLines={1}>{item.sub}</Text>
                  </View>
                  <Text style={[s.menuArrow, item.danger && { color: C.error }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* App version */}
        <View style={s.footer}>
          <Text style={s.footerEmoji}>🐾</Text>
          <Text style={s.footerName}>Animitra</Text>
          <Text style={s.footerVersion}>Version 1.0.0 · Veterinary Practice Manager</Text>
          <Text style={s.footerCopy}>© 2026 Animitra. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: 16, paddingBottom: 40 },
  // Profile card
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.primary, borderRadius: 24, padding: 14, marginBottom: 12,
  },
  avatarCircle: {
    width: 56, height: 44, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 13 },
  docName: { fontSize: 13, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: '#fff' },
  docReg: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  docLoc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  adminBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  adminBadgeText: { fontSize: 10, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: '#fff' },
  // Stats strip
  statsStrip: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 20, alignItems: 'center', justifyContent: 'space-around',
  },
  statPill: { alignItems: 'center', flex: 1 },
  statPillNum: { fontSize: 13, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.primary },
  statPillLabel: { fontSize: 11, color: C.sub, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: C.border },
  // Menu sections
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.sub, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionCard: {
    backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden',
    boxShadow: '0px 2px 10px rgba(46,125,50,0.07)',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  menuIconWrap: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: C.fill,
    justifyContent: 'center', alignItems: 'center',
  },
  menuIconAdmin: { backgroundColor: '#E3F2FD' },
  menuIconDanger: { backgroundColor: '#FFEBEE' },
  menuEmoji: { fontSize: 14 },
  menuTextWrap: { flex: 1 },
  menuLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.text },
  menuLabelDanger: { color: C.error },
  menuSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  menuArrow: { fontSize: 13, color: C.sub, fontWeight: '300' },
  // Footer
  footer: { alignItems: 'center', paddingTop: 24, gap: 4 },
  footerEmoji: { fontSize: 13, marginBottom: 4 },
  footerName: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.primary },
  footerVersion: { fontSize: 12, color: C.sub },
  footerCopy: { fontSize: 11, color: C.sub },
});
