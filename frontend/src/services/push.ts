import OneSignal, { IInitObject, IOneSignalOneSignal } from 'react-onesignal';

import * as logger from '@/lib/logger';
import { apiFetch } from '@/services/apiFetch';
import { CONFIG } from '@/config';

let initPromise: Promise<IOneSignalOneSignal | null> | undefined;

const DEFAULT_SW_PATH = 'onesignal/OneSignalSDKWorker.js';
const DEFAULT_SW_UPDATER_PATH = 'onesignal/OneSignalSDKUpdaterWorker.js';

function ensureAbsolute(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function resolveServiceWorkerConfig(): {
  path: string;
  scope: string;
  updaterPath: string;
} {
  const configuredPath =
    import.meta.env.VITE_ONESIGNAL_SERVICE_WORKER_PATH ?? DEFAULT_SW_PATH;
  const path = ensureAbsolute(configuredPath);

  const scope = path.endsWith('/')
    ? path
    : path.slice(0, path.lastIndexOf('/') + 1) || '/';

  const configuredUpdater =
    import.meta.env.VITE_ONESIGNAL_SERVICE_WORKER_UPDATER_PATH;
  const derivedUpdaterPath = deriveUpdaterPath(path);
  const updaterPath = configuredUpdater
    ? ensureAbsolute(configuredUpdater)
    : derivedUpdaterPath ?? ensureAbsolute(DEFAULT_SW_UPDATER_PATH);

  return { path, scope, updaterPath };
}

function deriveUpdaterPath(workerPath: string): string | null {
  const replaced = workerPath.replace(
    /OneSignalSDKWorker\.js(\?.*)?$/i,
    'OneSignalSDKUpdaterWorker.js$1',
  );
  return replaced === workerPath ? null : replaced;
}

async function initOneSignal() {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId) {
    logger.warn('services/push', 'Missing OneSignal app ID');
    return null;
  }
  if (initPromise) return initPromise;

  logger.debug('services/push', 'Using OneSignal app ID', { appId });
  const {
    path: serviceWorkerPath,
    scope: serviceWorkerScope,
    updaterPath: serviceWorkerUpdaterPath,
  } = resolveServiceWorkerConfig();

  initPromise = (async () => {
    try {
      logger.debug('services/push', 'Initializing OneSignal', {
        serviceWorkerPath,
        serviceWorkerScope,
        serviceWorkerUpdaterPath,
      });

      const options: IInitObject = {
        appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath,
        serviceWorkerUpdaterPath,
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
