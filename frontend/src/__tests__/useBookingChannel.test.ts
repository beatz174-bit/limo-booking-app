import { renderHook, act } from '@testing-library/react';
import { useBookingChannel } from '@/hooks/useBookingChannel';
import { vi } from 'vitest';

class WSStub {
  static instances: WSStub[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  constructor(public url: string) {
    WSStub.instances.push(this);
  }
  send() {}
  close() {}
}

describe('useBookingChannel', () => {
  beforeAll(() => {
    vi.stubGlobal('WebSocket', WSStub as any);
    vi.stubEnv('VITE_BACKEND_URL', 'http://api');
  });
  afterAll(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('updates state on message', () => {
    const { result } = renderHook(() => useBookingChannel('42'));
    const ws = WSStub.instances[0];
    act(() => {
      ws.onmessage && ws.onmessage({ data: JSON.stringify({ lat: 1, lng: 2, ts: 0 }) });
    });
    expect(result.current?.lat).toBe(1);
    expect(result.current?.lng).toBe(2);
  });
});
