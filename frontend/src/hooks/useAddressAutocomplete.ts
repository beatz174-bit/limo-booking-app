// Hook to fetch address suggestions as the user types.
import { useEffect, useState } from "react";
import { CONFIG } from "@/config";
import { formatAddress } from "@/lib/formatAddress";
import * as logger from "@/lib/logger";

export interface AddressSuggestion {
  name: string;
  address: string;
}

export function useAddressAutocomplete(query: string, options?: { debounceMs?: number }) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const base = (CONFIG.API_BASE_URL as string | undefined) || window.location.origin;
        const u = new URL("/geocode/search", base);
        u.searchParams.set("q", query);
        const url = u.toString();
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Autocomplete failed");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.results || [];
        setSuggestions(
          list
            .map((item: Record<string, unknown>) => ({
              name: (item as { name?: string }).name || "",
              address: formatAddress((item as { address?: Record<string, unknown> }).address || item),
            }))
            .filter((s: AddressSuggestion) => !!s.address)
        );
      } catch (e) {
        if (!controller.signal.aborted) {
          logger.warn("hooks/useAddressAutocomplete", e);
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, options?.debounceMs ?? 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, options?.debounceMs]);

  return { suggestions, loading };
}

