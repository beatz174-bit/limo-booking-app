import { useState, useEffect } from 'react';
import { Stepper, Step, StepLabel, Box } from '@mui/material';
import SelectTimeStep from './SelectTimeStep';
import TripDetailsStep from './TripDetailsStep';
import PaymentStep from './PaymentStep';
import { MapProvider } from '@/components/MapProvider';
import { MapRoute } from '@/components/MapRoute';
import { BookingFormData } from '@/types/BookingFormData';
import { useAuth } from '@/contexts/AuthContext';

const steps = ['Select time', 'Trip details', 'Payment'];

export default function BookingWizard() {
  const { userName, user, phone } = useAuth();
  const [active, setActive] = useState(0);
  const [form, setForm] = useState<BookingFormData>({
    passengers: 1,
    notes: '',
    customer: {
      name: userName ?? undefined,
      email: user?.email ?? undefined,
      phone: phone ?? user?.phone ?? undefined,
    },
    pickupValid: false,
    dropoffValid: false,
  });
  useEffect(() => {
    setForm((f) => ({
      ...f,
      customer: {
        ...f.customer,
        name: userName ?? undefined,
        email: user?.email ?? undefined,
        phone: phone ?? user?.phone ?? undefined,
      },
    }));
  }, [userName, user?.email, phone, user?.phone]);
  const update = (data: Partial<BookingFormData>) => {
    setForm((f) => ({ ...f, ...data }));
  };
  const next = (data: Partial<BookingFormData>) => {
    update(data);
    setActive((s) => s + 1);
  };
  const back = () => setActive((s) => s - 1);

  return (
    <Box>
      <Stepper activeStep={active} sx={{ mb: 2 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {active === 0 && <SelectTimeStep data={form} onNext={next} />}
      {active === 1 && (
        <TripDetailsStep data={form} onChange={update} onNext={next} onBack={back} />
      )}
      {active === 2 && (
        <PaymentStep data={form as Required<BookingFormData>} onBack={back} />
      )}
      {active > 0 && form.pickupValid && form.dropoffValid && (
        <Box mt={2}>
          <MapProvider>
            <MapRoute
              pickup={form.pickup}
              dropoff={form.dropoff}
              rideTime={form.pickup_when}
            />
          </MapProvider>
        </Box>
      )}
    </Box>
  );
}
