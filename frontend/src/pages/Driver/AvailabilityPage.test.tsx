import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import AvailabilityPage from './AvailabilityPage';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

let slots: Array<{ id: number; start_dt: string; end_dt: string; reason?: string }>;
const refreshMock = vi.fn();

vi.mock('@/hooks/useAvailability', () => ({
  default: () => ({ data: { slots, bookings: [] }, refresh: refreshMock }),
}));

describe('AvailabilityPage', () => {
  beforeEach(() => {
    slots = [];
    refreshMock.mockClear();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true } as Response)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists availability slots', () => {
    slots.push({ id: 1, start_dt: '2024-01-01T10:00', end_dt: '2024-01-01T11:00', reason: 'Busy' });

    renderWithProviders(<AvailabilityPage />);

    expect(screen.getByText('Busy')).toBeInTheDocument();
  });

  it('creates a slot and refreshes the list', async () => {
    const { rerender } = renderWithProviders(<AvailabilityPage />);

    await userEvent.type(screen.getByLabelText(/start/i), '2024-01-01T10:00');
    await userEvent.type(screen.getByLabelText(/end/i), '2024-01-01T11:00');
    await userEvent.type(screen.getByLabelText(/reason/i), 'Busy');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/availability'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          start_dt: '2024-01-01T10:00',
          end_dt: '2024-01-01T11:00',
          reason: 'Busy',
        }),
      }),
    );
    expect(refreshMock).toHaveBeenCalled();

    slots.push({ id: 1, start_dt: '2024-01-01T10:00', end_dt: '2024-01-01T11:00', reason: 'Busy' });
    rerender(<AvailabilityPage />);
    expect(screen.getByText('Busy')).toBeInTheDocument();
  });

  it('shows an error when slot overlaps existing', async () => {
    (fetch as unknown as vi.Mock).mockImplementation((input: RequestInfo) => {
      if (input.toString().includes('/api/v1/availability')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ detail: 'overlaps existing slot' }),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true } as Response);
    });

    renderWithProviders(<AvailabilityPage />);

    await userEvent.type(screen.getByLabelText(/start/i), '2024-01-01T10:00');
    await userEvent.type(screen.getByLabelText(/end/i), '2024-01-01T11:00');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(await screen.findByText(/overlaps existing slot/i)).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

