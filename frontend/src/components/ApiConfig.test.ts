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
    accessToken: any;
    constructor(opts: any) {
      this.basePath = opts.basePath;
      this.accessToken = opts.accessToken;
    }
  }
  class FakeApi {
    cfg: Configuration;
    constructor(cfg: any) {
      this.cfg = cfg;
    }
  }
  return {
    Configuration,
    AuthApi: FakeApi,
    BookingsApi: FakeApi,
    UsersApi: FakeApi,
    SetupApi: FakeApi,
    SettingsApi: FakeApi,
  };
});

vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "https://api.example.test" } }));

describe("ApiConfig", () => {
  test("constructs clients with basePath and token getter", async () => {
    const mod = await import("./ApiConfig");
    const cfg = mod.default;
    const { authApi, bookingsApi, usersApi, setupApi, settingsApi } = mod;

    // config assertions
    expect((cfg as any).basePath).toBe("https://api.example.test");
    expect(typeof (cfg as any).accessToken).toBe("function");
    await expect((cfg as any).accessToken()).resolves.toBe("token-abc");

    // clients share same Configuration
    for (const api of [authApi, bookingsApi, usersApi, setupApi, settingsApi]) {
      expect(api).toBeTruthy();
      expect((api as any).cfg.basePath).toBe("https://api.example.test");
    }
  });
});
