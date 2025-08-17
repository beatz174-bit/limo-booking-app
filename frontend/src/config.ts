// src/config.ts
export const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  CDN_BASE_URL: import.meta.env.VITE_CDN_BASE_URL || '',

  // NEW: OAuth settings
  OAUTH_CLIENT_ID: import.meta.env.VITE_OAUTH_CLIENT_ID || '',
  OAUTH_AUTHORIZE_URL: import.meta.env.VITE_OAUTH_AUTHORIZE_URL || '',
  OAUTH_TOKEN_URL: import.meta.env.VITE_OAUTH_TOKEN_URL || '',
  // decide if you finish OAuth on /login or /oauth/callback
  OAUTH_REDIRECT_URI: import.meta.env.VITE_OAUTH_REDIRECT_URI || '',
};