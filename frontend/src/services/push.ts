import * as logger from '@/lib/logger';
import { apiFetch } from '@/services/apiFetch';
import { CONFIG } from '@/config';

interface OneSignalSDK {
  init(options: { appId: string; allowLocalhostAsSecureOrigin?: boolean }): Promise<void>;
  User?: {
    pushSubscription: {
      id: string | null | undefined;
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

let initialized = false;
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
        logger.debug('services/push', 'OneSignal SDK loaded');
      }
      if (!initialized) {
        logger.debug('services/push', 'Initializing OneSignal');
        await window.OneSignal?.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
        });
        logger.debug('services/push', 'OneSignal initialization complete');
        initialized = true;
      }
      const status = window.OneSignal ?? null;
      logger.debug('services/push', 'OneSignal resolved', {
        available: !!status,
      });
      return status;
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
  const user = os?.User;
  if (!user) {
    logger.warn(
      'services/push',
      'OneSignal SDK initialized but no User object; check browser storage/permission settings',
    );
    return null;
  }
  const subscription = user.pushSubscription;
  if (!subscription) {
    logger.warn(
      'services/push',
      'OneSignal pushSubscription not available. Verify VITE_ONESIGNAL_APP_ID and browser push support',
    );
    return null;
  }
  try {
    logger.debug('services/push', 'Calling pushSubscription.optIn');
    await subscription.optIn();
    logger.debug('services/push', 'pushSubscription.optIn resolved');

    const id = subscription.id;
    logger.debug('services/push', 'Subscription object', {
      id,
      hasOptIn: typeof subscription.optIn === 'function',
      hasOptOut: typeof subscription.optOut === 'function',
    });
    logger.info('services/push', 'OneSignal subscribed', { id });

    if (id) {
      const base = CONFIG.API_BASE_URL ?? '';
      const url = `${base}/users/me`;
      try {
        logger.debug('services/push', 'Persisting push ID', { url, id });
        const res = await apiFetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ onesignal_player_id: id }),
        });
        logger.debug('services/push', 'Persisted push ID', { status: res.status });
      } catch (err) {
        logger.error('services/push', 'Persisting push ID failed', err);
      }
    }

    return id ?? null;
  } catch (err) {
    logger.error('services/push', 'OneSignal subscribe failed', err);
    return null;
  }
}

export async function unsubscribePush(): Promise<void> {
  if (!ensureAppId()) return;
  const os = await initOneSignal();
  const user = os?.User;
  if (!user) {
    logger.warn(
      'services/push',
      'OneSignal SDK initialized but no User object; check browser storage/permission settings',
    );
    return;
  }
  const subscription = user.pushSubscription;
  if (!subscription) {
    logger.warn(
      'services/push',
      'OneSignal pushSubscription not available. Verify VITE_ONESIGNAL_APP_ID and browser push support',
    );
    return;
  }
  try {
    await subscription.optOut();
    logger.debug('services/push', 'OneSignal unsubscribed');
  } catch (err) {
    logger.warn('services/push', 'OneSignal unsubscribe failed', err);
  }
}

export async function refreshPushToken(): Promise<string | null> {
  if (!ensureAppId()) return null;
  const os = await initOneSignal();
  const user = os?.User;
  if (!user) {
    logger.warn(
      'services/push',
      'OneSignal SDK initialized but no User object; check browser storage/permission settings',
    );
    return null;
  }
  const subscription = user.pushSubscription;
  if (!subscription) {
    logger.warn(
      'services/push',
      'OneSignal pushSubscription not available. Verify VITE_ONESIGNAL_APP_ID and browser push support',
    );
    return null;
  }
  try {
    const id = subscription.id;
    return id ?? null;
  } catch (err) {
    logger.warn('services/push', 'OneSignal id retrieval failed', err);
    return null;
  }
}
