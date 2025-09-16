import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

let subscribePushMock: ReturnType<typeof vi.fn>;
let loginMock: ReturnType<typeof vi.fn>;
let apiFetchMock: ReturnType<typeof vi.fn>;

const resetMocks = () => {
  subscribePushMock = vi.fn().mockResolvedValue('player-id');
  loginMock = vi.fn().mockResolvedValue({
    data: {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      role: 'dispatcher',
      user: {
        id: 101,
        email: 'user@example.com',
        full_name: 'Test User',
        role: 'dispatcher',
        phone: '+15555555555',
      },
    },
  });
  apiFetchMock = vi.fn().mockResolvedValue({ ok: false } as Response);
};

describe('AuthProvider push subscription', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    localStorage.clear();
    resetMocks();

    vi.doMock('@/services/push', () => ({
      __esModule: true,
      subscribePush: subscribePushMock,
      unsubscribePush: vi.fn(),
      refreshPushToken: vi.fn(),
    }));

    vi.doMock('@/components/ApiConfig', () => ({
      __esModule: true,
      authApi: { loginAuthLoginPost: loginMock },
    }));

    vi.doMock('@/services/apiFetch', () => ({
      __esModule: true,
      apiFetch: apiFetchMock,
    }));

    vi.doMock('@/lib/logger', () => ({
      __esModule: true,
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }));
  });
  it('subscribes to push notifications once authentication succeeds', async () => {
    vi.stubEnv('VITE_ONESIGNAL_APP_ID', 'app-id');

    const { AuthProvider, useAuth } = await import('./AuthContext');

    const TriggerLogin: React.FC = () => {
      const { loginWithPassword } = useAuth();
      useEffect(() => {
        void loginWithPassword('user@example.com', 'password');
      }, [loginWithPassword]);
      return null;
    };

    render(
      <AuthProvider>
        <TriggerLogin />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password' });
    });

    await waitFor(() => {
      expect(subscribePushMock).toHaveBeenCalledTimes(1);
    });
  });

  it('does not subscribe when OneSignal is disabled', async () => {
    const { AuthProvider, useAuth } = await import('./AuthContext');

    const TriggerLogin: React.FC = () => {
      const { loginWithPassword } = useAuth();
      useEffect(() => {
        void loginWithPassword('user@example.com', 'password');
      }, [loginWithPassword]);
      return null;
    };

    render(
      <AuthProvider>
        <TriggerLogin />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledTimes(1);
    });

    expect(subscribePushMock).not.toHaveBeenCalled();
  });
});
