// src/components/ApiConfig.test.ts
import { vi, describe, test, expect, afterEach } from "vitest";

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

const tokenFn = vi.fn(async () => "token-abc");
vi.mock("@/services/tokenStore", () => ({
  getAccessToken: tokenFn,
  onTokenChange: vi.fn(),
}));

vi.mock("@/api-client", () => {
  class Configuration {
    basePath: string;
    accessToken: () => Promise<string>;
    constructor(opts: { basePath: string; accessToken: () => Promise<string> }) {
      this.basePath = opts.basePath;
      this.accessToken = opts.accessToken;
    }
  }
  class FakeApi {
    cfg: Configuration;
    constructor(cfg: Configuration) {
      this.cfg = cfg;
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
  test("constructs clients with basePath and token getter", async () => {
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
    } = mod;

    // config assertions
    const cfgTyped = configuration as Configuration;
    expect(cfgTyped.basePath).toBe("https://api.example.test");
    expect(typeof cfgTyped.accessToken).toBe("function");
    await expect(cfgTyped.accessToken()).resolves.toBe("token-abc");

    // clients share same Configuration
    for (const api of [
      authApi,
      bookingsApi,
      customerBookingsApi,
      driverBookingsApi,
      usersApi,
      setupApi,
      settingsApi,
    ]) {
      const client = api as FakeApi;
      expect(client).toBeTruthy();
      expect(client.cfg.basePath).toBe("https://api.example.test");
    }
  });
});
