import { useState, useMemo, useCallback } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import useAvailability from '@/hooks/useAvailability';

export type DayState = 'free' | 'partial' | 'full';

interface AvailabilityCalendarProps {
  value?: string;
  onSelect?: (day: string) => void;
  onMonthChange?: (month: string) => void;
}

export default function AvailabilityCalendar({
  value,
  onSelect,
  onMonthChange,
}: AvailabilityCalendarProps) {
  const initial = value ? new Date(value) : new Date();
  const [month, setMonth] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1),
  );
  const monthStr = month.toISOString().slice(0, 7);
  const { data } = useAvailability(monthStr);

  const dayStates = useMemo(() => {
    if (!data) return {} as Record<string, DayState>;
    const states: Record<string, DayState> = {};
    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(month.getFullYear(), month.getMonth(), d);
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      let hasFull = false;
      let hasAny = false;
      data.slots.forEach((s) => {
        const slotStart = new Date(s.start_dt);
        const slotEnd = new Date(s.end_dt);
        if (slotStart <= start && slotEnd >= end) {
          hasFull = true;
        } else if (slotEnd > start && slotStart < end) {
          hasAny = true;
        }
      });
      data.bookings.forEach((b) => {
        const bookingStart = new Date(b.pickup_when);
        const bookingEnd = new Date(bookingStart.getTime() + 60 * 60 * 1000);
        if (bookingEnd > start && bookingStart < end) {
          hasAny = true;
        }
      });
      const key = day.toISOString().slice(0, 10);
      states[key] = hasFull ? 'full' : hasAny ? 'partial' : 'free';
    }
    return states;
  }, [data, month]);

  const changeMonth = useCallback(
    (offset: number) => {
      const newMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1);
      setMonth(newMonth);
      onMonthChange?.(newMonth.toISOString().slice(0, 7));
    },
    [month, onMonthChange],
  );

  const firstDay = month.getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <IconButton onClick={() => changeMonth(-1)}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6">
          {month.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Typography>
        <IconButton onClick={() => changeMonth(1)}>
          <ChevronRightIcon />
        </IconButton>
      </Stack>
      <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={1}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <Typography key={d} variant="caption" align="center">
            {d}
          </Typography>
        ))}
        {Array.from({ length: firstDay }).map((_, idx) => (
          <Box key={`empty-${idx}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const date = new Date(month.getFullYear(), month.getMonth(), dayNum);
          const dateStr = date.toISOString().slice(0, 10);
          const state = dayStates[dateStr] || 'free';
          const selected = value === dateStr;
          let color: 'primary' | 'warning' | 'inherit' = 'inherit';
          if (state === 'partial') color = 'warning';
          if (selected) color = 'primary';
          return (
            <Button
              key={dateStr}
              onClick={() => onSelect?.(dateStr)}
              disabled={state === 'full'}
              variant={selected ? 'contained' : 'outlined'}
              color={color}
              sx={{ minWidth: 0 }}
            >
              {dayNum}
            </Button>
          );
        })}
      </Box>
    </Stack>
  );
}

