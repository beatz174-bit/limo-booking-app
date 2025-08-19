// Hook that gets a pickup address based on the user's geolocation.
import { useCallback, useState } from "react";
import { reverseGeocode } from "@/lib/geocoding";

export function usePickupFromGeolocation() {
  const [locating, setLocating] = useState(false);
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async () => {
    setError(null);
    setLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((ok, err) =>
        navigator.geolocation.getCurrentPosition(ok, err, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        })
      );
      const addr = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      setAddress(addr);
    } catch (e: any) {
      setError(e?.message ?? "Unable to retrieve your location");
    } finally {
      setLocating(false);
    }
  }, []);

  return { locating, address, setAddress, error, locate } as const;
}