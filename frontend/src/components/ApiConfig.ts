// Shared configuration and API client singletons.
import { Configuration, AuthApi, BookingsApi, UsersApi, SetupApi, SettingsApi, DriverBookingsApi, AvailabilityApi } from "@/api-client";
import { CONFIG } from "@/config";
import { getAccessToken } from "@/services/tokenStore";


const configuration = new Configuration({
  basePath: CONFIG.API_BASE_URL,
  accessToken: async () => getAccessToken() ?? "",
});

// Export **instances** (singletons)
export const authApi           = new AuthApi(configuration);
export const bookingsApi       = new BookingsApi(configuration);
export const driverBookingsApi = new DriverBookingsApi(configuration);
export const usersApi          = new UsersApi(configuration);
export const setupApi          = new SetupApi(configuration);
export const settingsApi       = new SettingsApi(configuration);
export const availabilityApi   = new AvailabilityApi(configuration);

// (Keep if you still want the classes too)
export { AuthApi, BookingsApi, UsersApi, SetupApi, SettingsApi, DriverBookingsApi, AvailabilityApi } from "@/api-client";

// Optional: token change hook
// onTokenChange(() => { /* e.g. invalidate caches if needed */ });

// (Optional) still export default for legacy imports
export default configuration;