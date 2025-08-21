import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DriverDashboard from '@/pages/Driver/DriverDashboard';
import { vi } from 'vitest';

vi.mock('@/services/tokenStore', () => ({ getAccessToken: () => 'tok' }));

describe('DriverDashboard', () => {
  it('loads and confirms booking', async () => {
    const bookings = [{ id: '1', pickup_address: 'A', dropoff_address: 'B', pickup_when: new Date().toISOString(), status: 'PENDING' }];
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => bookings })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'DRIVER_CONFIRMED' }) });

    render(<DriverDashboard />);
    expect(await screen.findByText('A → B')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => expect(screen.getByText('Leave now')).toBeInTheDocument());
  });
});
