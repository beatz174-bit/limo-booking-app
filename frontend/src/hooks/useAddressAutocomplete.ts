// Hook to fetch address suggestions as the user types.
import { useEffect, useState } from "react";
import { CONFIG } from "@/config";
import * as logger from "@/lib/logger";
import { apiFetch } from "@/services/apiFetch";

export interface AddressSuggestion {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface GeocodeSearchResult {
  name?: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface GeocodeSearchResponse {
  results: GeocodeSearchResult[];
}

export function useAddressAutocomplete(
  query: string,
  options?: {
    debounceMs?: number;
    coords?: { lat: number; lon: number };
    minLength?: number;
  },
) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setSessionToken] = useState<string | null>(null);
  const debounceMs = options?.debounceMs ?? 300;
  const minLength = options?.minLength ?? 3;
  const rawQuery = query;
  const trimmed = query.trim();

  useEffect(() => {
    logger.debug("hooks/useAddressAutocomplete", "query", trimmed);
  }, [trimmed]);

  useEffect(() => {
    logger.debug("hooks/useAddressAutocomplete", "debounce", debounceMs);
    if (!trimmed || trimmed.length < minLength) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const base = CONFIG.API_BASE_URL || "";
        const params = new URLSearchParams({ q: rawQuery });
        if (options?.coords) {
          params.set("lat", String(options.coords.lat));
          params.set("lon", String(options.coords.lon));
        }
        const url = `${base}/geocode/search?${params.toString()}`;
        logger.debug("hooks/useAddressAutocomplete", "request URL", url);
        const res = await apiFetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Geocode search failed");
        const data = (await res.json()) as GeocodeSearchResponse;
        const mapped: AddressSuggestion[] = (data?.results || []).map((r) => ({
          name: r.name ?? "",
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          placeId: r.placeId,
        }));
        logger.info(
          "hooks/useAddressAutocomplete",
          "suggestion count",
          mapped.length,
        );
        setSuggestions(mapped);
      } catch (e) {
        if (!controller.signal.aborted) {
          logger.warn("hooks/useAddressAutocomplete", e);
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [rawQuery, trimmed, debounceMs, minLength, options?.coords]);

  const onFocus = () => {
    setSessionToken(crypto.randomUUID());
  };
  const onBlur = () => {
    setSessionToken(null);
  };

  return { suggestions, loading, onFocus, onBlur };
}
