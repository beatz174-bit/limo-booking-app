import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/apiFetch', () => ({
  apiFetch: apiFetchMock,
}));

vi.mock('@/lib/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('subscribePush', () => {
  let loginMock: ReturnType<typeof vi.fn>;
  let logoutMock: ReturnType<typeof vi.fn>;
  let optInMock: ReturnType<typeof vi.fn>;
  let optOutMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    apiFetchMock.mockReset();
    loginMock = vi.fn().mockResolvedValue(undefined);
    logoutMock = vi.fn().mockResolvedValue(undefined);
    optInMock = vi.fn().mockResolvedValue(undefined);
    optOutMock = vi.fn().mockResolvedValue(undefined);
    (window as any).OneSignal = {
      init: vi.fn().mockResolvedValue(undefined),
      User: {
        PushSubscription: {
          id: 'player-id',
          optIn: optInMock,
          optOut: optOutMock,
        },
      },
      login: loginMock,
      logout: logoutMock,
    };
    (window as any).__oneSignalInitPromise = undefined;
    import.meta.env.VITE_ONESIGNAL_APP_ID = 'test-app';
    apiFetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    } as unknown as Response);
  });

  afterEach(() => {
    delete (window as any).OneSignal;
    delete (window as any).__oneSignalInitPromise;
    delete (import.meta.env as any).VITE_ONESIGNAL_APP_ID;
    vi.clearAllMocks();
  });

  it('logs in with provided external id after opting in', async () => {
    const { subscribePush } = await import('@/services/push');
    await subscribePush('user-1');
    expect(optInMock).toHaveBeenCalled();
    expect(loginMock).toHaveBeenCalledWith('user-1');
  });

  it('reuses a stored external id on later subscriptions', async () => {
    const { subscribePush } = await import('@/services/push');
    await subscribePush('user-1');
    loginMock.mockClear();
    await subscribePush();
    expect(loginMock).toHaveBeenCalledWith('user-1');
  });

  it('logs out via helper and clears stored context', async () => {
    const { subscribePush, logoutPushUser } = await import('@/services/push');
    await subscribePush('user-1');
    await logoutPushUser();
    expect(logoutMock).toHaveBeenCalled();
    loginMock.mockClear();
    await subscribePush();
    expect(loginMock).not.toHaveBeenCalled();
  });
});
