import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import PriceSummary from '@/components/PriceSummary';
import FareBreakdown from '@/components/FareBreakdown';
import { useSettings } from '@/hooks/useSettings';
import { useRouteMetrics } from '@/hooks/useRouteMetrics';
import type { BookingRead } from '@/api-client';

function BookingConfirmationPage() {
  const location = useLocation();
  const booking = location.state as BookingRead | undefined;

  const { data: settings } = useSettings();
  interface SettingsAliases {
    flagfall?: number;
    per_km_rate?: number;
    perKm?: number;
    per_minute_rate?: number;
    perMin?: number;
  }
  const s = settings as SettingsAliases | undefined;
  const tariff = {
    flagfall: Number(s?.flagfall ?? 0),
    perKm: Number(s?.per_km_rate ?? s?.perKm ?? 0),
    perMin: Number(s?.per_minute_rate ?? s?.perMin ?? 0),
  };

  const getMetrics = useRouteMetrics();
  const [distanceKm, setDistanceKm] = useState<number>();
  const [durationMin, setDurationMin] = useState<number>();
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!booking) return;
    let alive = true;
    (async () => {
      const metrics = await getMetrics(
        { lat: booking.pickup_lat, lon: booking.pickup_lng },
        { lat: booking.dropoff_lat, lon: booking.dropoff_lng },
        booking.pickup_when,
      );
      if (metrics && alive) {
        setDistanceKm(metrics.km);
        setDurationMin(metrics.min);
      }
    })();
    return () => {
      alive = false;
    };
  }, [booking, getMetrics]);

  if (!booking) {
    return (
      <Box p={2}>
        <Typography>Booking not found.</Typography>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Stack spacing={2}>
        <Typography variant="h4">Booking Confirmed!</Typography>
        <Typography>
          Your tracking code is <strong>{booking.public_code}</strong>
        </Typography>
        <Button component={RouterLink} to={`/history/${booking.id}`}>View ride details</Button>
        <PriceSummary
          pickup={booking.pickup_address}
          dropoff={booking.dropoff_address}
          rideTime={booking.pickup_when}
          flagfall={tariff.flagfall}
          perKm={tariff.perKm}
          perMin={tariff.perMin}
          distanceKm={distanceKm}
          durationMin={durationMin}
          onPrice={setPrice}
        />
        <FareBreakdown
          price={price}
          flagfall={tariff.flagfall}
          perKm={tariff.perKm}
          perMin={tariff.perMin}
          distanceKm={distanceKm}
          durationMin={durationMin}
        />
      </Stack>
    </Box>
  );
}

export default BookingConfirmationPage;
