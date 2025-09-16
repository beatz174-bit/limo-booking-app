import OneSignal, { IInitObject, IOneSignalOneSignal } from 'react-onesignal';

import * as logger from '@/lib/logger';
import { apiFetch } from '@/services/apiFetch';
import { CONFIG } from '@/config';

let initPromise: Promise<IOneSignalOneSignal | null> | undefined;

function resolveServiceWorkerPath(): { path: string; scope: string } {
  const configuredPath =
    import.meta.env.VITE_ONESIGNAL_SERVICE_WORKER_PATH ?? 'OneSignalSDK.sw.js';
  const path = configuredPath.startsWith('/')
    ? configuredPath
    : `/${configuredPath}`;
  if (path.endsWith('/')) {
    return { path, scope: path };
  }
  const scope = path.slice(0, path.lastIndexOf('/') + 1) || '/';
  return { path, scope };
}

async function initOneSignal() {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId) {
    logger.warn('services/push', 'Missing OneSignal app ID');
    return null;
  }
  if (initPromise) return initPromise;

  logger.debug('services/push', 'Using OneSignal app ID', { appId });
  const { path: serviceWorkerPath, scope: serviceWorkerScope } =
    resolveServiceWorkerPath();

  initPromise = (async () => {
    try {
      logger.debug('services/push', 'Initializing OneSignal', {
        serviceWorkerPath,
        serviceWorkerScope,
      });

      const options: IInitObject = {
        appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath,
        serviceWorkerUpdaterPath: serviceWorkerPath,
        serviceWorkerParam: { scope: serviceWorkerScope },
      };

      await OneSignal.init(options);

      logger.debug('services/push', 'OneSignal initialization complete');

      return OneSignal;
    } catch (err) {
      logger.error('services/push', 'OneSignal init failed', err);
      initPromise = undefined;
      return null;
    }
  })();
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
  const sdk = await initOneSignal();
  if (!sdk) {
    logger.warn('services/push', 'OneSignal SDK unavailable after init');
    return null;
  }
  const subscription = sdk.User.PushSubscription;
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
  const sdk = await initOneSignal();
  if (!sdk) {
    logger.warn('services/push', 'OneSignal SDK unavailable after init');
    return;
  }
  const subscription = sdk.User.PushSubscription;
  try {
    await subscription.optOut();
    logger.debug('services/push', 'OneSignal unsubscribed');
  } catch (err) {
    logger.warn('services/push', 'OneSignal unsubscribe failed', err);
  }
}

export async function refreshPushToken(): Promise<string | null> {
  if (!ensureAppId()) return null;
  const sdk = await initOneSignal();
  if (!sdk) {
    logger.warn('services/push', 'OneSignal SDK unavailable after init');
    return null;
  }
  const subscription = sdk.User.PushSubscription;
  try {
    const id = subscription.id;
    return id ?? null;
  } catch (err) {
    logger.warn('services/push', 'OneSignal id retrieval failed', err);
    return null;
  }
}
