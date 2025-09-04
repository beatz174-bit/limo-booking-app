import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import { setTokens } from '@/services/tokenStore';
import type { BookingRead as Booking } from '@/api-client';

class WSStub {
  static instances: WSStub[] = [];
  readyState = WebSocket.OPEN;
  send = vi.fn();
  close = vi.fn();
  onopen?: () => void;
  onerror?: (ev: Event) => void;
  onclose?: (ev: Event) => void;
  constructor(public url: string) {
    WSStub.instances.push(this);
  }
}

describe('useDriverTracking', () => {
  const watchPosition = vi.fn();
  const clearWatch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('WebSocket', WSStub as unknown as typeof WebSocket);
    vi.stubGlobal('navigator', {
      geolocation: { watchPosition, clearWatch },
    });
    vi.stubEnv('VITE_BACKEND_URL', 'http://api');
    setTokens('test-token');
    WSStub.instances = [];
    watchPosition.mockImplementation((success: PositionCallback) => {
      success({
        coords: { latitude: 1, longitude: 2, speed: 3 },
        timestamp: 123,
      } as GeolocationPosition);
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetAllMocks();
    setTokens(null);
  });

  test('opens socket and sends location updates', async () => {
    const booking = { id: '42', status: 'ON_THE_WAY' } as Booking;
    const { unmount } = renderHook(() => useDriverTracking([booking]));
    const ws = WSStub.instances[0];
    expect(ws.url).toBe('ws://api/ws/bookings/42?token=test-token');
    expect(watchPosition).toHaveBeenCalledWith(expect.any(Function), undefined, {
      enableHighAccuracy: true,
    });
    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({ lat: 1, lng: 2, ts: 123, speed: 3 }),
    );
    unmount();
  });

  test('stops tracking when status changes', () => {
    const { rerender, unmount } = renderHook(
      ({ status }) => useDriverTracking([{ id: '99', status } as Booking]),
      { initialProps: { status: 'ON_THE_WAY' } },
    );
    expect(WSStub.instances).toHaveLength(1);
    act(() => rerender({ status: 'COMPLETED' }));
    expect(clearWatch).toHaveBeenCalledWith(1);
    expect(WSStub.instances[0].close).toHaveBeenCalled();
    unmount();
  });

  test('removes watcher if socket fails before open', () => {
    watchPosition.mockImplementation(() => 1);
    const booking = { id: '7', status: 'ON_THE_WAY' } as Booking;
    const { rerender, unmount } = renderHook(
      ({ bookings }) => useDriverTracking(bookings),
      { initialProps: { bookings: [booking] } },
    );
    const ws = WSStub.instances[0];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    act(() => {
      ws.onerror?.(new Event('error'));
    });
    expect(clearWatch).toHaveBeenCalledWith(1);
    watchPosition.mockImplementation(() => 2);
    act(() => rerender({ bookings: [booking] }));
    expect(watchPosition).toHaveBeenCalledTimes(2);
    warn.mockRestore();
    unmount();
  });
});

