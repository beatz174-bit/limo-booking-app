import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const apiFetchMock = vi.hoisted(() => vi.fn());
const loginRequestMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/apiFetch', () => ({
  apiFetch: apiFetchMock,
}));

vi.mock('@/components/ApiConfig', () => ({
  authApi: {
    loginAuthLoginPost: loginRequestMock,
  },
}));

vi.mock('@/services/oauth', () => ({
  beginLogin: vi.fn(),
  completeLoginFromRedirect: vi.fn(),
  refreshTokens: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('AuthContext push integrations', () => {
  let oneSignalLogin: ReturnType<typeof vi.fn>;
  let oneSignalLogout: ReturnType<typeof vi.fn>;
  let optInMock: ReturnType<typeof vi.fn>;
  let optOutMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    apiFetchMock.mockReset();
    loginRequestMock.mockReset();
    import.meta.env.VITE_ONESIGNAL_APP_ID = 'test-app';
    import.meta.env.VITE_API_BASE_URL = 'https://api.example.com';
    oneSignalLogin = vi.fn().mockResolvedValue(undefined);
    oneSignalLogout = vi.fn().mockResolvedValue(undefined);
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
      login: oneSignalLogin,
      logout: oneSignalLogout,
    };
    (window as any).__oneSignalInitPromise = undefined;
    apiFetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
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
          json: async () => ({
            onesignal_player_id: null,
          }),
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
    loginRequestMock.mockResolvedValue({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        id: 123,
        full_name: 'Test User',
        role: 'user',
        email: 'test@example.com',
      },
    });
  });

  afterEach(() => {
    delete (window as any).OneSignal;
    delete (window as any).__oneSignalInitPromise;
    delete (import.meta.env as any).VITE_ONESIGNAL_APP_ID;
    delete (import.meta.env as any).VITE_API_BASE_URL;
    vi.clearAllMocks();
  });

  it('logs into and out of OneSignal when logging in and out', async () => {
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.loginWithPassword('user@example.com', 'password');
    });

    await waitFor(() => expect(oneSignalLogin).toHaveBeenCalledWith('123'));

    await act(async () => {
      result.current.logout();
    });

    await waitFor(() => expect(oneSignalLogout).toHaveBeenCalled());
  });
});
