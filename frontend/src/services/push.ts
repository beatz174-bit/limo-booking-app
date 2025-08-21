import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export async function initPush() {
  const vapid = import.meta.env.VITE_FCM_VAPID_KEY;
  const apiKey = import.meta.env.VITE_FCM_API_KEY;
  const projectId = import.meta.env.VITE_FCM_PROJECT_ID;
  const appId = import.meta.env.VITE_FCM_APP_ID;
  const senderId = import.meta.env.VITE_FCM_SENDER_ID;
  if (!vapid || !apiKey || !('serviceWorker' in navigator)) return;

  const app = initializeApp({ apiKey, projectId, appId, messagingSenderId: senderId });
  const messaging = getMessaging(app);
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await Notification.requestPermission();
    await getToken(messaging, { vapidKey: vapid, serviceWorkerRegistration: registration });
    onMessage(messaging, (payload) => {
      console.log('FCM message', payload);
    });
  } catch (err) {
    console.warn('FCM init failed', err);
  }
}
