// src/components/ApiConfig.test.ts
import { vi, describe, test, expect, afterEach } from "vitest";
import type { AxiosRequestConfig } from "axios";

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

const tokenFn = vi.fn(async () => "token-abc");
vi.mock("@/services/tokenStore", () => ({
  getAccessToken: tokenFn,
  onTokenChange: vi.fn(),
}));

const requestHandlers: Array<
  (cfg: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>
> = [];
const axiosInstance = {
  interceptors: {
    request: {
      use: (
        fn: (
          cfg: AxiosRequestConfig,
        ) => AxiosRequestConfig | Promise<AxiosRequestConfig>,
      ) => requestHandlers.push(fn),
    },
  },
};
const createFn = vi.fn(() => axiosInstance);
vi.mock("axios", () => ({ default: { create: createFn } }));

vi.mock("@/api-client", () => {
  class Configuration {
    basePath: string;
    constructor(opts: { basePath: string }) {
      this.basePath = opts.basePath;
    }
  }
  class FakeApi {
    cfg: Configuration;
    axios: unknown;
    constructor(cfg: Configuration, _basePath?: string, axiosArg?: unknown) {
      this.cfg = cfg;
      this.axios = axiosArg;
    }
  }
  return {
    Configuration,
    AuthApi: FakeApi,
    BookingsApi: FakeApi,
    CustomerBookingsApi: FakeApi,
    DriverBookingsApi: FakeApi,
    UsersApi: FakeApi,
    SetupApi: FakeApi,
    SettingsApi: FakeApi,
    AvailabilityApi: FakeApi,
  };
});

vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "https://api.example.test" } }));

describe("ApiConfig", () => {
  test("constructs clients with shared axios and interceptor", async () => {
    const mod = await import("./ApiConfig");
    const {
      configuration,
      authApi,
      bookingsApi,
      customerBookingsApi,
      driverBookingsApi,
      usersApi,
      setupApi,
      settingsApi,
      availabilityApi,
    } = mod;

    const cfgTyped = configuration as Configuration;
    expect(cfgTyped.basePath).toBe("https://api.example.test");
    expect(createFn).toHaveBeenCalledTimes(1);

    const clients = [
      authApi,
      bookingsApi,
      customerBookingsApi,
      driverBookingsApi,
      usersApi,
      setupApi,
      settingsApi,
      availabilityApi,
    ];
    for (const api of clients) {
      const client = api as FakeApi;
      expect(client.axios).toBe(axiosInstance);
    }

    expect(requestHandlers).toHaveLength(1);
    const handler = requestHandlers[0];
    const cfg: AxiosRequestConfig = { headers: {} };
    await handler(cfg);
    expect(tokenFn).toHaveBeenCalled();
    expect(cfg.headers.Authorization).toBe("Bearer token-abc");
  });
});
