import { describe, it, expect } from 'vitest';
import type { AvailabilityResponse } from '@/api-client';
import {
  summarizeMonthlyAvailability,
  calculateHourlyAvailability,
  formatSlotLabel,
} from './availabilityUtils';

describe('availabilityUtils', () => {
  const availability: AvailabilityResponse = {
    slots: [
      { id: 1, start_dt: '2025-01-01T05:00:00Z', end_dt: '2025-01-01T06:00:00Z' },
      { id: 2, start_dt: '2025-01-02T00:00:00Z', end_dt: '2025-01-03T00:00:00Z' },
    ],
    bookings: [{ id: 'b1', pickup_when: '2025-01-01T10:00:00Z' }],
  };

  it('summarizes monthly availability into day states', () => {
    const states = summarizeMonthlyAvailability(availability, new Date('2025-01-01'));
    expect(states['2025-01-01']).toBe('partial');
    expect(states['2025-01-02']).toBe('full');
    expect(states['2025-01-03']).toBe('free');
  });

  it('calculates hourly availability for a date', () => {
    const hours = calculateHourlyAvailability(availability, '2025-01-01');
    expect(hours[5].disabled).toBe(true);
    expect(hours[10].disabled).toBe(true);
    expect(hours[11].disabled).toBe(false);
  });

  const isoForHour = (hour: number) =>
    new Date(Date.UTC(2025, 0, 1, hour, 0, 0, 0)).toISOString();
  const labelForHour = (hour: number) =>
    formatSlotLabel(new Date(isoForHour(hour)));

  it('produces UTC iso timestamps with localized labels', () => {
    const hours = calculateHourlyAvailability(availability, '2025-01-01');
    expect(hours[0]).toMatchObject({
      label: labelForHour(0),
      iso: isoForHour(0),
    });
    expect(hours[5]).toMatchObject({
      label: labelForHour(5),
      iso: isoForHour(5),
      disabled: true,
    });
  });
});
