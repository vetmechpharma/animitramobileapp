import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[s.wrap, focused && s.wrapActive]}>
      <Text style={s.emoji}>{emoji}</Text>
      {focused && <Text style={s.label}>{label}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  wrapActive: { backgroundColor: '#E8F5E9', borderRadius: 16 },
  emoji: { fontSize: 22 },
  label: { fontSize: 9, color: '#2E7D32', fontWeight: '700', marginTop: 1 },
});

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E0E8E1', height: 66, paddingBottom: 8, paddingTop: 6 },
      tabBarShowLabel: false,
    }}>
      <Tabs.Screen name="dashboard"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Dashboard" focused={focused} /> }} />
      <Tabs.Screen name="cases"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Cases" focused={focused} /> }} />
      <Tabs.Screen name="ledger"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💳" label="Ledger" focused={focused} /> }} />
    </Tabs>
  );
}
