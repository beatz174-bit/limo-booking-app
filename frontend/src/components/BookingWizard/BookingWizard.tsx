import { useState } from 'react';
import { Stepper, Step, StepLabel, Box } from '@mui/material';
import SelectTimeStep from './SelectTimeStep';
import TripDetailsStep from './TripDetailsStep';
import PaymentStep from './PaymentStep';

const steps = ['Select time', 'Trip details', 'Payment'];

export default function BookingWizard() {
  const [active, setActive] = useState(0);
  const [form, setForm] = useState<any>({ passengers: 1 });

  const next = (data: any) => {
    setForm({ ...form, ...data });
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
      {active === 1 && <TripDetailsStep data={form} onNext={next} onBack={back} />}
      {active === 2 && <PaymentStep data={form} onBack={back} />}
    </Box>
  );
}
