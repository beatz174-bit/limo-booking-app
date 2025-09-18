import { Button, Stack } from '@mui/material';
import type { HourlyAvailabilitySlot } from '@/lib/availabilityUtils';

interface DayTimelineProps {
  slots: HourlyAvailabilitySlot[];
  value?: string;
  onSelect?: (iso: string) => void;
}

export default function DayTimeline({
  slots,
  value,
  onSelect,
}: DayTimelineProps) {
  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {slots.map(({ label, iso, disabled }) => {
        return (
          <Button
            key={iso}
            onClick={() => onSelect?.(iso)}
            disabled={disabled}
            variant={value === iso ? 'contained' : 'outlined'}
            sx={{ minWidth: 64 }}
          >
            {label}
          </Button>
        );
      })}
    </Stack>
  );
}

