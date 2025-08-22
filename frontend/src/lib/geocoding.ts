// Reverse geocode helper. Prefer backend proxy; fall back to Nominatim in dev.
import { CONFIG } from "@/config";
import { formatAddress } from "@/lib/formatAddress";
import * as logger from "@/lib/logger";

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
    
    const backend = CONFIG.API_BASE_URL as string | undefined;

  try {
    if (backend) {
      const res = await fetch(`${backend}/geocode/reverse?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error(`Backend reverse geocode failed: ${res.status}`);
      const data = await res.json();
      return data?.address ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }
  } catch (e) {
    // continue to dev fallback
    logger.warn("lib/geocoding", "Backend reverseGeocode error, falling back to Nominatim", e);
  }

  // Dev-only fallback (rate limited; do not ship to prod without a proxy)
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
    { headers: { "Accept": "application/json" } }
  );
  if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);
  const json = await res.json();
  return formatAddress(json.address) || json.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
