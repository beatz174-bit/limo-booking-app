import { initializeApp } from 'firebase/app';
import { deleteToken, getMessaging, getToken, onMessage } from 'firebase/messaging';
import * as logger from '@/lib/logger';

let messaging: ReturnType<typeof getMessaging> | null = null;

function getMessagingConfig() {
  const vapid = import.meta.env.VITE_FCM_VAPID_KEY;
  const apiKey = import.meta.env.VITE_FCM_API_KEY;
  const projectId = import.meta.env.VITE_FCM_PROJECT_ID;
  const appId = import.meta.env.VITE_FCM_APP_ID;
  const senderId = import.meta.env.VITE_FCM_SENDER_ID;

  logger.debug('services/push', 'FCM configuration', {
    vapid,
    apiKey,
    projectId,
    appId,
    senderId,
  });

  if (!vapid || !apiKey || !projectId || !appId || !senderId) {
    logger.warn('services/push', 'Missing FCM configuration');
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    logger.warn('services/push', 'Service worker not supported');
    return null;
  }

  if (!messaging) {
    logger.debug('services/push', 'Initializing Firebase messaging');
    const app = initializeApp({
      apiKey,
      projectId,
      appId,
      messagingSenderId: senderId,
    });
    messaging = getMessaging(app);
  }
  return { messaging, vapid } as const;
}

export async function subscribePush(): Promise<string | null> {
  const config = getMessagingConfig();
  if (!config) return null;
  const { messaging, vapid } = config;
  try {
    logger.debug('services/push', 'Registering service worker');
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
    );
    logger.debug('services/push', 'Requesting notification permission');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      logger.debug('services/push', 'Notification permission not granted');
      return null;
    }
    logger.debug('services/push', 'Acquiring FCM token');
    const token = await getToken(messaging, {
      vapidKey: vapid,
      serviceWorkerRegistration: registration,
    });
    logger.info('services/push', 'FCM token acquired', { token });
    logger.debug('services/push', 'Listening for foreground messages');
    onMessage(messaging, (payload) => {
      logger.info('services/push', 'FCM message', payload);
    });
    return token;
  } catch (err) {
    logger.error('services/push', 'FCM init failed', err);
    return null;
  }
}

export async function unsubscribePush(): Promise<void> {
  const config = getMessagingConfig();
  if (!config) return;
  const { messaging } = config;
  try {
    logger.debug('services/push', 'Unsubscribing from push');
    await deleteToken(messaging);
    logger.debug('services/push', 'FCM token deleted');
  } catch (err) {
    logger.warn('services/push', 'FCM delete failed', err);
  }
}
