import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("@/config", () => ({ CONFIG: { API_BASE_URL: "http://api" } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("useAddressAutocomplete", () => {
  test("resolves SFO to full address with coordinates", async () => {
    const { useAddressAutocomplete } = await import("./useAddressAutocomplete");
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("http://api/geocode/search?q=++sFo+");
      return {
        ok: true,
        json: async () => ({
          results: [
            {
              name: "San Francisco International Airport",
              address:
                "San Francisco International Airport, San Francisco, CA, USA",
              lat: 37.62,
              lng: -122.38,
              placeId: "sfo1",
            },
          ],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useAddressAutocomplete("  sFo ", { debounceMs: 0 })
    );

    await waitFor(() => {
      expect(result.current.suggestions[0]).toEqual({
        name: "San Francisco International Airport",
        address: "San Francisco International Airport, San Francisco, CA, USA",
        lat: 37.62,
        lng: -122.38,
        placeId: "sfo1",
      });
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("skips search when below minimum length", async () => {
    const { useAddressAutocomplete } = await import("./useAddressAutocomplete");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() =>
      useAddressAutocomplete(" a ", { debounceMs: 0, minLength: 2 })
    );

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
