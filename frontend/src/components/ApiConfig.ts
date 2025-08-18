// src/api/index.ts
// import { AuthApi, Configuration } from "../api-client";

import { Configuration } from "@/api-client";
import { CONFIG } from "@/config";
import { getAccessToken, onTokenChange } from "@/services/tokenStore";


const config = new Configuration({
  basePath: CONFIG.API_BASE_URL,
  accessToken: async () => getAccessToken() ?? "",
});

// export const authApi = new AuthApi(config);
export { AuthApi, BookingsApi, UsersApi, SetupApi, SettingsApi } from "@/api-client";

// (Optional) If you want to react on token change for anything (e.g. invalidate caches), hook here
onTokenChange(() => {});

export default config;