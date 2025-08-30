// Shared configuration and API client singletons.
import axios from "axios";
import {
  Configuration,
  AuthApi,
  BookingsApi,
  CustomerBookingsApi,
  UsersApi,
  SetupApi,
  SettingsApi,
  DriverBookingsApi,
  AvailabilityApi,
} from "@/api-client";
import { CONFIG } from "@/config";
import { getAccessToken } from "@/services/tokenStore";


export const configuration = new Configuration({
  basePath: CONFIG.API_BASE_URL,
});

const axiosInstance = axios.create();

axiosInstance.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Export **instances** (singletons)
export const authApi = new AuthApi(configuration, undefined, axiosInstance);
export const bookingsApi = new BookingsApi(configuration, undefined, axiosInstance);
export const customerBookingsApi = new CustomerBookingsApi(configuration, undefined, axiosInstance);
export const driverBookingsApi = new DriverBookingsApi(configuration, undefined, axiosInstance);
export const usersApi = new UsersApi(configuration, undefined, axiosInstance);
export const setupApi = new SetupApi(configuration, undefined, axiosInstance);
export const settingsApi = new SettingsApi(configuration, undefined, axiosInstance);
export const availabilityApi = new AvailabilityApi(configuration, undefined, axiosInstance);

// (Keep if you still want the classes too)
export {
  AuthApi,
  BookingsApi,
  CustomerBookingsApi,
  DriverBookingsApi,
  UsersApi,
  SetupApi,
  SettingsApi,
  AvailabilityApi,
} from "@/api-client";

export default configuration;

// Optional: token change hook
// onTokenChange(() => { /* e.g. invalidate caches if needed */ });
