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
    __oneSignalInitPromise?: Promise<OneSignalSDK | null>;
  }
}

let initialized = !!window.OneSignal;
let initPromise: Promise<OneSignalSDK | null> | undefined =
  window.__oneSignalInitPromise;

async function initOneSignal() {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId) {
    logger.warn('services/push', 'Missing OneSignal app ID');
    return null;
  }
  logger.debug('services/push', 'Using OneSignal app ID', { appId });
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!window.OneSignal) {
        logger.debug('services/push', 'Loading OneSignal SDK');
        await import('https://cdn.onesignal.com/sdks/OneSignalSDK.js');
      }
      if (!initialized) {
        await window.OneSignal?.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
        });
        initialized = true;
      }
      return window.OneSignal ?? null;
    } catch (err) {
      logger.error('services/push', 'OneSignal init failed', err);
      return null;
    }
  })();

  window.__oneSignalInitPromise = initPromise;
  return initPromise;
}

function ensureAppId(): boolean {
  if (!import.meta.env.VITE_ONESIGNAL_APP_ID) {
    logger.warn(
      'services/push',
      'VITE_ONESIGNAL_APP_ID is not set; push notifications are disabled',
    );
    return false;
  }
  return true;
}

export async function subscribePush(): Promise<string | null> {
  if (!ensureAppId()) return null;
  const os = await initOneSignal();
  if (!os?.User?.pushSubscription) {
    logger.warn(
      'services/push',
      'OneSignal pushSubscription not available. Verify VITE_ONESIGNAL_APP_ID and browser push support',
    );
    return null;
  }
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
  if (!ensureAppId()) return;
  const os = await initOneSignal();
  if (!os?.User?.pushSubscription) {
    logger.warn(
      'services/push',
      'OneSignal pushSubscription not available. Verify VITE_ONESIGNAL_APP_ID and browser push support',
    );
    return;
  }
  try {
    await os.User.pushSubscription.optOut();
    logger.debug('services/push', 'OneSignal unsubscribed');
  } catch (err) {
    logger.warn('services/push', 'OneSignal unsubscribe failed', err);
  }
}

export async function refreshPushToken(): Promise<string | null> {
  if (!ensureAppId()) return null;
  const os = await initOneSignal();
  if (!os?.User?.pushSubscription) {
    logger.warn(
      'services/push',
      'OneSignal pushSubscription not available. Verify VITE_ONESIGNAL_APP_ID and browser push support',
    );
    return null;
  }
  try {
    const id = await os.User.pushSubscription.id;
    return id ?? null;
  } catch (err) {
    logger.warn('services/push', 'OneSignal id retrieval failed', err);
    return null;
  }
}
