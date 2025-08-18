// src/pages/Booking/BookingPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
    import apiConfig, { BookingsApi, SettingsApi } from "@/components/ApiConfig";
// === OpenAPI client imports ===
// Adjust this import path to match your generated client barrel.
// Examples in your project history:
//   import { Configuration, BookingsApi, SettingsApi } from "@/components/ApiConfig";
//   // or
//   import { Configuration, BookingsApi, SettingsApi } from "@/generated";

// Types that should exist in your generated client; keep as local mirrors if needed.
type SettingsResponse = {
  flagfall: number;
  per_km_rate: number;
  per_minute_rate: number;
  google_maps_api_key?: string | null;
};

type BookingCreate = {
  pickup_location: string;
  destination: string;
  ride_time: string; // ISO
  price: number;
  status?: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string | null;
};

const MAP_PLACEHOLDER_HEIGHT = 320;
const DEFAULT_PLACEHOLDER_DISTANCE_KM = 10; // km
const DEFAULT_PLACEHOLDER_DURATION_MIN = 15; // minutes

const BookingPage: React.FC = () => {
  // Form fields
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [rideTime, setRideTime] = useState<string>(() => {
    const d = new Date(Date.now() + 15 * 60 * 1000); // now + 15min
    const pad = (n: number) => `${n}`.padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  });
  const [notes, setNotes] = useState("");

  // Settings (rates / Google key)
  const [flagfall, setFlagfall] = useState<number | null>(null);
  const [perKm, setPerKm] = useState<number | null>(null);
  const [perMin, setPerMin] = useState<number | null>(null);
  const [googleKey, setGoogleKey] = useState<string | null>(null);

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Distance + duration (placeholders now; dynamic later)
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);

  // UI state
  const [calcLoading, setCalcLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // === Inline API Configuration (no makeConfig) ===
//   const apiConfig = useMemo(() => {
//     const token =
//       localStorage.getItem("access_token") ||
//       sessionStorage.getItem("access_token") ||
//       "";

//     const basePath =
//       (import.meta as any)?.env?.VITE_API_BASE_URL ||
//       process.env.VITE_API_BASE_URL ||
//       "http://localhost:8000";

//     return new Configuration({
//       basePath,
//       accessToken: token ? `Bearer ${token}` : undefined,
//     });
//   }, []);

//   const settingsApi = useMemo(() => new SettingsApi(apiConfig), [apiConfig]);
//   const bookingsApi = useMemo(() => new BookingsApi(apiConfig), [apiConfig]);

    const settingsApi = useMemo(() => new SettingsApi(apiConfig), []);
    const bookingsApi = useMemo(() => new BookingsApi(apiConfig), []);

  // Load settings from DB on mount
  useEffect(() => {
    let mounted = true;
    setSettingsLoading(true);
    setSettingsError(null);

    (async () => {
      try {
        // Adjust if your generated method name differs
        const res = await settingsApi.apiGetSettingsSettingsGet();
        const s = res?.data as SettingsResponse;
        if (!mounted) return;

        setFlagfall(s.flagfall);
        setPerKm(s.per_km_rate);
        setPerMin(s.per_minute_rate);
        setGoogleKey(s.google_maps_api_key ?? null);
      } catch (err: any) {
        if (mounted) {
          setSettingsError("Failed to load pricing settings.");
          console.error("Settings load error:", err);
        }
      } finally {
        if (mounted) setSettingsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [settingsApi]);

  // Derived price
  const price: number | null = useMemo(() => {
    if (
      flagfall == null ||
      perKm == null ||
      perMin == null ||
      distanceKm == null ||
      durationMin == null
    ) {
      return null;
    }
    return flagfall + perKm * distanceKm + perMin * durationMin;
  }, [flagfall, perKm, perMin, distanceKm, durationMin]);

  /////////// Placeholder calculator — wire Google Distance Matrix here later ????????//////////////
  const handleCalculate = useCallback(async () => {
    setCalcLoading(true);
    setSubmitSuccess(null);
    setSubmitError(null);
    try {
      if (!pickup.trim() || !dropoff.trim()) {
        throw new Error("Please enter both pickup and dropoff locations.");
      }
      ///////////// TODO: Replace with Google Distance Matrix call using googleKey/////////////////
      setDistanceKm(DEFAULT_PLACEHOLDER_DISTANCE_KM);
      setDurationMin(DEFAULT_PLACEHOLDER_DURATION_MIN);
///////////////////////////////////////////////////////////////////////////////////////////////////////////


    } catch (err: any) {
      console.error("Calculation error:", err);
      setSubmitError(err?.message || "Failed to calculate trip.");
    } finally {
      setCalcLoading(false);
    }
  }, [pickup, dropoff]);

  const isFormValid = useMemo(
    () => Boolean(pickup.trim() && dropoff.trim() && rideTime),
    [pickup, dropoff, rideTime]
  );

  // Submit booking via API
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setSubmitError(null);
      setSubmitSuccess(null);

      if (!isFormValid) {
        setSubmitError("Please complete all required fields.");
        return;
      }
      if (price == null) {
        setSubmitError("Please calculate the price before submitting the booking.");
        return;
      }

      setSubmitLoading(true);
      try {
        const payload: BookingCreate = {
          pickup_location: pickup.trim(),
          destination: dropoff.trim(),
          ride_time: new Date(rideTime).toISOString(),
          price: Number(price.toFixed(2)),
          status: "pending",
        //////////////////////////////////////   notes: notes.trim() || null,     Add notes back in later
        };

        // Adjust if your generated method name differs
        await bookingsApi.apiCreateBookingBookingsPost(payload);

        setSubmitSuccess("Booking request submitted successfully.");
      } catch (err: any) {
        console.error("Booking submit error:", err);
        setSubmitError("Failed to create booking. Please try again.");
      } finally {
        setSubmitLoading(false);
      }
    },
    [bookingsApi, dropoff, isFormValid, notes, pickup, price, rideTime]
  );

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Book a Ride
      </Typography>

      {settingsLoading && (
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
          <CircularProgress size={20} />
          <Typography>Loading pricing settings…</Typography>
        </Box>
      )}
      {settingsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {settingsError}
        </Alert>
      )}

      <Card elevation={1}>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off">
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Pickup Location"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  fullWidth
                  required
                  autoFocus
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Dropoff Location"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Pickup Date & Time"
                  type="datetime-local"
                  value={rideTime}
                  onChange={(e) => setRideTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  fullWidth
                  placeholder="E.g. gate code, passenger name, luggage"
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Button
                    variant="contained"
                    onClick={handleCalculate}
                    disabled={!pickup.trim() || !dropoff.trim() || settingsLoading || calcLoading}
                  >
                    {calcLoading ? "Calculating…" : "Calculate Price"}
                  </Button>

                  {(distanceKm != null || durationMin != null) && (
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {distanceKm != null && `${distanceKm} km`}
                      {distanceKm != null && durationMin != null && " · "}
                      {durationMin != null && `${durationMin} min`}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Estimated Price
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {price != null ? `$${price.toFixed(2)}` : "—"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Price = flagfall + (per-km × distance) + (per-min × time)
                  </Typography>
                </Box>

                {(flagfall != null || perKm != null || perMin != null) && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Rates — Flagfall: {flagfall ?? "?"}, Per km: {perKm ?? "?"}, Per min: {perMin ?? "?"}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {googleKey
                      ? "Google Maps key detected — ready to wire Distance Matrix & Directions."
                      : "No Google key detected yet — using placeholders."}
                  </Typography>
                </Box>
              </Grid>

              {/* Map placeholder */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                    height: MAP_PLACEHOLDER_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "action.hover",
                  }}
                >
                  <Typography variant="body2" color="text.secondary" align="center">
                    Route preview coming soon.
                    <br />
                    (Google Maps Directions + Polyline)
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                {submitError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {submitError}
                  </Alert>
                )}
                {submitSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {submitSuccess}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={!isFormValid || price == null || settingsLoading || submitLoading}
                >
                  {submitLoading ? "Submitting…" : "Book Now"}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Developer notes: where to wire real Google APIs */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="overline" display="block" gutterBottom>
          Dev Notes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Replace the placeholder calculator with Google Distance Matrix to set <code>distanceKm</code> and{" "}
          <code>durationMin</code>.
          <br />
          • Render a map using <code>@react-google-maps/api</code> and a <code>DirectionsRenderer</code> for the route.
        </Typography>
      </Box>
    </Container>
  );
};

export default BookingPage;
