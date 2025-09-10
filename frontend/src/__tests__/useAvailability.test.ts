import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import useAvailability from '@/hooks/useAvailability';
import { availabilityApi } from '@/components/ApiConfig';

describe('useAvailability', () => {
  it('fetches availability data', async () => {
    const fake = { slots: [], bookings: [] };
    vi
      .spyOn(availabilityApi, 'getAvailabilityApiV1AvailabilityGet')
      .mockResolvedValue({ data: fake } as never);
    const { result } = renderHook(() => useAvailability('2025-01'));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual(fake);
    expect(result.current.dayStates['2025-01-01']).toBe('free');
    expect(result.current.hourlyAvailability['2025-01-01'].length).toBe(24);
  });
});
