import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, expect, test } from 'vitest';
import SelectTimeStep from './SelectTimeStep';

vi.mock('@/hooks/useAvailability', () => ({
  default: () => ({ data: { slots: [], bookings: [] } }),
}));

test('passes ISO string to onNext', async () => {
  const onNext = vi.fn();
  render(<SelectTimeStep data={{}} onNext={onNext} />);
  const input = screen.getByLabelText(/pickup time/i);
  const value = '2025-01-01T10:00';
  await userEvent.clear(input);
  await userEvent.type(input, value);
  await userEvent.click(screen.getByRole('button', { name: /next/i }));
  expect(onNext).toHaveBeenCalledWith({
    pickup_when: new Date(value).toISOString(),
  });
});
