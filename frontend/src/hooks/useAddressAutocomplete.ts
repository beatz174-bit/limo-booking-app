// Hook to fetch address suggestions as the user types.
import { useEffect, useState } from "react";
import { CONFIG } from "@/config";
import { formatAddress } from "@/lib/formatAddress";

export interface AddressSuggestion {
  display: string;
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
        const backend = CONFIG.API_BASE_URL as string | undefined;
        let url: string;
        if (backend) {
          const u = new URL("/geocode/search", backend || window.location.origin);
          u.searchParams.set("q", query);
          url = u.toString();
        } else {
          url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
        }
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Autocomplete failed");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.results || [];
        setSuggestions(
          list
            .map((item: Record<string, unknown>) => ({
              display: formatAddress((item as { address?: Record<string, unknown> }).address || item),
            }))
            .filter((s: AddressSuggestion) => !!s.display)
        );
      } catch (e) {
        if (!controller.signal.aborted) {
          console.warn(e);
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

