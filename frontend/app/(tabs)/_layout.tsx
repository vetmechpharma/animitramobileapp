import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[s.wrap, focused && s.wrapActive]}>
      <Text style={s.emoji}>{emoji}</Text>
      {focused && <Text style={s.label}>{label}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, minWidth: 52 },
  wrapActive: { backgroundColor: '#E8F5E9', borderRadius: 16 },
  emoji: { fontSize: 22 },
  label: { fontSize: 9, color: '#2E7D32', fontWeight: '700', marginTop: 1 },
});

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const tabBarHeight = width < 380 ? 60 : 66;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopColor: '#D4EAD6',
        height: tabBarHeight,
        paddingBottom: 8,
        paddingTop: 6,
      },
      tabBarShowLabel: false,
    }}>
      {/* ── 4 visible tabs ── */}
      <Tabs.Screen name="dashboard"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} /> }} />
      <Tabs.Screen name="cases"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Cases" focused={focused} /> }} />
      <Tabs.Screen name="ledger"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💳" label="Ledger" focused={focused} /> }} />
      <Tabs.Screen name="more"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="☰" label="More" focused={focused} /> }} />

      {/* ── Hidden screens (accessible via More) ── */}
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="about"   options={{ href: null }} />
      <Tabs.Screen name="admin"   options={{ href: null }} />
    </Tabs>
  );
}
