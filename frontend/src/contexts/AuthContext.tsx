// React context providing authentication state and helpers.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "@/components/ApiConfig";
import { CONFIG } from "@/config";
import { setTokens, getRefreshToken } from "../services/tokenStore";
import { beginLogin, completeLoginFromRedirect, refreshTokens, TokenResponse, OAuthConfig } from "../services/oauth";
import { useLocation, useNavigate } from "react-router-dom";
import { type AuthContextType } from "@/types/AuthContextType";
import { subscribePush } from "@/services/push";
import * as logger from "@/lib/logger";

type UserShape = { email?: string; full_name?: string; role?: string } | null;

type LoginResponse = {
  access_token?: string;
  token?: string;
  refresh_token?: string | null;
  role?: string | null;
  user?: { role?: string } | null;
  full_name?: string;
  id?: string;
};

type AuthState = {
  accessToken: string | null;
  user: UserShape | null;
  loading: boolean;
  userID: string| null;
  userName: string | null;
  role: string | null;
};
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const oauthCfg: OAuthConfig = {
  clientId: CONFIG.OAUTH_CLIENT_ID,
  authorizeUrl: CONFIG.OAUTH_AUTHORIZE_URL,
  tokenUrl: CONFIG.OAUTH_TOKEN_URL,
  redirectUri: CONFIG.OAUTH_REDIRECT_URI,
};

async function maybeSubscribePush() {
  if (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    import.meta.env.VITE_FCM_VAPID_KEY &&
    import.meta.env.VITE_FCM_API_KEY &&
    import.meta.env.VITE_FCM_PROJECT_ID &&
    import.meta.env.VITE_FCM_APP_ID &&
    import.meta.env.VITE_FCM_SENDER_ID
  ) {
    try {
      await subscribePush();
    } catch (err) {
      logger.warn("contexts/AuthContext", "push subscribe failed", err);
    }
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ accessToken: null, user: null, loading: true, userID: null, userName: null, role: null });
  // const [userName, setUserName] = useState<string>('');
  // const [userID, setUserID] = useState<string|null>(null);

  // Load from localStorage on boot
useEffect(() => {
  const raw = localStorage.getItem("auth_tokens");
  const storeduserID = localStorage.getItem("userID");
  const storeduserName = localStorage.getItem("userName");
  const storedRole = localStorage.getItem("role");
  if (raw) {
    try {
      const { access_token, refresh_token, user, role } = JSON.parse(raw);
      setTokens(access_token, refresh_token);
      setState({
        accessToken: access_token ?? null,
        user: user ?? null,
        loading: false,
        userID: storeduserID ?? null,
        userName: storeduserName ?? null,
        role: storedRole ?? user?.role ?? null,
      });
      if (role ?? storedRole) {
        localStorage.setItem("userRole", String(role ?? storedRole));
      }
      return;
    } catch { /* ignore parse errors */ }
  }
  setState((s) => ({ ...s, loading: false }));
}, []);

  useEffect(() => {
    if (!state.accessToken || state.role) return;
    const fetchMe = async () => {
      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${state.accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.role) {
          localStorage.setItem("userRole", data.role);
        }
        if (data.full_name) {
          localStorage.setItem("userName", data.full_name);
        }
        if (data.id) {
          localStorage.setItem("userID", String(data.id));
        }
        setState((s) => ({
          ...s,
          role: data.role ?? s.role,
          userName: data.full_name ?? s.userName,
          userID: data.id ? String(data.id) : s.userID,
        }));
      } catch {
        /* ignore */
      }
    };
    fetchMe();
  }, [state.accessToken, state.role]);

  const persist = useCallback((t?: TokenResponse | null, user?: UserShape, role?: string | null) => {
    const access_token = t?.access_token ?? null;
    const refresh_token = t?.refresh_token ?? null;
    if (access_token || refresh_token || user) {
      localStorage.setItem("auth_tokens", JSON.stringify({ access_token, refresh_token, user }));
      if (user?.role) {
        localStorage.setItem("role", user.role);
      }
    } else {
      localStorage.removeItem("auth_tokens");
      localStorage.removeItem("role");
    }
    if (role !== undefined) {
      if (role) {
        localStorage.setItem("userRole", role);
      } else {
        localStorage.removeItem("userRole");
      }
    }
    setTokens(access_token, refresh_token);
    setState((s) => ({
      ...s,
      accessToken: access_token,
      user: user ?? s.user,
      role: user?.role ?? s.role,
    }));
    if (access_token) {
      maybeSubscribePush();
    }
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await authApi.loginAuthLoginPost({ email, password });
      const body = res.data as LoginResponse;
      const token = body.access_token ?? body.token ?? null;
      const role: string | null = body.role ?? body.user?.role ?? null;
      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({
          access_token: token,
          refresh_token: body.refresh_token ?? null,
          user: body.user ?? null,
        })
      );
      if (role) {
        localStorage.setItem("role", role);
      } else {
        localStorage.removeItem("role");
      }

      localStorage.setItem("userName", body.full_name);
      localStorage.setItem("userID", String(body.id));

      setState((s) => ({
        ...s,
        accessToken: token,
        user: body.user ?? s.user,
        userID: String(body.id),
        userName: body.full_name,
        role,
      }));
      return role;
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { detail?: string } } };
      const status = err.response?.status;
      const text = err.response?.data?.detail || "";
      if (status === 401 || /invalid/i.test(String(text))) {
        throw new Error("Invalid credentials");
      }
      throw new Error("Login failed");
    }

    const body = await res.json();
    const token = body.access_token ?? body.token ?? null;
    const role: string | null = body.role ?? body.user?.role ?? null;
    localStorage.setItem(
      "auth_tokens",
      JSON.stringify({
        access_token: token,
        refresh_token: body.refresh_token ?? null,
        user: body.user ?? null,
      })
    );
    if (role) {
      localStorage.setItem("role", role);
    } else {
      localStorage.removeItem("role");
    }

    localStorage.setItem("userName", body.full_name);
    localStorage.setItem("userID", String(body.id));

    setState((s) => ({
      ...s,
      accessToken: token,
      user: body.user ?? s.user,
      userID: String(body.id),
      userName: body.full_name,
      role,
    }));
    if (token) {
      maybeSubscribePush();
    }
    return role;
  }, [setState]);

    const registerWithPassword = useCallback(async (fullName: string, email: string, password: string) => {
      await authApi.endpointRegisterAuthRegisterPost({ full_name: fullName, email, password });
      // auto-login
      await loginWithPassword(email, password);
    }, [loginWithPassword]);

  const loginWithOAuth = useCallback(() => beginLogin(oauthCfg), []);

  const finishOAuthIfCallback = useCallback(async () => {
    if (!/\bcode=/.test(window.location.search)) return;
    const tokens = await completeLoginFromRedirect(oauthCfg);
    // Optional: fetch profile here via authApi if you have /auth/me
    persist(tokens, null);
  }, [persist]);

  const logout = useCallback(() => {
    persist(null, null, null);
    localStorage.removeItem("userID");
    localStorage.removeItem("userName");
    localStorage.removeItem("role");
    setState((s) => ({
      ...s,
      accessToken: null,
      user: null,
      userID: null,
      userName: null,
      role: null,
    }));
  }, [persist, setState]);

  const ensureFreshToken = useCallback(async (): Promise<string | null> => {
    if (state.accessToken) return state.accessToken;
    const r = getRefreshToken();
    if (!r) return null;
    try {
      const t = await refreshTokens(oauthCfg, r);
      persist(t, null);
      return t.access_token;
    } catch {
      logout();
      return null;
    }
  }, [state.accessToken, persist, logout]);

  const value = useMemo<AuthContextType>(
    () => ({
      ...state,
      loginWithPassword,
      registerWithPassword,
      loginWithOAuth,
      finishOAuthIfCallback,
      logout,
      ensureFreshToken,
    }),
    [state, loginWithPassword, registerWithPassword, loginWithOAuth, finishOAuthIfCallback, logout, ensureFreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !accessToken) {
      const from = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?from=${from}`, { replace: true });
    }
  }, [loading, accessToken, location, navigate]);

  if (loading || !accessToken) return null;
  return <>{children}</>;
};

export const RequireRole: React.FC<{ role: string; children: React.ReactNode }> = ({
  role,
  children,
}) => {
  const { accessToken, loading, role: userRole, userID } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      const from = encodeURIComponent(location.pathname + location.search);
      const allowed =
        accessToken && (userRole === role || userID === CONFIG.ADMIN_USER_ID);
      if (!allowed) {
        navigate(`/login?from=${from}`, { replace: true });
      }
    }
  }, [loading, accessToken, userRole, userID, role, location, navigate]);

  if (
    loading ||
    !accessToken ||
    (userRole !== role && userID !== CONFIG.ADMIN_USER_ID)
  )
    return null;
  return <>{children}</>;
};
