// Centralized runtime configuration values.
export const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  CDN_BASE_URL: import.meta.env.VITE_CDN_BASE_URL || '',

  // NEW: OAuth settings
  OAUTH_CLIENT_ID: import.meta.env.VITE_OAUTH_CLIENT_ID || '',
  OAUTH_AUTHORIZE_URL: import.meta.env.VITE_OAUTH_AUTHORIZE_URL || '',
  OAUTH_TOKEN_URL: import.meta.env.VITE_OAUTH_TOKEN_URL || '',
  // decide if you finish OAuth on /login or /oauth/callback
  OAUTH_REDIRECT_URI: import.meta.env.VITE_OAUTH_REDIRECT_URI || '',
  // Allow either GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY.
  // Vite only exposes variables prefixed with VITE_, but users may have
  // configured the key without that prefix. Check both names so either
  // environment variable will work.
  GOOGLE_MAPS_API_KEY:
    import.meta.env.GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    '',
  ORS_API_KEY: import.meta.env.VITE_ORS_API_KEY || '',
  JWT_SECRET_KEY: import.meta.env.VITE_JWT_SECRET_KEY || '',
  ENV: import.meta.env.ENV || 'development',
};

