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
  if (!vapid || !apiKey || !('serviceWorker' in navigator)) return null;
  if (!messaging) {
    const app = initializeApp({ apiKey, projectId, appId, messagingSenderId: senderId });
    messaging = getMessaging(app);
  }
  return { messaging, vapid } as const;
}

export async function subscribePush(): Promise<string | null> {
  const config = getMessagingConfig();
  if (!config) return null;
  const { messaging, vapid } = config;
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const token = await getToken(messaging, {
      vapidKey: vapid,
      serviceWorkerRegistration: registration,
    });
    onMessage(messaging, (payload) => {
      logger.info('services/push', 'FCM message', payload);
    });
    return token;
  } catch (err) {
    logger.warn('services/push', 'FCM init failed', err);
    return null;
  }
}

export async function unsubscribePush(): Promise<void> {
  const config = getMessagingConfig();
  if (!config) return;
  const { messaging } = config;
  try {
    await deleteToken(messaging);
  } catch (err) {
    logger.warn('services/push', 'FCM delete failed', err);
  }
}
