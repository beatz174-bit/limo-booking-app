// src/api/index.ts
import { AuthApi, Configuration } from "../api-client";

const config = new Configuration({
  basePath: import.meta.env.VITE_API_BASE_URL,
});

export const authApi = new AuthApi(config);
