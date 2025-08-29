import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useAddressAutocomplete } from "./useAddressAutocomplete";

describe("useAddressAutocomplete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("returns formatted suggestions for airport codes", async () => {
    const sample = [
      { name: "JFK", address: { city: "Queens", postcode: "11430" } },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => sample }))
    );

    const { result } = renderHook(() =>
      useAddressAutocomplete("jf", { debounceMs: 0 })
    );

    await waitFor(() => {
      expect(result.current.suggestions[0].address).toBe("12/34 Main St Springfield 1234");
    });
  });

  test("returns formatted suggestions for POIs", async () => {
    const sample = [
      {
        name: "Central Park",
        address: { city: "New York", postcode: "10022" },
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => sample }))
    );

    const { result } = renderHook(() =>
      useAddressAutocomplete("central", { debounceMs: 0 })
    );

    await waitFor(() => {
      expect(result.current.suggestions[0]).toEqual({
        name: "Central Park",
        address: sample[0].address,
        display: "Central Park, New York 10022",
      });
    });
  });
});

