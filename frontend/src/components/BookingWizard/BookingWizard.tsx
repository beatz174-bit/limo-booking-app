import { useState } from 'react';
import { Box, Button } from '@mui/material';
import TripDetails from './TripDetails';
import PaymentStep from './PaymentStep';
import { MapProvider } from '@/components/MapProvider';
import { MapRoute } from '@/components/MapRoute';
import { BookingFormData } from '@/types/BookingFormData';

export default function BookingWizard() {
  const [form, setForm] = useState<BookingFormData>({
    passengers: 1,
    notes: '',
    pickupValid: false,
    dropoffValid: false,
  });
  const [confirmed, setConfirmed] = useState(false);
  const update = (data: Partial<BookingFormData>) => {
    setForm((f) => ({ ...f, ...data }));
  };

  if (confirmed) {
    return (
      <PaymentStep
        data={form as Required<BookingFormData>}
        onBack={() => setConfirmed(false)}
      />
    );
  }

  return (
    <Box>
      <TripDetails data={form} onChange={update} />
      {form.pickupValid && form.dropoffValid && (
        <Box mt={2}>
          <MapProvider>
            <MapRoute
              pickup={form.pickup}
              dropoff={form.dropoff}
              rideTime={form.pickup_when}
            />
          </MapProvider>
          <Button
            sx={{ mt: 2 }}
            variant="contained"
            onClick={() => setConfirmed(true)}
          >
            Confirm booking
          </Button>
        </Box>
      )}
    </Box>
  );
}
