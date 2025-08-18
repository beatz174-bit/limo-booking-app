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
      expect(url).toBe("http://api/route-metrics?pickup=A&dropoff=B");
      return { ok: true, json: async () => ({ km: 10, min: 15 }) } as any;
    });
    vi.stubGlobal("fetch", fetchMock as any);
    const { result } = renderHook(() => useRouteMetrics());
    const data = await result.current("A", "B");
    expect(data).toEqual({ km: 10, min: 15 });
  });

  test("returns null on failure", async () => {
    vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api" } }));
    const fetchMock = vi.fn(async () => ({ ok: false })) as any;
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useRouteMetrics());
    expect(await result.current("A", "B")).toBeNull();
    expect(await result.current("", "B")).toBeNull();
  });
});
