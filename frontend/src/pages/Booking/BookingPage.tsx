// src/pages/Booking/BookingPage.tsx
import { useMemo, useState, useEffect, useCallback } from "react";
import { Alert, Box, Button, Card, CardContent, Grid, Stack, Typography } from "@mui/material";

// Adapt these to your actual exports
// import apiConfig, {  SettingsApi, BookingsApi } from "@/components/ApiConfig";

import { settingsApi, bookingsApi } from "@/components/ApiConfig";
import type { BookingCreate } from "@/api-client";
// const { data: settings } = useSettings(settingsApi);


import { useSettings } from "@/hooks/useSettings";
import { usePickupFromGeolocation } from "@/hooks/usePickupFromGeolocation";
import { minFutureDateTime } from "@/lib/datetime";

import { AddressField } from "@/components/AddressField";
import { DateTimeField } from "@/components/DateTimeField";
import { PriceSummary } from "@/components/PriceSummary";
import FareBreakdown from "@/components/FareBreakdown";
import { DevOnly } from "@/contexts/DevFeaturesContext";
import { MapRoute } from "@/components/MapRoute";
import { MapProvider } from "@/components/MapProvider";

export default function BookingPage() {
  // Acquire API instances once (e.g., from context or a helper factory)
  // const settingsApi = useMemo(() => new SettingsApi(apiConfig), []);
  // const bookingsApi = useMemo(() => new BookingsApi(apiConfig), []);
  // const { data: settings } = useSettings(settingsApi);

  const { data: settings, loading: settingsLoading, error: settingsError } = useSettings(settingsApi);

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupRoute, setPickupRoute] = useState("");
  const [dropoffRoute, setDropoffRoute] = useState("");
  const [rideTime, setRideTime] = useState(minFutureDateTime(5));

  const [distanceKm, setDistanceKm] = useState<number | undefined>(undefined);
  const [durationMin, setDurationMin] = useState<number | undefined>(undefined);
  const [price, setPrice] = useState<number | null>(null);

  const handleMetrics = useCallback((km: number, min: number) => {
    setDistanceKm(km);
    setDurationMin(min);
  }, []);

  const geo = usePickupFromGeolocation();

  interface SettingsAliases {
    flagfall?: number;
    per_km_rate?: number;
    perKm?: number;
    per_minute_rate?: number;
    perMin?: number;
    google_maps_api_key?: string;
  }

  const tariff = useMemo(() => {
    const s = settings as SettingsAliases | null;
    return {
      flagfall: Number(s?.flagfall ?? 0),
      perKm: Number(s?.per_km_rate ?? s?.perKm ?? 0),
      perMin: Number(s?.per_minute_rate ?? s?.perMin ?? 0),
    };
  }, [settings]);


  useEffect(() => {
    // auto locate on first render
    geo.locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when geocoded address arrives, populate pickup once (if empty)
  useEffect(() => {
    if (!pickup && geo.address) {
      setPickup(geo.address);
    }
    if (geo.address) {
      setPickupRoute(geo.address);
    }
  }, [geo.address, pickup]);

  // Update pickup when geolocation hook resolves an address
  const pickupValue = geo.address || pickup;

  async function submitBooking() {
    if (!settings) return;
    try {
      const payload: BookingCreate = {
        pickup_location: pickup.trim(),
        destination: dropoff.trim(),
        ride_time: new Date(rideTime).toISOString(),
        price: price || 0,
      };
      // TODO: Replace with your actual request object + API call
      await bookingsApi.apiCreateBookingBookingsPost(payload)
      alert("Booking submitted");
    } catch (e: unknown) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to submit booking");
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Make a Booking
      </Typography>

      {settingsError && <Alert severity="error">{settingsError}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <AddressField
                  id="pickup"
                  label="Pickup address"
                  value={pickupValue}
                  onChange={(v) => {
                    setPickup(v);
                    // stop the derived value from overriding user input after first set
                    if (geo.address) geo.setAddress("");
                  }}
                  onBlur={setPickupRoute}
                  onUseLocation={geo.locate}
                  locating={geo.locating}
                  errorText={geo.error ?? undefined}
                />

                <AddressField
                  id="dropoff"
                  label="Dropoff address"
                  value={dropoff}
                  onChange={setDropoff}
                  onBlur={setDropoffRoute}
                />

                <DateTimeField
                  id="rideTime"
                  label="Pickup date & time"
                  value={rideTime}
                  onChange={setRideTime}
                  min={minFutureDateTime(5)}
                />

                <MapProvider apiKey={settings?.google_maps_api_key}>
                  <MapRoute
                    pickup={pickupRoute}
                    dropoff={dropoffRoute}
                    rideTime={rideTime}
                    onMetrics={handleMetrics}
                  />
                </MapProvider>

                <Stack direction="row" spacing={1}>
                  <Button variant="contained" onClick={submitBooking} disabled={settingsLoading}>
                    Book now
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <PriceSummary
                pickup={pickupRoute}
                dropoff={dropoffRoute}
                rideTime={rideTime}
                flagfall={tariff.flagfall}
                perKm={tariff.perKm}
                perMin={tariff.perMin}
                distanceKm={distanceKm}
                durationMin={durationMin}
                onPrice={setPrice}
              />
              <DevOnly>
                <FareBreakdown
                  price={price}
                  flagfall={tariff.flagfall}
                  perKm={tariff.perKm}
                  perMin={tariff.perMin}
                  distanceKm={distanceKm}
                  durationMin={durationMin}
                />
              </DevOnly>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

