// Tiny in-memory store for OAuth access and refresh tokens.
let accessToken: string | null = null;
let refreshToken: string | null = null;
let listeners: Array<() => void> = [];

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
