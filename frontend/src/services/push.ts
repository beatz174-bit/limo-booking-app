import * as logger from '@/lib/logger';
import { apiFetch } from '@/services/apiFetch';
import { CONFIG } from '@/config';

interface OneSignalPushSubscription {
  id: string | null | undefined;
  optIn: () => Promise<void>;
  optOut: () => Promise<void>;
  addEventListener?: (
    event: 'change',
    handler: (event?: unknown) => void | Promise<void>,
  ) => void;
  removeEventListener?: (
    event: 'change',
    handler: (event?: unknown) => void | Promise<void>,
  ) => void;
}

interface OneSignalSDK {
  init(options: { appId: string; allowLocalhostAsSecureOrigin?: boolean }): Promise<void>;
  login?: (externalId: string) => Promise<void>;
  User?: {
    PushSubscription?: OneSignalPushSubscription;
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

const EXTERNAL_ID_STORAGE_KEYS = ['onesignal_external_id', 'onesignalExternalId'];

type SubscriptionChangeListener = (id: string | null) => void;

let subscriptionListeners: SubscriptionChangeListener[] = [];
let subscriptionListenerAttached = false;
let removeSubscriptionChangeHandler: (() => void) | undefined;

function emitSubscriptionChange(id: string | null) {
  subscriptionListeners.forEach((listener) => {
    try {
      listener(id);
    } catch (err) {
      logger.error('services/push', 'Push subscription listener failed', err);
    }
  });
}

export function onPushSubscriptionChange(listener: SubscriptionChangeListener) {
  subscriptionListeners.push(listener);
  return () => {
    subscriptionListeners = subscriptionListeners.filter((fn) => fn !== listener);
  };
}

function getStoredExternalId(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  for (const key of EXTERNAL_ID_STORAGE_KEYS) {
    try {
      const value = window.localStorage.getItem(key);
      if (value) {
        return value;
      }
    } catch (err) {
      logger.debug('services/push', 'Reading external ID failed', { key }, err);
    }
  }
  return null;
}

function registerPushSubscriptionChangeHandler(
  sdk: OneSignalSDK | null | undefined,
) {
  if (!sdk || subscriptionListenerAttached) return;

  const subscription = sdk.User?.PushSubscription;
  if (!subscription || typeof subscription.addEventListener !== 'function') {
    logger.debug(
      'services/push',
      'OneSignal pushSubscription change events unavailable',
    );
    return;
  }

  const handler = async () => {
    const currentId = sdk.User?.PushSubscription?.id ?? null;
    logger.debug('services/push', 'Push subscription changed', { id: currentId });

    const base = CONFIG.API_BASE_URL ?? '';
    const url = `${base}/users/me`;
    try {
      await apiFetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onesignal_player_id: currentId }),
      });
      logger.debug('services/push', 'Persisted push ID after change', {
        id: currentId,
      });
    } catch (err) {
      logger.error('services/push', 'Persisting push ID after change failed', err);
    }

    const externalId = getStoredExternalId();
    if (externalId && typeof sdk.login === 'function') {
      try {
        await sdk.login(externalId);
        logger.debug('services/push', 'Re-linked external ID after change', {
          externalId,
        });
      } catch (err) {
        logger.error('services/push', 'Re-linking external ID failed', err);
      }
    }

    emitSubscriptionChange(currentId);
  };

  subscription.addEventListener('change', handler);
  subscriptionListenerAttached = true;
  removeSubscriptionChangeHandler = () => {
    subscription.removeEventListener?.('change', handler);
    subscriptionListenerAttached = false;
  };
}

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
        await import('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.js');
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
      registerPushSubscriptionChangeHandler(status);
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
  registerPushSubscriptionChangeHandler(os);
  const user = os?.User;
  if (!user) {
    logger.warn(
      'services/push',
      'OneSignal SDK initialized but no User object; check browser storage/permission settings',
    );
    return null;
  }
  const subscription = user.PushSubscription;
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
  registerPushSubscriptionChangeHandler(os);
  const user = os?.User;
  if (!user) {
    logger.warn(
      'services/push',
      'OneSignal SDK initialized but no User object; check browser storage/permission settings',
    );
    return;
  }
  const subscription = user.PushSubscription;
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
  registerPushSubscriptionChangeHandler(os);
  const user = os?.User;
  if (!user) {
    logger.warn(
      'services/push',
      'OneSignal SDK initialized but no User object; check browser storage/permission settings',
    );
    return null;
  }
  const subscription = user.PushSubscription;
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

export function teardownPushListeners() {
  if (removeSubscriptionChangeHandler) {
    try {
      removeSubscriptionChangeHandler();
    } catch (err) {
      logger.warn('services/push', 'Removing push listener failed', err);
    } finally {
      removeSubscriptionChangeHandler = undefined;
    }
  }
  subscriptionListenerAttached = false;
  subscriptionListeners = [];
}

export function __resetPushListenersForTests() {
  teardownPushListeners();
  initialized = false;
  initPromise = undefined;
  window.__oneSignalInitPromise = undefined;
}
