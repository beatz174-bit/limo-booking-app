import { useEffect, useState, useCallback, useMemo } from 'react';
import { availabilityApi } from '@/components/ApiConfig';
import type { AvailabilityResponse as AvailabilityData } from '@/api-client';
import {
  summarizeMonthlyAvailability,
  calculateHourlyAvailability,
} from '@/lib/availabilityUtils';

export default function useAvailability(month: string) {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const fetchData = useCallback(async () => {
    const res = await availabilityApi.getAvailabilityApiV1AvailabilityGet(month);
    setData(res.data as AvailabilityData);
  }, [month]);
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const monthDate = useMemo(() => new Date(`${month}-01`), [month]);

  const dayStates = useMemo(
    () => (data ? summarizeMonthlyAvailability(data, monthDate) : {}),
    [data, monthDate],
  );

  const hourlyAvailability = useMemo(() => {
    if (!data) return {} as Record<string, ReturnType<typeof calculateHourlyAvailability>>;
    const result: Record<string, ReturnType<typeof calculateHourlyAvailability>> = {};
    Object.keys(dayStates).forEach((day) => {
      result[day] = calculateHourlyAvailability(data, day);
    });
    return result;
  }, [data, dayStates]);

  // TODO: Consider a backend endpoint providing pre-aggregated availability
  // if client-side calculations become a performance bottleneck.

  return { data, dayStates, hourlyAvailability, refresh: fetchData };
}
