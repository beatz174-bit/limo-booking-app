// Hook to fetch admin pricing settings from the API.
import { useEffect, useState } from "react";
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';

export type AppSettings = {
  flagfall: number;
  per_km_rate: number;
  per_minute_rate: number;
  account_mode: boolean;
  google_maps_api_key?: string;
};

export function useSettings() {
  const [data, setData] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`${CONFIG.API_BASE_URL}/settings`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.detail || `Failed to load settings (${res.status})`);
        }
        if (alive) setData(json as AppSettings);
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading, error } as const;
}