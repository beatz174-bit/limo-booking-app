// Tiny in-memory store for OAuth access and refresh tokens.
let accessToken: string | null = null;
let refreshToken: string | null = null;
let listeners: Array<() => void> = [];

// Load tokens from localStorage on startup so callers can access them
// immediately after this module is imported.
export function initTokensFromStorage() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  const raw = localStorage.getItem("auth_tokens");
  if (!raw) return;
  try {
    const { access_token, refresh_token } = JSON.parse(raw);
    accessToken = access_token ?? null;
    refreshToken = refresh_token ?? null;
  } catch {
    // ignore parse errors
  }
}

export function setTokens(a?: string | null, r?: string | null) {
  accessToken = a ?? null;
  refreshToken = r ?? null;
  listeners.forEach((fn) => fn());
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function onTokenChange(fn: () => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((x) => x !== fn);
  };
}
