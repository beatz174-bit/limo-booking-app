// Authorization Code + PKCE helper for OAuth flows.
// Requires envs via src/config.ts (we’ll wire that below)
export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

const te = new TextEncoder();

function b64url(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(s: string) {
  const digest = await crypto.subtle.digest("SHA-256", te.encode(s));
  return b64url(digest);
}

function rand(len = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const arr = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export type OAuthConfig = {
  clientId: string;
  authorizeUrl: string;
  tokenUrl: string;
  redirectUri: string;
};

export async function beginLogin(cfg: OAuthConfig, scope = "openid profile email") {
  const state = rand(16);
  const verifier = rand(64);
  const challenge = await sha256(verifier);

  sessionStorage.setItem("oauth_state", state);
  sessionStorage.setItem("oauth_verifier", verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${cfg.authorizeUrl}?${params.toString()}`;
  window.location.assign(authUrl);
}

export async function completeLoginFromRedirect(cfg: OAuthConfig): Promise<TokenResponse> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = sessionStorage.getItem("oauth_state");
  const verifier = sessionStorage.getItem("oauth_verifier");

  if (!code) throw new Error("Missing code");
  if (!state || !storedState || state !== storedState) throw new Error("State mismatch");
  if (!verifier) throw new Error("Missing PKCE verifier");

  sessionStorage.removeItem("oauth_state");
  sessionStorage.removeItem("oauth_verifier");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    code_verifier: verifier,
  });

  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshTokens(cfg: OAuthConfig, refresh_token: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id: cfg.clientId,
  });
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  return res.json();
}
