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

type OneSignalDeferredCallback = (
  sdk: OneSignalSDK,
) => void | Promise<void>;

declare global {
  interface Window {
    OneSignal?: OneSignalSDK;
    OneSignalDeferred?: OneSignalDeferredCallback[];
    __oneSignalInitPromise?: Promise<OneSignalSDK | null>;
  }
}

if (typeof window !== 'undefined') {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
}

let initialized = false;
let initPromise: Promise<OneSignalSDK | null> | undefined =
  window.__oneSignalInitPromise;
let storedExternalId: string | null = null;

const EXTERNAL_ID_STORAGE_KEYS = ['onesignal_external_id', 'onesignalExternalId'];

type SubscriptionChangeListener = (id: string | null) => void;

let subscriptionListeners: SubscriptionChangeListener[] = [];
let subscriptionListenerAttached = false;
let removeSubscriptionChangeHandler: (() => void) | undefined;

async function relinkStoredExternalId(
  sdk: OneSignalSDK | null | undefined,
  {
    successMessage,
    failureMessage,
  }: { successMessage: string; failureMessage: string },
) {
  if (!sdk || typeof sdk.login !== 'function') return;

  const externalId = storedExternalId ?? getStoredExternalId();
  if (!externalId) return;

  try {
    storedExternalId = externalId;
    await sdk.login(externalId);
    logger.debug('services/push', successMessage, { externalId });
  } catch (err) {
    logger.error('services/push', failureMessage, err);
  }
}

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

    await relinkStoredExternalId(sdk, {
      successMessage: 'Re-linked external ID after change',
      failureMessage: 'Re-linking external ID failed',
    });

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

  initPromise = new Promise<OneSignalSDK | null>((resolve) => {
    const queue = window.OneSignalDeferred;
    if (!queue) {
      logger.error('services/push', 'OneSignalDeferred queue unavailable');
      resolve(null);
      return;
    }

    const callback: OneSignalDeferredCallback = async (sdk) => {
      try {
        if (!sdk || typeof sdk.init !== 'function') {
          logger.error('services/push', 'OneSignal SDK unavailable during init');
          resolve(null);
          return;
        }

        if (!initialized) {
          logger.debug('services/push', 'Initializing OneSignal');
          await sdk.init({
            appId,
            allowLocalhostAsSecureOrigin: true,
          });
          logger.debug('services/push', 'OneSignal initialization complete');
          initialized = true;
        }

        const status = window.OneSignal ?? sdk ?? null;
        logger.debug('services/push', 'OneSignal resolved', {
          available: !!status,
        });

        registerPushSubscriptionChangeHandler(status);
        await relinkStoredExternalId(status, {
          successMessage: 'Re-linked external ID after init',
          failureMessage: 'Re-linking external ID after init failed',
        });

        resolve(status);
      } catch (err) {
        logger.error('services/push', 'OneSignal init failed', err);
        resolve(null);
      }
    };

    queue.push(callback);

    if (window.OneSignal && queue.push === Array.prototype.push) {
      void callback(window.OneSignal);
    }
  });

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

export async function subscribePush(
  externalId?: string | null,
): Promise<string | null> {
  if (typeof externalId === 'string') {
    const normalized = externalId.trim();
    storedExternalId = normalized ? normalized : null;
  } else if (externalId === null) {
    storedExternalId = null;
  }
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
  const subscription = user.PushSubscription ?? user.pushSubscription;
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

    const effectiveExternalId = storedExternalId;
    if (effectiveExternalId && os?.login) {
      try {
        logger.debug('services/push', 'Logging into OneSignal', {
          externalId: effectiveExternalId,
        });
        await os.login(effectiveExternalId);
        logger.debug('services/push', 'OneSignal login complete');
      } catch (err) {
        logger.warn('services/push', 'OneSignal login failed', err);
      }
    }

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

export async function logoutPushUser(): Promise<void> {
  storedExternalId = null;
  if (!ensureAppId()) return;
  const os = await initOneSignal();
  if (!os) return;
  if (!os.logout) {
    logger.debug('services/push', 'OneSignal logout not available on SDK');
    return;
  }
  try {
    logger.debug('services/push', 'Calling OneSignal logout');
    await os.logout();
    logger.debug('services/push', 'OneSignal logout resolved');
  } catch (err) {
    logger.warn('services/push', 'OneSignal logout failed', err);
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
  const subscription = user.PushSubscription ?? user.pushSubscription;
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
  const subscription = user.PushSubscription ?? user.pushSubscription;
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
