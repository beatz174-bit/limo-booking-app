import { useState, useCallback } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import useAvailability from '@/hooks/useAvailability';
import type { DayState } from '@/lib/availabilityUtils';

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
  const monthStr = formatMonthKey(month);
  const { dayStates } = useAvailability(monthStr);

  const changeMonth = useCallback(
    (offset: number) => {
      const newMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1);
      setMonth(newMonth);
      onMonthChange?.(formatMonthKey(newMonth));
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
          const year = month.getFullYear();
          const monthIndex = month.getMonth();
          const date = new Date(Date.UTC(year, monthIndex, dayNum));
          const dateStr = date.toISOString().slice(0, 10);
          const state: DayState = dayStates[dateStr] || 'free';
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

function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const monthIndex = date.getMonth() + 1;
  return `${year}-${monthIndex.toString().padStart(2, '0')}`;
}

