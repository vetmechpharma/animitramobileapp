import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[s.wrap, focused && s.wrapActive]}>
      <Text style={[s.emoji, focused && s.emojiActive]}>{emoji}</Text>
      {focused && <Text style={s.label}>{label}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, minWidth: 44 },
  wrapActive: { backgroundColor: '#E8F5E9', borderRadius: 12 },
  emoji: { fontSize: 18 },
  emojiActive: { fontSize: 18 },
  label: { fontSize: 9, color: '#2E7D32', fontFamily: 'Inter_700Bold', marginTop: 1 },
});

export default function TabsLayout() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Proper height accounting for Android gesture navigation bar
  const tabBarPaddingBottom = Math.max(6, insets.bottom + 4);
  const tabBarHeight = (width < 380 ? 48 : 52) + insets.bottom;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopColor: '#D0E8D2',
        borderTopWidth: 1,
        height: tabBarHeight,
        paddingBottom: tabBarPaddingBottom,
        paddingTop: 5,
      },
      tabBarShowLabel: false,
    }}>
      <Tabs.Screen name="dashboard"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} /> }} />
      <Tabs.Screen name="cases"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Cases" focused={focused} /> }} />
      <Tabs.Screen name="ledger"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💳" label="Ledger" focused={focused} /> }} />
      <Tabs.Screen name="more"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="☰" label="More" focused={focused} /> }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="about"   options={{ href: null }} />
      <Tabs.Screen name="admin"   options={{ href: null }} />
    </Tabs>
  );
}
