import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useRouteMetrics } from "./useRouteMetrics";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("useRouteMetrics", () => {
  test("fetches metrics from backend", async () => {
    vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api" } }));
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe(
        "http://api/route-metrics?pickup=1%2C2&dropoff=3%2C4&ride_time=2020-01-01T00%3A00%3A00.000Z"
      );
      return { ok: true, json: async () => ({ km: 10, min: 15 }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useRouteMetrics());
    const data = await result.current(
      { lat: 1, lon: 2 },
      { lat: 3, lon: 4 },
      "2020-01-01T00:00:00.000Z"
    );
    expect(data).toEqual({ km: 10, min: 15 });
  });

  test("returns null on failure", async () => {
    vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api" } }));
    const fetchMock = vi.fn(async () => ({ ok: false }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useRouteMetrics());
    expect(
      await result.current(
        { lat: 1, lon: 2 },
        { lat: 3, lon: 4 },
        "2020-01-01T00:00:00.000Z"
      )
    ).toBeNull();
    expect(
      await result.current(
        undefined as unknown as { lat: number; lon: number },
        { lat: 3, lon: 4 },
        "2020-01-01T00:00:00.000Z"
      )
    ).toBeNull();
  });
});
