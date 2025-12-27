import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {Platform} from 'react-native';
import {notificationsApi} from '../services/api/notificationsApi';
import {toast} from '../stores/toastStore';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let pushToken: string | null = null;

/**
 * Register for push notifications and get token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[PushNotifications] Not a physical device, skipping');
    return null;
  }

  try {
    const {status: existingStatus} = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const {status} = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '9f0c850b-710f-4a44-8305-6996e335f738', // From app.json
    });

    pushToken = tokenData.data;
    console.log('[PushNotifications] Token:', pushToken);

    // Register token with backend
    try {
      await notificationsApi.registerPushToken(pushToken);
      console.log('[PushNotifications] Token registered with backend');
    } catch (error) {
      console.error('[PushNotifications] Failed to register token:', error);
    }

    return pushToken;
  } catch (error) {
    console.error('[PushNotifications] Error registering:', error);
    return null;
  }
}

/**
 * Get current push token
 */
export function getPushToken(): string | null {
  return pushToken;
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) {
  // Foreground notification handler
  const receivedListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('[PushNotifications] Notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Background/foreground notification tap handler
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('[PushNotifications] Notification tapped:', response);
    if (onNotificationTapped) {
      onNotificationTapped(response);
    }
  });

  return () => {
    receivedListener.remove();
    responseListener.remove();
  };
}

/**
 * Clear notification badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}



