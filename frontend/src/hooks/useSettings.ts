// src/hooks/useSettings.ts
import { useEffect, useState } from "react";

// Adapt these imports to your generated client / ApiConfig
import type { SettingsApi } from "@/components/ApiConfig"; // or from your generated API package

export type AppSettings = {
  flagfall: number;
  per_km_rate: number;
  per_minute_rate: number;
  account_mode: boolean;
};

export function useSettings(api: SettingsApi) {
  const [data, setData] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.apiGetSettingsSettingsGet();
        if (alive) setData(res.data as unknown as AppSettings);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load settings");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  return { data, loading, error } as const;
}