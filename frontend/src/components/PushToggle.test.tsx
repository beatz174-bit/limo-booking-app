import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PushToggle from '@/components/PushToggle';

describe('PushToggle', () => {
  const ensureFreshToken = vi.fn().mockResolvedValue('auth');

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows unchecked when no subscription', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ fcm_token: null }),
    } as Response);
    render(<PushToggle ensureFreshToken={ensureFreshToken} />);
    const checkbox = await screen.findByRole('checkbox', { name: /push notifications/i });
    expect(checkbox).not.toBeChecked();
  });

  it('shows checked when subscribed', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ fcm_token: 'tok' }),
    } as Response);
    render(<PushToggle ensureFreshToken={ensureFreshToken} />);
    const checkbox = await screen.findByRole('checkbox', { name: /push notifications/i });
    expect(checkbox).toBeChecked();
  });
});
