import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { usePickupFromGeolocation } from "./usePickupFromGeolocation";

vi.mock("@/lib/geocoding", () => ({ reverseGeocode: vi.fn(async () => "123 Fake St") }));

beforeEach(() => {
  const g = globalThis as unknown as { navigator?: Partial<Navigator> };
  g.navigator = g.navigator || {};
  g.navigator.geolocation = {
    getCurrentPosition: (success: PositionCallback) => {
      success({ coords: { latitude: -27.5, longitude: 153.0 } } as GeolocationPosition);
    },
  } as Geolocation;
});

describe("usePickupFromGeolocation", () => {
  test("successful locate updates address", async () => {
    const { result } = renderHook(() => usePickupFromGeolocation());
    await act(async () => { await result.current.locate(); });
    await waitFor(() => expect(result.current.address).toBe("123 Fake St"));
    expect(result.current.error).toBeNull();
  });

  test("error path sets error message", async () => {
    (globalThis as { navigator: { geolocation: Geolocation } }).navigator.geolocation.getCurrentPosition = (
      _ok: PositionCallback,
      err: PositionErrorCallback,
    ) => err(new Error("nope") as GeolocationPositionError);
    const { result } = renderHook(() => usePickupFromGeolocation());
    await act(async () => { await result.current.locate(); });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
