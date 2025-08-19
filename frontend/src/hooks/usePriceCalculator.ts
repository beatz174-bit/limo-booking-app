// Hook that computes trip price based on distance and duration.
import { useEffect, useMemo, useRef, useState } from "react";

export type PriceInputs = {
  pickup: string;
  dropoff: string;
  rideTime: string;      // ISO or datetime-local string
  flagfall: number;
  perKm: number;
  perMin: number;
  distanceKm?: number;   // optional until you wire Distance Matrix
  durationMin?: number;
};

type Options = { auto?: boolean; debounceMs?: number };

export function usePriceCalculator(
//   _bookingsApi: BookingsApi | unknown,     // reserved for future server pricing
  args: PriceInputs & Options
) {
  const {
    pickup, dropoff, rideTime,
    flagfall, perKm, perMin,
    distanceKm, durationMin,
    auto, debounceMs
  } = args;

  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);      // stays false for local calc
  const [error, setError] = useState<string | null>(null);

  const argsKey = useMemo(
    () => JSON.stringify({ pickup, dropoff, rideTime, flagfall, perKm, perMin, distanceKm, durationMin }),
    [pickup, dropoff, rideTime, flagfall, perKm, perMin, distanceKm, durationMin]
  );
  const lastArgsRef = useRef("");

  const compute = async () => {
    setError(null);

    // Guard: require both addresses
    if (!pickup || !dropoff) {
      setPrice(null);
      return;
    }

    // Ride time sanity (do not block on it)
    if (rideTime) {
      // Accepts either ISO or 'YYYY-MM-DDTHH:mm' from datetime-local
      const t = Date.parse(rideTime);
      if (Number.isNaN(t)) {
        // Don’t kill pricing; just record a soft error
        setError("Invalid ride time");
      }
    }

    // Basic local fare model
    const km = typeof distanceKm === "number" ? distanceKm : 0;
    const min = typeof durationMin === "number" ? durationMin : 0;

    const p = Number(flagfall) + Number(perKm) * km + Number(perMin) * min;

    if (!Number.isFinite(p)) {
      setPrice(null);
      setError("Invalid price inputs");
      return;
    }
  setPrice(Math.max(0, Math.round(p * 100) / 100));
  };

  // Auto-calc on input changes
  useEffect(() => {
    if (!auto) return;
    if (argsKey === lastArgsRef.current) return;
    lastArgsRef.current = argsKey;

    const t = setTimeout(() => { void compute(); }, debounceMs ?? 300);
    return () => clearTimeout(t);
  }, [auto, debounceMs, argsKey]);

  return { price, loading, error, compute } as const;
}
