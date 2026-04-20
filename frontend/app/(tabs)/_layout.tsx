import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
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
  wrap: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4 },
  wrapActive: { backgroundColor: '#E8F5E9', borderRadius: 14 },
  emoji: { fontSize: 20 },
  label: { fontSize: 9, color: '#2E7D32', fontWeight: '700', marginTop: 1 },
});

export default function TabsLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#D4EAD6', height: 66, paddingBottom: 8, paddingTop: 6 },
      tabBarShowLabel: false,
    }}>
      <Tabs.Screen name="dashboard"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Home" focused={focused} /> }} />
      <Tabs.Screen name="cases"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Cases" focused={focused} /> }} />
      <Tabs.Screen name="ledger"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💳" label="Ledger" focused={focused} /> }} />
      <Tabs.Screen name="reports"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📈" label="Reports" focused={focused} /> }} />
      <Tabs.Screen name="about"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="ℹ️" label="About" focused={focused} /> }} />
      <Tabs.Screen name="admin"
        options={{
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="Admin" focused={focused} />,
        }} />
    </Tabs>
  );
}
