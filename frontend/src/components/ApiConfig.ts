// src/api/index.ts
// import { AuthApi, Configuration } from "../api-client";

import { Configuration, AuthApi, BookingsApi, UsersApi, SetupApi, SettingsApi } from "@/api-client";
import { CONFIG } from "@/config";
import { getAccessToken, onTokenChange } from "@/services/tokenStore";


const configuration = new Configuration({
  basePath: CONFIG.API_BASE_URL,
  accessToken: async () => getAccessToken() ?? "",
});

// Export **instances** (singletons)
export const authApi     = new AuthApi(configuration);
export const bookingsApi = new BookingsApi(configuration);
export const usersApi    = new UsersApi(configuration);
export const setupApi    = new SetupApi(configuration);
export const settingsApi = new SettingsApi(configuration);

// (Keep if you still want the classes too)
export { AuthApi, BookingsApi, UsersApi, SetupApi, SettingsApi } from "@/api-client";

// Optional: token change hook
// onTokenChange(() => { /* e.g. invalidate caches if needed */ });

// (Optional) still export default for legacy imports
export default configuration;