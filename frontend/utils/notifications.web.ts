/**
 * Web stub — expo-notifications not supported on web
 * Metro automatically loads this file on web, .native.ts on iOS/Android
 */

export async function registerForPushNotifications(): Promise<string | null> {
  return null; // Not supported on web
}

export async function savePushTokenToBackend(_token: string, _authToken: string) {
  // Not needed on web
}

export async function scheduleDailyNotifications() {
  // Not supported on web
}

export async function showLocalNotification(_title: string, _body: string) {
  // Could use browser Notification API here if needed
  console.log(`[Web notification] ${_title}: ${_body}`);
}
