import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useAddressAutocomplete } from "./useAddressAutocomplete";

const sample = [
  {
    address: {
      unit: "12",
      house_number: "34",
      road: "Main St",
      suburb: "Springfield",
      postcode: "1234",
    },
  },
];

describe("useAddressAutocomplete", () => {
  test("returns formatted suggestions", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => sample,
    })));

    const { result } = renderHook(() => useAddressAutocomplete("123", { debounceMs: 0 }));

    await waitFor(() => {
      expect(result.current.suggestions[0].display).toBe("12/34 Main St Springfield 1234");
    });

    vi.unstubAllGlobals();
  });
});
