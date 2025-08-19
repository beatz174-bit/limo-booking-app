import { render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MapRoute } from "./MapRoute";

beforeEach(() => {
  (globalThis as Record<string, unknown>).google = {
    maps: {
      Map: vi.fn(),
      DirectionsService: vi.fn(() => ({
        route: vi.fn(() => Promise.resolve({ routes: [{ legs: [{ distance: { value: 1000 }, duration: { value: 600 } }] }] }))
      })),
      DirectionsRenderer: vi.fn(() => ({ setMap: vi.fn(), setDirections: vi.fn() })),
      TravelMode: { DRIVING: "DRIVING" },
    },
  } as unknown;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
  // @ts-expect-error cleanup test globals
  delete (globalThis as Record<string, unknown>).google;
  // @ts-expect-error cleanup test globals
  delete (globalThis as Record<string, unknown>).gm_authFailure;
});

describe("MapRoute", () => {
  test("calls onMetrics when both pickup and dropoff are set", async () => {
    vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api", GOOGLE_MAPS_API_KEY: "KEY" } }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ km: 10, min: 15 }) }));
    vi.stubGlobal("fetch", fetchMock);
    const onMetrics = vi.fn();
    render(<MapRoute pickup="A" dropoff="B" onMetrics={onMetrics} />);
    await waitFor(() => expect(onMetrics).toHaveBeenCalledWith(10, 15));
  });

  test("does not refetch metrics on rerender with same addresses", async () => {
    vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api", GOOGLE_MAPS_API_KEY: "KEY" } }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ km: 10, min: 15 }) }));
    vi.stubGlobal("fetch", fetchMock);
    const onMetrics = vi.fn();
    const { rerender } = render(<MapRoute pickup="A" dropoff="B" onMetrics={onMetrics} />);
    await waitFor(() => expect(onMetrics).toHaveBeenCalledWith(10, 15));
    fetchMock.mockClear();
    onMetrics.mockClear();

    rerender(<MapRoute pickup="A" dropoff="B" onMetrics={onMetrics} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onMetrics).not.toHaveBeenCalled();
  });

  test("does not call onMetrics when either address missing", async () => {
    vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api", GOOGLE_MAPS_API_KEY: "KEY" } }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ km: 10, min: 15 }) }));
    vi.stubGlobal("fetch", fetchMock);
    const onMetrics = vi.fn();
    const { rerender } = render(<MapRoute pickup="" dropoff="B" onMetrics={onMetrics} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(onMetrics).not.toHaveBeenCalled();

    rerender(<MapRoute pickup="A" dropoff="" onMetrics={onMetrics} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(onMetrics).not.toHaveBeenCalled();
  });

  test("handles invalid API key gracefully", async () => {
    vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api" } }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ km: 10, min: 15 }) }));
    vi.stubGlobal("fetch", fetchMock);
    // simulate no google maps loaded
    // @ts-expect-error removing global test stub
    delete (globalThis as Record<string, unknown>).google;
    const { container } = render(<MapRoute pickup="A" dropoff="B" apiKey="BAD" />);
    await waitFor(() => expect(typeof (window as Record<string, unknown>).gm_authFailure).toBe("function"));
    if (typeof (window as Record<string, unknown>).gm_authFailure === "function") {
      ((window as Record<string, unknown>).gm_authFailure as () => void)();
    }
    await waitFor(() => expect(container.textContent).toContain("Map failed to load"));
  });
});
