import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { usePickupFromGeolocation } from "./usePickupFromGeolocation";

vi.mock("@/lib/geocoding", () => ({ reverseGeocode: vi.fn(async () => "123 Fake St") }));

beforeEach(() => {
  (globalThis as any).navigator = (globalThis as any).navigator || ({} as any);
  (globalThis as any).navigator.geolocation = {
    getCurrentPosition: (success: any, _error: any) => {
      success({ coords: { latitude: -27.5, longitude: 153.0 } });
    }
  } as any;
});

describe("usePickupFromGeolocation", () => {
  test("successful locate updates address", async () => {
    const { result } = renderHook(() => usePickupFromGeolocation());
    await act(async () => { await result.current.locate(); });
    await waitFor(() => expect(result.current.address).toBe("123 Fake St"));
    expect(result.current.error).toBeNull();
  });

  test("error path sets error message", async () => {
    (globalThis as any).navigator.geolocation.getCurrentPosition = (_ok: any, err: any) => err(new Error("nope"));
    const { result } = renderHook(() => usePickupFromGeolocation());
    await act(async () => { await result.current.locate(); });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
