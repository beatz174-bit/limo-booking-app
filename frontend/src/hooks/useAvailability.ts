import { useEffect, useState, useCallback } from 'react';
import { availabilityApi } from '@/components/ApiConfig';
import type { AvailabilityResponse as AvailabilityData } from '@/api-client';

export default function useAvailability(month: string) {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const fetchData = useCallback(async () => {
    const res = await availabilityApi.getAvailabilityApiV1AvailabilityGet(month);
    setData(res.data as AvailabilityData);
  }, [month]);
  useEffect(() => {
    void fetchData();
  }, [fetchData]);
  return { data, refresh: fetchData };
}
