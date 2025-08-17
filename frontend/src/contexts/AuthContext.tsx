import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import cfg, { AuthApi, UsersApi } from "../components/ApiConfig";
import { CONFIG } from "../config";
import { setTokens, getRefreshToken } from "../services/tokenStore";
import { beginLogin, completeLoginFromRedirect, refreshTokens, TokenResponse, OAuthConfig } from "../services/oauth";
import { useLocation, useNavigate } from "react-router-dom";
import { type AuthContextType } from "../types/AuthContextType";

const authApi = new AuthApi(cfg);
type UserShape = { email?: string; full_name?: string } | null;

type AuthState = {
  accessToken: string | null;
  user: UserShape;
  loading: boolean;
  userID: string| null;
  userName: string;
};

// export type AuthContextType = AuthState & {
//   loginWithPassword: (email: string, password: string) => Promise<void>;
//   registerWithPassword: (fullName: string, email: string, password: string) => Promise<void>;
//   loginWithOAuth: () => void;
//   finishOAuthIfCallback: () => Promise<void>;
//   logout: () => void;
//   ensureFreshToken: () => Promise<string | null>;
// };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const oauthCfg: OAuthConfig = {
  clientId: CONFIG.OAUTH_CLIENT_ID,
  authorizeUrl: CONFIG.OAUTH_AUTHORIZE_URL,
  tokenUrl: CONFIG.OAUTH_TOKEN_URL,
  redirectUri: CONFIG.OAUTH_REDIRECT_URI,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ accessToken: null, user: null, loading: true, userID: null, userName: null });
  const authApi = new AuthApi(cfg);
  // const [userName, setUserName] = useState<string>('');
  // const [userID, setUserID] = useState<string|null>(null);

  // Load from localStorage on boot
useEffect(() => {
  const raw = localStorage.getItem("auth_tokens");
  const storeduserID = localStorage.getItem("userID");
  const storeduserName = localStorage.getItem("userName");
  if (raw) {
    try {
      const { access_token, refresh_token, user } = JSON.parse(raw);
      setTokens(access_token, refresh_token);
      setState({
        accessToken: access_token ?? null,
        user: user ?? null,
        loading: false,
        userID: storeduserID ?? null,
        userName: storeduserName ?? null,
      });
      return;
    } catch {}
  }
  setState((s) => ({ ...s, loading: false }));
}, []);

  const persist = (t?: TokenResponse | null, user?: UserShape) => {
    const access_token = t?.access_token ?? null;
    const refresh_token = t?.refresh_token ?? null;
    if (access_token || refresh_token || user) {
      localStorage.setItem("auth_tokens", JSON.stringify({ access_token, refresh_token, user }));
    } else {
      localStorage.removeItem("auth_tokens");
    }
    setTokens(access_token, refresh_token);
    setState((s) => ({ ...s, accessToken: access_token, user: user ?? s.user }));
  };

const loginWithPassword = async (email: string, password: string) => {
  const res = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "omit",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401 || /invalid/i.test(text)) {
      throw new Error("Invalid credentials");
    }
    throw new Error("Login failed");
  }
  
  const body = await res.json();
  const token = body.access_token ?? body.token ?? null;
  localStorage.setItem(
    "auth_tokens",
    JSON.stringify({
      access_token: token,
      refresh_token: body.refresh_token ?? null,
      user: body.user ?? null,
    })
  );
  
  localStorage.setItem("userName", body.full_name)
  localStorage.setItem("userID", String(body.id))

  setTokens(token, body.refresh_token ?? null);
  setState(s => ({
  ...s,
  accessToken: token,
  user: body.user ?? s.user,
  userID: String(body.id),
  userName: body.full_name,
}));
};

  const registerWithPassword = async (fullName: string, email: string, password: string) => {
    await authApi.endpointRegisterAuthRegisterPost({ full_name: fullName, email, password });
    // auto-login
    await loginWithPassword(email, password);
  };

  const loginWithOAuth = () => beginLogin(oauthCfg);

  const finishOAuthIfCallback = async () => {
    if (!/\bcode=/.test(window.location.search)) return;
    const tokens = await completeLoginFromRedirect(oauthCfg);
    // Optional: fetch profile here via authApi if you have /auth/me
    persist(tokens, null);
  };

  const logout = () => {
  persist(null, null);
  localStorage.removeItem("userID");
  localStorage.removeItem("userName");
  setState(s => ({
    ...s,
    accessToken: null,
    user: null,
    userID: null,
    userName: null,
  }));
  };

  const ensureFreshToken = async (): Promise<string | null> => {
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
  };

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
    [state, loginWithPassword, registerWithPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

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