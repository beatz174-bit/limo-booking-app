import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn<
  [input: RequestInfo | URL, init?: RequestInit],
  Promise<Response>
>();

vi.mock('@/services/apiFetch', () => ({
  apiFetch: apiFetchMock,
}));

const loggerMock = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('@/lib/logger', () => loggerMock);

describe('services/push subscription change handling', () => {
  let refreshPushToken: typeof import('./push').refreshPushToken;
  let onPushSubscriptionChange: typeof import('./push').onPushSubscriptionChange;
  let resetForTests: typeof import('./push').__resetPushListenersForTests;
  let teardownPushListeners: typeof import('./push').teardownPushListeners;
  let subscribePushFn: typeof import('./push').subscribePush;
  let changeHandlers: Array<() => Promise<void> | void>;
  let pushSubscription: {
    id: string | null;
    optIn: ReturnType<typeof vi.fn>;
    optOut: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };
  let loginMock: ReturnType<typeof vi.fn>;
  let setEmailMock: ReturnType<typeof vi.fn>;
  let setSMSNumberMock: ReturnType<typeof vi.fn>;
  let addTagMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    apiFetchMock.mockReset();
    Object.values(loggerMock).forEach((fn) => fn.mockClear());
    changeHandlers = [];
    localStorage.clear();
    import.meta.env.VITE_ONESIGNAL_APP_ID = 'test-app';
    import.meta.env.VITE_API_BASE_URL = 'https://api.example';

    pushSubscription = {
      id: 'initial',
      optIn: vi.fn(),
      optOut: vi.fn(),
      addEventListener: vi.fn((event: string, handler: () => Promise<void> | void) => {
        if (event === 'change') {
          changeHandlers.push(handler);
        }
      }),
      removeEventListener: vi.fn((event: string, handler: () => Promise<void> | void) => {
        if (event === 'change') {
          changeHandlers = changeHandlers.filter((fn) => fn !== handler);
        }
      }),
    };

    loginMock = vi.fn(() => Promise.resolve());
    setEmailMock = vi.fn(() => Promise.resolve());
    setSMSNumberMock = vi.fn(() => Promise.resolve());
    addTagMock = vi.fn(() => Promise.resolve());
    const initMock = vi.fn(() => Promise.resolve());

    (window as unknown as { OneSignal?: unknown }).OneSignal = {
      init: initMock,
      login: loginMock,
      setEmail: setEmailMock,
      setSMSNumber: setSMSNumberMock,
      addTag: addTagMock,
      User: {
        PushSubscription: pushSubscription,
      },
    };
    window.__oneSignalInitPromise = undefined;

    const mod = await import('./push');
    refreshPushToken = mod.refreshPushToken;
    onPushSubscriptionChange = mod.onPushSubscriptionChange;
    resetForTests = mod.__resetPushListenersForTests;
    teardownPushListeners = mod.teardownPushListeners;
    subscribePushFn = mod.subscribePush;

    resetForTests();
    apiFetchMock.mockResolvedValue({ status: 200 } as Response);
  });

  afterEach(() => {
    teardownPushListeners();
    resetForTests();
    delete (window as unknown as { OneSignal?: unknown }).OneSignal;
    window.__oneSignalInitPromise = undefined;
  });

  const getRegisteredHandler = () => {
    expect(changeHandlers).not.toHaveLength(0);
    const handler = changeHandlers[0];
    expect(typeof handler).toBe('function');
    return handler;
  };

  it('persists new subscription IDs to the backend', async () => {
    await refreshPushToken();
    expect(pushSubscription.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );

    const handler = getRegisteredHandler();
    pushSubscription.id = 'player-123';
    await handler?.();

    expect(apiFetchMock).toHaveBeenCalledWith(
      'https://api.example/users/me',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ onesignal_player_id: 'player-123' }),
      }),
    );
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('re-links the external ID when available', async () => {
    localStorage.setItem('onesignal_external_id', 'external-42');

    await refreshPushToken();
    const handler = getRegisteredHandler();

    pushSubscription.id = 'player-999';
    await handler?.();

    expect(loginMock).toHaveBeenCalledWith('external-42');
  });

  it('notifies local listeners about subscription changes', async () => {
    await refreshPushToken();

    const callback = vi.fn();
    const unsubscribe = onPushSubscriptionChange(callback);

    const handler = getRegisteredHandler();
    pushSubscription.id = 'player-abc';
    await handler?.();

    expect(callback).toHaveBeenCalledWith('player-abc');
    unsubscribe();
  });

  it('syncs user metadata with OneSignal when subscribing', async () => {
    await subscribePushFn({
      externalId: 'user-123',
      email: 'user@example.com',
      phone: '+1234567890',
      fullName: 'Jane Doe',
      role: 'admin',
      tags: {
        organization: 'Acme Inc',
        fleet_size: 12,
        opted_in: true,
        empty: '',
      },
    });

    expect(pushSubscription.optIn).toHaveBeenCalled();
    expect(loginMock).toHaveBeenCalledWith('user-123');
    expect(setEmailMock).toHaveBeenCalledWith('user@example.com');
    expect(setSMSNumberMock).toHaveBeenCalledWith('+1234567890');
    expect(addTagMock).toHaveBeenCalledWith('full_name', 'Jane Doe');
    expect(addTagMock).toHaveBeenCalledWith('role', 'admin');
    expect(addTagMock).toHaveBeenCalledWith('organization', 'Acme Inc');
    expect(addTagMock).toHaveBeenCalledWith('fleet_size', '12');
    expect(addTagMock).toHaveBeenCalledWith('opted_in', 'true');
    expect(addTagMock).not.toHaveBeenCalledWith('empty', expect.anything());
  });

  it('logs in exactly once when subscribing with a new external ID', async () => {
    await subscribePushFn({
      externalId: 'fresh-user',
    });

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(loginMock).toHaveBeenCalledWith('fresh-user');
  });
});
