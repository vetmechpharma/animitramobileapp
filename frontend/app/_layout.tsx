import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { useEffect, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  registerForPushNotifications,
  scheduleDailyNotifications,
} from '../utils/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const notifListener = useRef<any>();

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
    // Set up notifications on app start
    const setupNotifications = async () => {
      try {
        const token = await registerForPushNotifications();
        if (token) {
          // Store token globally so AuthContext can use it
          (global as any).__expoPushToken = token;
          // Schedule daily morning + evening notifications
          await scheduleDailyNotifications();
        }
      } catch (e) {
        // Non-critical — app works without notifications
      }
    };
    setupNotifications();

    // Listen for notification taps (when app is in background/closed)
    notifListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Could navigate to specific screen based on data.screen
      console.log('Notification tapped:', data);
    });

    return () => {
      if (notifListener.current) {
        Notifications.removeNotificationSubscription(notifListener.current);
      }
    };
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="register" />
          <Stack.Screen name="activate" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
