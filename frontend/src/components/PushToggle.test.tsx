import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const pushListeners: Array<(id: string | null) => void> = [];

vi.mock('@/services/push', () => {
  const subscribePush = vi.fn().mockResolvedValue('player');
  const unsubscribePush = vi.fn().mockResolvedValue(undefined);
  const onPushSubscriptionChange = vi.fn(
    (listener: (id: string | null) => void) => {
      pushListeners.push(listener);
      return () => {
        const index = pushListeners.indexOf(listener);
        if (index >= 0) {
          pushListeners.splice(index, 1);
        }
      };
    },
  );
  return {
    subscribePush,
    unsubscribePush,
    onPushSubscriptionChange,
  };
});

import PushToggle from '@/components/PushToggle';
import { subscribePush, unsubscribePush } from '@/services/push';

describe('PushToggle', () => {
  let ensureFreshToken: ReturnType<typeof vi.fn>;
  let subscribePushSpy: SpyInstance;
  let unsubscribePushSpy: SpyInstance;
  let refreshPushTokenSpy: SpyInstance;
  let fetchSpy: ReturnType<typeof vi.spyOn> | null;

  beforeEach(() => {
    vi.clearAllMocks();
    pushListeners.length = 0;
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    fetchSpy = null;
    subscribePushSpy.mockRestore();
    unsubscribePushSpy.mockRestore();
    refreshPushTokenSpy.mockRestore();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('shows unchecked when no subscription', async () => {
    const { default: PushToggle } = await import('@/components/PushToggle');
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ onesignal_player_id: null }),
    } as unknown as Response);
    render(<PushToggle ensureFreshToken={ensureFreshToken} />);
    const checkbox = await screen.findByRole('switch', { name: /push notifications/i });
    expect(checkbox).not.toBeChecked();
  });

  it('shows checked when subscribed', async () => {
    const { default: PushToggle } = await import('@/components/PushToggle');
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ onesignal_player_id: 'tok' }),
    } as unknown as Response);
    render(<PushToggle ensureFreshToken={ensureFreshToken} />);
    const checkbox = await screen.findByRole('switch', { name: /push notifications/i });
    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it('enables and disables push', async () => {
    const { default: PushToggle } = await import('@/components/PushToggle');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ onesignal_player_id: null }),
      } as unknown as Response)
      .mockResolvedValue({ ok: true, json: async () => ({}) } as unknown as Response);
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(
      fetchMock as unknown as typeof fetch,
    );
    render(<PushToggle ensureFreshToken={ensureFreshToken} />);
    const checkbox = await screen.findByRole('switch', { name: /push notifications/i });
    expect(checkbox).not.toBeChecked();

    await fireEvent.click(checkbox);
    await waitFor(() => expect(subscribePushSpy).toHaveBeenCalled());
    await waitFor(() => expect(checkbox).toBeChecked());

    await fireEvent.click(checkbox);
    await waitFor(() => expect(unsubscribePushSpy).toHaveBeenCalled());
    await waitFor(() => expect(checkbox).not.toBeChecked());
  });

  it('reacts to subscription change events', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ onesignal_player_id: null }),
    } as Response);

    render(<PushToggle ensureFreshToken={ensureFreshToken} />);

    const checkbox = await screen.findByRole('switch', {
      name: /push notifications/i,
    });
    expect(checkbox).not.toBeChecked();

    await act(async () => {
      pushListeners.forEach((listener) => listener('new-player'));
    });

    await waitFor(() => expect(checkbox).toBeChecked());
  });
});

describe('PushToggle OneSignal integration', () => {
  let loginMock: ReturnType<typeof vi.fn>;
  let logoutMock: ReturnType<typeof vi.fn>;
  let optInMock: ReturnType<typeof vi.fn>;
  let optOutMock: ReturnType<typeof vi.fn>;
  let apiFetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.unmock('@/services/push');
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
    import.meta.env.VITE_API_BASE_URL = 'https://api.example.com';
    apiFetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith('/users/me')) {
        if (init?.method === 'PATCH') {
          return {
            ok: true,
            status: 200,
            json: async () => ({}),
            text: async () => '',
          } as unknown as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ onesignal_player_id: null }),
          text: async () => '',
        } as unknown as Response;
      }
      if (url.endsWith('/settings')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
          text: async () => '',
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => '',
      } as unknown as Response;
    });
    vi.doMock('@/services/apiFetch', () => ({
      apiFetch: apiFetchMock,
    }));
    vi.doMock('@/lib/logger', () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }));
  });

  afterEach(() => {
    delete (window as any).OneSignal;
    delete (window as any).__oneSignalInitPromise;
    delete (import.meta.env as any).VITE_ONESIGNAL_APP_ID;
    delete (import.meta.env as any).VITE_API_BASE_URL;
    vi.clearAllMocks();
    vi.unmock('@/services/apiFetch');
    vi.unmock('@/lib/logger');
    vi.resetModules();
  });

  it('logs into OneSignal using a stored external id', async () => {
    const pushModule = await import('@/services/push');
    await pushModule.subscribePush('user-123');
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('user-123'));
    loginMock.mockClear();

    const { default: PushToggle } = await import('@/components/PushToggle');
    const ensureFreshToken = vi.fn().mockResolvedValue('auth');
    render(<PushToggle ensureFreshToken={ensureFreshToken} />);
    const checkbox = await screen.findByRole('switch', { name: /push notifications/i });
    await fireEvent.click(checkbox);
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('user-123'));
  });
});
