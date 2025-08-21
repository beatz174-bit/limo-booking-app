import { useState } from 'react';
import { Stack, TextField, Button } from '@mui/material';

interface Props {
  data: any;
  onNext: (data: any) => void;
}

export default function SelectTimeStep({ data, onNext }: Props) {
  const [when, setWhen] = useState(data.pickup_when || '');
  return (
    <Stack spacing={2}>
      <TextField
        type="datetime-local"
        label="Pickup time"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
      <Button variant="contained" onClick={() => onNext({ pickup_when: when })}>
        Next
      </Button>
    </Stack>
  );
}
