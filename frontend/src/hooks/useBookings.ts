import { useContext } from 'react';
import { BookingsContext, type BookingsContextValue } from '@/contexts/BookingsContext';

export function useBookings(): BookingsContextValue {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error('useBookings must be used within a BookingsProvider');
  return ctx;
}

export default useBookings;

