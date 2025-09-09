// React context providing authentication state and helpers.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authApi } from "@/components/ApiConfig";
import { CONFIG } from "@/config";
import { setTokens, getRefreshToken, initTokensFromStorage } from "../services/tokenStore";
import { apiFetch } from "@/services/apiFetch";
import { beginLogin, completeLoginFromRedirect, refreshTokens, TokenResponse, OAuthConfig } from "../services/oauth";
import { useLocation, useNavigate } from "react-router-dom";
import { type AuthContextType, type UserShape } from "@/types/AuthContextType";
import { subscribePush } from "@/services/push";
import * as logger from "@/lib/logger";

// Seed token store from localStorage before any React code runs so that
// getAccessToken() returns a value on first render.
initTokensFromStorage();
logger.debug("contexts/AuthContext", "tokens initialized from storage");

type LoginResponse = {
  access_token?: string;
  token?: string;
  refresh_token?: string | null;
  role?: string | null;
  user?: { role?: string } | null;
  full_name?: string;
  email?: string;
  phone?: string;
  id?: number | string;
};

type AuthState = {
  accessToken: string | null;
  user: UserShape | null;
  loading: boolean;
  userID: string| null;
  userName: string | null;
  role: string | null;
  adminID: string | null;
  phone: string | null;
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
  const [state, setState] = useState<AuthState>({ accessToken: null, user: null, loading: true, userID: null, userName: null, role: null, adminID: null, phone: null });
  // const [userName, setUserName] = useState<string>('');
  // const [userID, setUserID] = useState<string|null>(null);

  // Load from localStorage on boot
  useEffect(() => {
    logger.debug("contexts/AuthContext", "loading tokens from storage");
    const raw = localStorage.getItem("auth_tokens");
    const storeduserID = localStorage.getItem("userID");
    const storeduserName = localStorage.getItem("userName");
    const storedRole = localStorage.getItem("role");
    const storedAdminID = localStorage.getItem("adminID");
    const storedPhone = localStorage.getItem("phone");
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
          adminID: storedAdminID ?? null,
          phone: storedPhone ?? null,
        });
        logger.debug("contexts/AuthContext", "tokens loaded from storage");
        if (role ?? storedRole) {
          localStorage.setItem("userRole", String(role ?? storedRole));
        }
        return;
      } catch {
        /* ignore parse errors */
      }
    }
    setState((s): AuthState => ({
      ...s,
      loading: false,
      adminID: storedAdminID ?? null,
      phone: storedPhone ?? null,
    }));
  }, []);

const adminID = state.adminID;
useEffect(() => {
  if (adminID) return;
  const fetchAdminID = async () => {
    try {
      const res = await apiFetch(`${CONFIG.API_BASE_URL}/settings`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.admin_user_id) {
        const id = String(data.admin_user_id);
        localStorage.setItem("adminID", id);
        setState((s): AuthState => ({ ...s, adminID: id }));
      }
    } catch (err) {
      logger.error(
        "contexts/AuthContext",
        "failed to fetch admin ID",
        err,
      );
    }
  };
  fetchAdminID();
}, [adminID]);

  const profileFetched = useRef(false);

  useEffect(() => {
    if (!state.accessToken || profileFetched.current) return;
    const needsProfile =
      !state.user?.email ||
      !state.user?.full_name ||
      !state.user?.phone ||
      !state.role ||
      !state.userID ||
      !state.userName;
    if (!needsProfile) {
      profileFetched.current = true;
      return;
    }
    const fetchMe = async () => {
      try {
        const res = await apiFetch(`${CONFIG.API_BASE_URL}/users/me`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.role) {
          localStorage.setItem("userRole", data.role ?? "");
        } else {
          localStorage.removeItem("userRole");
        }
        if (data.full_name) {
          localStorage.setItem("userName", data.full_name ?? "");
        } else {
          localStorage.removeItem("userName");
        }
        if (data.phone) {
          localStorage.setItem("phone", data.phone ?? "");
        } else {
          localStorage.removeItem("phone");
        }
        if (data.id) {
          localStorage.setItem("userID", String(data.id));
        } else {
          localStorage.removeItem("userID");
        }
        setState((s): AuthState => ({
          ...s,
          user: {
            ...s.user,
            id: data.id ?? s.user?.id,
            email: data.email ?? s.user?.email,
            full_name: data.full_name ?? s.user?.full_name,
            role: data.role ?? s.user?.role,
            phone: data.phone ?? s.user?.phone,
          },
          role: data.role ?? s.role,
          userName: data.full_name ?? s.userName,
          userID: data.id ? String(data.id) : s.userID,
          phone: data.phone ?? s.phone,
        }));
      } catch (err) {
        logger.error(
          "contexts/AuthContext",
          "failed to fetch user profile",
          err,
        );
      } finally {
        profileFetched.current = true;
      }
    };
    fetchMe();
  }, [
    state.accessToken,
    state.user,
    state.role,
    state.userID,
    state.userName,
    state.phone,
  ]);

  useEffect(() => {
    if (!state.accessToken) {
      profileFetched.current = false;
    }
  }, [state.accessToken]);

  const persist = useCallback(
    (t?: TokenResponse | null, user?: UserShape | null, role?: string | null) => {
    const access_token = t?.access_token ?? null;
    const refresh_token = t?.refresh_token ?? null;
    if (access_token || refresh_token || user) {
      logger.debug(
        "contexts/AuthContext",
        "persisting tokens",
        { hasAccess: !!access_token, hasRefresh: !!refresh_token },
      );
      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access_token, refresh_token, user }),
      );
      if (user?.role) {
        localStorage.setItem("role", user.role ?? "");
      }
    } else {
      logger.debug("contexts/AuthContext", "clearing stored tokens");
      localStorage.removeItem("auth_tokens");
      localStorage.removeItem("role");
    }
    if (role !== undefined) {
      if (role) {
        localStorage.setItem("userRole", role ?? "");
      } else {
        localStorage.removeItem("userRole");
      }
    }
    setTokens(access_token, refresh_token);
    setState((s): AuthState => ({
      ...s,
      accessToken: access_token,
      user: user ?? s.user,
      role: user?.role ?? s.role,
    }));
    if (access_token) {
      maybeSubscribePush();
    }
  }, [setState]);

  const loginWithPassword = useCallback(async (email: string, password: string): Promise<string | null> => {
    logger.info(
      "contexts/AuthContext",
      "attempting login with password",
      { email },
    );
    try {
      const res = await authApi.loginAuthLoginPost({ email, password });
      const body = res.data as LoginResponse;
      const token = body.access_token ?? body.token ?? null;
      const role: string | null = body.role ?? body.user?.role ?? null;
      const userFromResp: UserShape | null =
        body.user ||
        ({
          id: typeof body.id === "number" ? body.id : Number(body.id),
          email: body.email ?? email,
          full_name: body.full_name,
          role: role ?? undefined,
          phone: body.phone,
        } as UserShape);
      const tokenRes: TokenResponse | null = token
        ? {
            access_token: token,
            refresh_token: body.refresh_token ?? undefined,
            token_type: "Bearer",
          }
        : null;
      persist(tokenRes, userFromResp, role);

      if (body.full_name) {
        localStorage.setItem("userName", body.full_name ?? "");
      } else {
        localStorage.removeItem("userName");
      }
      if (body.id != null) {
        localStorage.setItem("userID", String(body.id));
      } else {
        localStorage.removeItem("userID");
      }
      if (body.phone) {
        localStorage.setItem("phone", body.phone ?? "");
      } else {
        localStorage.removeItem("phone");
      }

      setState((s): AuthState => ({
        ...s,
        user: userFromResp,
        userID: body.id != null ? String(body.id) : null,
        userName: body.full_name ?? null,
        phone: body.phone ?? null,
      }));
      logger.info("contexts/AuthContext", "login successful");
      return role;
    } catch (e: unknown) {
      logger.error("contexts/AuthContext", "login request failed", e);
      const err = e as {
        response?: { status?: number; data?: { detail?: string } };
      };
      const status = err.response?.status;
      const text = err.response?.data?.detail || "";
      if (status === 401 || /invalid/i.test(String(text))) {
        throw new Error("Invalid credentials");
      }
      throw new Error("Login failed");
    }
  }, [persist]);

  const registerWithPassword = useCallback(
    async (fullName: string, email: string, password: string) => {
      try {
        await authApi.endpointRegisterAuthRegisterPost({
          full_name: fullName,
          email,
          password,
        });
        // auto-login
        await loginWithPassword(email, password);
      } catch (err) {
        logger.error(
          "contexts/AuthContext",
          "registration failed",
          err,
        );
        throw err;
      }
    },
    [loginWithPassword],
  );

  const loginWithOAuth = useCallback(() => {
    logger.info("contexts/AuthContext", "starting OAuth login");
    return beginLogin(oauthCfg);
  }, []);

  const finishOAuthIfCallback = useCallback(async () => {
    if (!/\bcode=/.test(window.location.search)) return;
    try {
      const tokens = await completeLoginFromRedirect(oauthCfg);
      // Optional: fetch profile here via authApi if you have /auth/me
      persist(tokens, null);
      logger.info("contexts/AuthContext", "OAuth login completed");
    } catch (err) {
      logger.error("contexts/AuthContext", "OAuth login failed", err);
    }
  }, [persist]);

  const logout = useCallback(() => {
    logger.info("contexts/AuthContext", "logging out");
    persist(null, null, null);
    localStorage.removeItem("userID");
    localStorage.removeItem("userName");
    localStorage.removeItem("role");
    localStorage.removeItem("adminID");
    localStorage.removeItem("phone");
    setState((s): AuthState => ({
      ...s,
      accessToken: null,
      user: null,
      userID: null,
      userName: null,
      role: null,
      adminID: null,
      phone: null,
    }));
  }, [persist, setState]);

  const ensureFreshToken = useCallback(async (): Promise<string | null> => {
    if (state.accessToken) return state.accessToken;
    const r = getRefreshToken();
    if (!r) return null;
    try {
      logger.info("contexts/AuthContext", "refreshing access token");
      const t = await refreshTokens(oauthCfg, r);
      persist(t, null);
      logger.info("contexts/AuthContext", "token refresh successful");
      return t.access_token;
    } catch (err) {
      logger.error("contexts/AuthContext", "token refresh failed", err);
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

export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, loading, userID, adminID } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      const from = encodeURIComponent(location.pathname + location.search);
      const allowed = accessToken && userID === adminID;
      if (!allowed) {
        navigate(`/login?from=${from}`, { replace: true });
      }
    }
  }, [loading, accessToken, userID, adminID, location, navigate]);

  if (loading || !accessToken || userID !== adminID) return null;
  return <>{children}</>;
};
