import * as logger from '@/lib/logger';

interface OneSignalSDK {
  init(options: { appId: string; allowLocalhostAsSecureOrigin?: boolean }): Promise<void>;
  User: {
    pushSubscription: {
      id: Promise<string | null>;
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
    };
  };
}

declare global {
  interface Window {
    OneSignal?: OneSignalSDK;
  }
}

let initialized = false;

async function initOneSignal() {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId) {
    logger.warn('services/push', 'Missing OneSignal app ID');
    return null;
  }
  try {
    if (!initialized) {
      logger.debug('services/push', 'Loading OneSignal SDK');
      await import('https://cdn.onesignal.com/sdks/OneSignalSDK.js');
      await window.OneSignal?.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
      });
      initialized = true;
    }
    return window.OneSignal;
  } catch (err) {
    logger.error('services/push', 'OneSignal init failed', err);
    return null;
  }
}

export async function subscribePush(): Promise<string | null> {
  const os = await initOneSignal();
  if (!os) return null;
  try {
    await os.User.pushSubscription.optIn();
    const id = await os.User.pushSubscription.id;
    logger.info('services/push', 'OneSignal subscribed', { id });
    return id ?? null;
  } catch (err) {
    logger.error('services/push', 'OneSignal subscribe failed', err);
    return null;
  }
}

export async function unsubscribePush(): Promise<void> {
  const os = await initOneSignal();
  if (!os) return;
  try {
    await os.User.pushSubscription.optOut();
    logger.debug('services/push', 'OneSignal unsubscribed');
  } catch (err) {
    logger.warn('services/push', 'OneSignal unsubscribe failed', err);
  }
}

export async function refreshPushToken(): Promise<string | null> {
  const os = await initOneSignal();
  if (!os) return null;
  try {
    const id = await os.User.pushSubscription.id;
    return id ?? null;
  } catch (err) {
    logger.warn('services/push', 'OneSignal id retrieval failed', err);
    return null;
  }
}
