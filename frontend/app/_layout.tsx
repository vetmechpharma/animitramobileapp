import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Notifications only work on native (Android/iOS), not web
    if (Platform.OS === 'web') return;

    const setupNotifications = async () => {
      try {
        // Dynamic import to avoid web bundling crash
        const { registerForPushNotifications, scheduleDailyNotifications } =
          await import('../utils/notifications');
        const token = await registerForPushNotifications();
        if (token) {
          (global as any).__expoPushToken = token;
          await scheduleDailyNotifications();
        }
      } catch (e) {
        // Non-critical — app works perfectly without notifications
      }
    };

    setupNotifications();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="register" />
          <Stack.Screen name="activate" />
          <Stack.Screen name="profile-edit" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
