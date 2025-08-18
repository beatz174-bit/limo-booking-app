import { render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MapRoute } from "./MapRoute";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("MapRoute", () => {
  test("calls onMetrics when both pickup and dropoff are set", async () => {
    vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api" } }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ km: 10, min: 15 }) })) as any;
    vi.stubGlobal("fetch", fetchMock);
    const onMetrics = vi.fn();
    render(<MapRoute pickup="A" dropoff="B" onMetrics={onMetrics} />);
    await waitFor(() => expect(onMetrics).toHaveBeenCalledWith(10, 15));
  });

  test("does not call onMetrics when either address missing", async () => {
    vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api" } }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ km: 10, min: 15 }) })) as any;
    vi.stubGlobal("fetch", fetchMock);
    const onMetrics = vi.fn();
    const { rerender } = render(<MapRoute pickup="" dropoff="B" onMetrics={onMetrics} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(onMetrics).not.toHaveBeenCalled();

    rerender(<MapRoute pickup="A" dropoff="" onMetrics={onMetrics} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(onMetrics).not.toHaveBeenCalled();
  });
});
