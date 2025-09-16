import { describe, it, expect, beforeEach, vi } from 'vitest';

const initMock = vi.fn();
const optInMock = vi.fn();
const optOutMock = vi.fn();
const pushSubscription = {
  id: 'player-id',
  optIn: optInMock,
  optOut: optOutMock,
};

vi.mock('react-onesignal', () => ({
  __esModule: true,
  default: {
    init: initMock,
    User: {
      PushSubscription: pushSubscription,
    },
  },
}));

const apiFetchMock = vi.fn();
vi.mock('@/services/apiFetch', () => ({
  __esModule: true,
  apiFetch: apiFetchMock,
}));

vi.mock('@/lib/logger', () => ({
  __esModule: true,
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('services/push subscribePush', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    pushSubscription.id = 'player-id';
    initMock.mockResolvedValue(undefined);
    optInMock.mockResolvedValue(undefined);
    optOutMock.mockResolvedValue(undefined);
    apiFetchMock.mockResolvedValue({ ok: true, status: 204 } as Response);
  });

  it('returns null and skips init when app id is missing', async () => {
    const { subscribePush } = await import('./push');

    const result = await subscribePush();

    expect(result).toBeNull();
    expect(initMock).not.toHaveBeenCalled();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('initializes OneSignal with default worker paths and persists the player id', async () => {
    vi.stubEnv('VITE_ONESIGNAL_APP_ID', 'test-app');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    const { subscribePush } = await import('./push');

    const result = await subscribePush();

    expect(initMock).toHaveBeenCalledTimes(1);
    const options = initMock.mock.calls[0][0] as Record<string, unknown>;
    expect(options).toMatchObject({
      appId: 'test-app',
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/onesignal/OneSignalSDKWorker.js',
      serviceWorkerUpdaterPath: '/onesignal/OneSignalSDKUpdaterWorker.js',
      serviceWorkerParam: { scope: '/onesignal/' },
    });
    expect(optInMock).toHaveBeenCalledTimes(1);
    expect(result).toBe('player-id');
    expect(apiFetchMock).toHaveBeenCalledWith('https://api.example.com/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onesignal_player_id: 'player-id' }),
    });
  });

  it('uses configured worker paths and scope when provided', async () => {
    vi.stubEnv('VITE_ONESIGNAL_APP_ID', 'custom-app');
    vi.stubEnv('VITE_ONESIGNAL_SERVICE_WORKER_PATH', 'custom/sw.js');
    vi.stubEnv('VITE_ONESIGNAL_SERVICE_WORKER_UPDATER_PATH', '/alt/updater.js');
    const { subscribePush } = await import('./push');

    await subscribePush();

    const options = initMock.mock.calls[0][0] as Record<string, unknown>;
    expect(options).toMatchObject({
      serviceWorkerPath: '/custom/sw.js',
      serviceWorkerUpdaterPath: '/alt/updater.js',
      serviceWorkerParam: { scope: '/custom/' },
    });
  });

  it('reuses the existing OneSignal instance on subsequent subscriptions', async () => {
    vi.stubEnv('VITE_ONESIGNAL_APP_ID', 'reuse-app');
    const { subscribePush } = await import('./push');

    pushSubscription.id = 'first-player';
    await subscribePush();

    pushSubscription.id = 'second-player';
    const second = await subscribePush();

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(optInMock).toHaveBeenCalledTimes(2);
    expect(second).toBe('second-player');
  });

  it('attempts re-initialization when OneSignal.init rejects', async () => {
    vi.stubEnv('VITE_ONESIGNAL_APP_ID', 'retry-app');
    initMock.mockRejectedValueOnce(new Error('boom'));
    const { subscribePush } = await import('./push');

    const first = await subscribePush();
    expect(first).toBeNull();
    expect(initMock).toHaveBeenCalledTimes(1);

    pushSubscription.id = 'after-retry';
    const second = await subscribePush();
    expect(initMock).toHaveBeenCalledTimes(2);
    expect(second).toBe('after-retry');
  });
});
