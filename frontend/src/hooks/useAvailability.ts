import { useEffect, useState, useCallback } from 'react';
import { CONFIG } from '@/config';

export interface AvailabilityData {
  slots: { id: number; start_dt: string; end_dt: string; reason?: string | null }[];
  bookings: { id: string; pickup_when: string }[];
}

export default function useAvailability(month: string) {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const fetchData = useCallback(async () => {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/v1/availability?month=${month}`);
    if (res.ok) {
      setData(await res.json());
    }
  }, [month]);
  useEffect(() => {
    void fetchData();
  }, [fetchData]);
  return { data, refresh: fetchData };
}
