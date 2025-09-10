import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/services/push', () => ({
  subscribePush: vi.fn().mockResolvedValue('player'),
  unsubscribePush: vi.fn().mockResolvedValue(undefined),
  refreshPushToken: vi.fn().mockResolvedValue('player'),
}));

import PushToggle from '@/components/PushToggle';
import { subscribePush, unsubscribePush } from '@/services/push';

describe('PushToggle', () => {
  const ensureFreshToken = vi.fn().mockResolvedValue('auth');
  let fetchSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    fetchSpy = null;
  });

  it('shows unchecked when no subscription', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ onesignal_player_id: null }),
    } as Response);
    render(<PushToggle ensureFreshToken={ensureFreshToken} />);
    const checkbox = await screen.findByRole('switch', { name: /push notifications/i });
    expect(checkbox).not.toBeChecked();
  });

  it('shows checked when subscribed', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ onesignal_player_id: 'tok' }),
    } as Response);
    render(<PushToggle ensureFreshToken={ensureFreshToken} />);
    const checkbox = await screen.findByRole('switch', { name: /push notifications/i });
    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it('enables and disables push', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ onesignal_player_id: null }),
      })
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(
      fetchMock as unknown as typeof fetch,
    );
    render(<PushToggle ensureFreshToken={ensureFreshToken} />);
    const checkbox = await screen.findByRole('switch', { name: /push notifications/i });
    expect(checkbox).not.toBeChecked();

    await fireEvent.click(checkbox);
    await waitFor(() => expect(subscribePush).toHaveBeenCalled());
    await waitFor(() => expect(checkbox).toBeChecked());

    await fireEvent.click(checkbox);
    await waitFor(() => expect(unsubscribePush).toHaveBeenCalled());
    await waitFor(() => expect(checkbox).not.toBeChecked());
  });
});
