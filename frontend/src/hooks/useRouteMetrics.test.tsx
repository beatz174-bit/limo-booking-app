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
        "http://api/route-metrics?pickup=A&dropoff=B&ride_time=2020-01-01T00%3A00%3A00.000Z"
      );
      return { ok: true, json: async () => ({ km: 10, min: 15 }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useRouteMetrics());
    const data = await result.current("A", "B", "2020-01-01T00:00:00.000Z");
    expect(data).toEqual({ km: 10, min: 15 });
  });

  test("returns null on failure", async () => {
    vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api" } }));
    const fetchMock = vi.fn(async () => ({ ok: false }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useRouteMetrics());
    expect(await result.current("A", "B", "2020-01-01T00:00:00.000Z")).toBeNull();
    expect(await result.current("", "B", "2020-01-01T00:00:00.000Z")).toBeNull();
  });

  test("encodes spaces in params", async () => {
    vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api" } }));
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe(
        "http://api/route-metrics?pickup=A+B&dropoff=C+D&ride_time=2020-01-01T00%3A00%3A00.000Z"
      );
      return { ok: true, json: async () => ({ km: 1, min: 2 }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useRouteMetrics());
    await result.current("A B", "C D", "2020-01-01T00:00:00.000Z");
  });
});
