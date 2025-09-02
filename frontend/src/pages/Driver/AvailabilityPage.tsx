import { useState } from 'react';
import {
  Stack,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import useAvailability from '@/hooks/useAvailability';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';

export default function AvailabilityPage() {
  const month = new Date().toISOString().slice(0, 7);
  const { data, refresh } = useAvailability(month);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function create() {
    try {
      const res = await apiFetch(`${CONFIG.API_BASE_URL}/api/v1/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_dt: start, end_dt: end, reason }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { detail?: string } | null;
        setError(data?.detail ?? 'Failed to save availability');
        return;
      }
      setStart('');
      setEnd('');
      setReason('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="h5">Availability</Typography>
      <Stack direction="row" spacing={2}>
        <TextField
          type="datetime-local"
          label="Start"
          value={start}
          onChange={e => setStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="datetime-local"
          label="End"
          value={end}
          onChange={e => setEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <Button variant="contained" onClick={create} disabled={!start || !end}>
          Add
        </Button>
      </Stack>
      <List>
        {data?.slots.map(s => (
          <ListItem key={s.id}>
            <ListItemText
              primary={`${new Date(s.start_dt).toLocaleString()} - ${new Date(s.end_dt).toLocaleString()}`}
              secondary={s.reason || 'Block'}
            />
          </ListItem>
        ))}
        {data && data.slots.length === 0 && <Typography>No blocks</Typography>}
      </List>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
