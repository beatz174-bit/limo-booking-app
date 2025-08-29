// Hook to fetch address suggestions as the user types.
import { useEffect, useState } from "react";
import { CONFIG } from "@/config";
import * as logger from "@/lib/logger";

export interface AddressSuggestion {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

export function useAddressAutocomplete(
  query: string,
  options?: { debounceMs?: number }
) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceMs = options?.debounceMs ?? 300;

  useEffect(() => {
    logger.debug("hooks/useAddressAutocomplete", "query", query);
  }, [query]);

  useEffect(() => {
    logger.debug("hooks/useAddressAutocomplete", "debounce", debounceMs);
    if (!query) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const key = CONFIG.GOOGLE_MAPS_API_KEY;
        const autoUrl = new URL(
          "https://maps.googleapis.com/maps/api/place/autocomplete/json"
        );
        autoUrl.searchParams.set("input", query);
        autoUrl.searchParams.set("key", key);
        logger.debug(
          "hooks/useAddressAutocomplete",
          "request URL",
          autoUrl.toString()
        );
        const autoRes = await fetch(autoUrl.toString(), {
          signal: controller.signal,
        });
        if (!autoRes.ok) throw new Error("Autocomplete failed");
        const autoData = await autoRes.json();
        const predictions = (autoData?.predictions || []).slice(0, 5);
        const details = await Promise.all(
          predictions.map(async (p: Record<string, unknown>) => {
            const placeId = (p as { place_id?: string }).place_id;
            if (!placeId) return null;
            const detUrl = new URL(
              "https://maps.googleapis.com/maps/api/place/details/json"
            );
            detUrl.searchParams.set("place_id", placeId);
            detUrl.searchParams.set("key", key);
            detUrl.searchParams.set(
              "fields",
              "place_id,name,formatted_address,geometry/location"
            );
            const detRes = await fetch(detUrl.toString(), {
              signal: controller.signal,
            });
            if (!detRes.ok) return null;
            const detData = await detRes.json();
            const r = detData.result || {};
            const loc = r.geometry?.location || {};
            return {
              name: r.name || "",
              address: r.formatted_address || "",
              lat: loc.lat,
              lng: loc.lng,
              placeId: r.place_id || "",
            } as AddressSuggestion;
          })
        );
        const mapped = details.filter(
          (s): s is AddressSuggestion => !!s && !!s.address
        );
        logger.debug(
          "hooks/useAddressAutocomplete",
          "suggestion count",
          mapped.length
        );
        setSuggestions(mapped);
      } catch (e) {
        if (!controller.signal.aborted) {
          logger.error("hooks/useAddressAutocomplete", e);
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
  }, [query, debounceMs]);

  return { suggestions, loading };
}

