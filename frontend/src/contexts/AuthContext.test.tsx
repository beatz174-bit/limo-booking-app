import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const apiFetchMock = vi.hoisted(() => vi.fn());
const loginRequestMock = vi.hoisted(() => vi.fn());
const subscribePushMock = vi.hoisted(() => vi.fn());
const logoutPushUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/apiFetch', () => ({
  apiFetch: apiFetchMock,
}));

vi.mock('@/components/ApiConfig', () => ({
  authApi: {
    loginAuthLoginPost: loginRequestMock,
  },
}));

vi.mock('@/services/push', () => ({
  subscribePush: subscribePushMock,
  logoutPushUser: logoutPushUserMock,
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
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    apiFetchMock.mockReset();
    loginRequestMock.mockReset();
    subscribePushMock.mockReset();
    logoutPushUserMock.mockReset();
    import.meta.env.VITE_ONESIGNAL_APP_ID = 'test-app';
    import.meta.env.VITE_API_BASE_URL = 'https://api.example.com';
    subscribePushMock.mockResolvedValue('player-id');
    logoutPushUserMock.mockResolvedValue(undefined);
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
    delete (import.meta.env as any).VITE_ONESIGNAL_APP_ID;
    delete (import.meta.env as any).VITE_API_BASE_URL;
    vi.clearAllMocks();
  });

  it('subscribes to push with numeric IDs and logs out when logging out', async () => {
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.loginWithPassword('user@example.com', 'password');
    });

    await waitFor(() => expect(subscribePushMock).toHaveBeenCalled());
    const metadata = subscribePushMock.mock.calls.at(-1)?.[0];
    expect(metadata).toMatchObject({
      externalId: '123',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'user',
    });
    expect(metadata?.phone).toBeNull();
    expect(metadata?.tags?.user_id).toBe('123');

    await act(async () => {
      result.current.logout();
    });

    await waitFor(() => expect(logoutPushUserMock).toHaveBeenCalled());
  });

  it('preserves string user IDs when subscribing to push', async () => {
    const { AuthProvider, useAuth } = await import('@/contexts/AuthContext');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    loginRequestMock.mockResolvedValueOnce({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        id: 'user-123',
        full_name: 'Test User',
        role: 'user',
        email: 'test@example.com',
      },
    });

    await act(async () => {
      await result.current.loginWithPassword('user@example.com', 'password');
    });

    await waitFor(() => expect(subscribePushMock).toHaveBeenCalled());
    const metadata = subscribePushMock.mock.calls.at(-1)?.[0];
    expect(metadata).toMatchObject({
      externalId: 'user-123',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'user',
    });
    expect(metadata?.tags?.user_id).toBe('user-123');
    const externalIds = subscribePushMock.mock.calls.map((call) => call[0]?.externalId);
    expect(externalIds).not.toContain('NaN');
  });
});
