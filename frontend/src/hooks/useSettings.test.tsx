import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useSettings } from "./useSettings";

class FakeSettingsApi {
  apiGetSettingsSettingsGet = vi.fn(async () => ({ data: { flagfall: 3, per_km_rate: 2, per_minute_rate: 1, account_mode: false } }));
}

describe("useSettings", () => {
  test("loads settings and exposes data/loading/error", async () => {
    const api = new FakeSettingsApi() as any;
    const { result } = renderHook(() => useSettings(api));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.apiGetSettingsSettingsGet).toHaveBeenCalled();
    expect(result.current.data).toEqual({ flagfall: 3, per_km_rate: 2, per_minute_rate: 1, account_mode: false });
    expect(result.current.error).toBeNull();
  });

  test("propagates error state on failure", async () => {
    class BadApi { apiGetSettingsSettingsGet = vi.fn(async () => { throw new Error("boom"); }); }
    const api = new BadApi() as any;
    const { result } = renderHook(() => useSettings(api));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
