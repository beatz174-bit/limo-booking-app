// Reverse geocode helper. Prefer backend proxy; fall back to Nominatim in dev.
import { CONFIG } from "@/config";
import { formatAddress } from "@/lib/formatAddress";
import * as logger from "@/lib/logger";

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const backend = CONFIG.API_BASE_URL as string | undefined;
  logger.debug("lib/geocoding", "reverseGeocode request", { lat, lon, backend });

  if (!backend) {
    logger.warn("lib/geocoding", "No backend configured, using Nominatim fallback");
  }

  try {
    if (backend) {
      const res = await fetch(`${backend}/geocode/reverse?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error(`Backend reverse geocode failed: ${res.status}`);
      const data = await res.json();
      const address = data?.address ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      logger.info("lib/geocoding", "Reverse geocode success via backend", { address });
      return address;
    }
  } catch (e) {
    // continue to dev fallback
    logger.warn(
      "lib/geocoding",
      "Backend reverseGeocode error, falling back to Nominatim",
      e
    );
  }

  // Dev-only fallback (rate limited; do not ship to prod without a proxy)
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
    { headers: { "Accept": "application/json" } }
  );
  if (!res.ok) {
    logger.error(
      "lib/geocoding",
      `Nominatim reverseGeocode failed: ${res.status}`
    );
    throw new Error(`Reverse geocode failed: ${res.status}`);
  }
  const json = await res.json();
  const address =
    formatAddress(json.address) ||
    json.display_name ||
    `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  logger.info("lib/geocoding", "Reverse geocode success via Nominatim", { address });
  return address;
}
