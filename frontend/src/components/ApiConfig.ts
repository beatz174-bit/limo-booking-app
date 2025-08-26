// Shared configuration and API client singletons.
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
  accessToken: async () => getAccessToken() ?? "",
});

// Export **instances** (singletons)
export const authApi = new AuthApi(configuration);
export const bookingsApi = new BookingsApi(configuration);
export const customerBookingsApi = new CustomerBookingsApi(configuration);
export const driverBookingsApi = new DriverBookingsApi(configuration);
export const usersApi = new UsersApi(configuration);
export const setupApi = new SetupApi(configuration);
export const settingsApi = new SettingsApi(configuration);
export const availabilityApi = new AvailabilityApi(configuration);

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
