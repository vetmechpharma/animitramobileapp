/**
 * ANIMitra VET — Push Notification Utility
 * Handles: permissions, token registration, daily scheduled notifications
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Set how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Request permission and get Expo push token */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // Doesn't work in simulator

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Android needs notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'ANIMitra VET',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#006064',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('daily', {
      name: 'Daily Summary',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch (e) {
    console.warn('Push token error:', e);
    return null;
  }
}

/** Register push token with backend */
export async function savePushTokenToBackend(token: string, authToken: string) {
  try {
    await fetch(`${BACKEND_URL}/api/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token }),
    });
  } catch (e) {
    // Non-critical
  }
}

/** Schedule daily notifications (morning + evening) */
export async function scheduleDailyNotifications() {
  // Cancel existing scheduled notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Morning notification — 8:00 AM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌅 Good Morning, Doctor!',
      body: 'Check your cases for today. Tap to open ANIMitra VET.',
      channelId: 'daily',
      data: { screen: 'dashboard' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: 8,
      minute: 0,
      repeats: true,
    },
  });

  // Evening notification — 7:00 PM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Evening Summary',
      body: 'Review today\'s cases, earnings & pending payments.',
      channelId: 'daily',
      data: { screen: 'dashboard' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: 19,
      minute: 0,
      repeats: true,
    },
  });
}

/** Show immediate local notification (for testing or important events) */
export async function showLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, channelId: 'default', sound: 'default' },
    trigger: null,
  });
}
