import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { useSettings } from "./useSettings";
import { apiFetch } from '@/services/apiFetch';

vi.mock('@/services/apiFetch');

describe("useSettings", () => {
  const mockFetch = apiFetch as unknown as vi.Mock;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("loads settings and exposes data/loading/error", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ flagfall: 3, per_km_rate: 2, per_minute_rate: 1, account_mode: false }),
        { status: 200 }
      )
    );
    const { result } = renderHook(() => useSettings());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalled();
    expect(result.current.data).toEqual({ flagfall: 3, per_km_rate: 2, per_minute_rate: 1, account_mode: false });
    expect(result.current.error).toBeNull();
  });

  test("propagates error state on failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
