import { renderHook, act } from "@testing-library/react";
import { useBookingChannel } from "@/hooks/useBookingChannel";
import { vi } from "vitest";
import { setTokens } from "@/services/tokenStore";

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
    vi.stubGlobal("WebSocket", WSStub as unknown as typeof WebSocket);
    vi.stubEnv("VITE_BACKEND_URL", "http://api");
    setTokens("test-token");
  });
  afterAll(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    setTokens(null);
  });

  it('updates state on message', () => {
    const { result } = renderHook(() => useBookingChannel('42'));
    const ws = WSStub.instances[0];
    expect(ws.url).toBe('ws://api/ws/bookings/42/watch?token=test-token');
    act(() => {
      if (ws.onmessage) {
        ws.onmessage({ data: JSON.stringify({ lat: 1, lng: 2, ts: 0 }) });
      }
    });
    expect(result.current?.lat).toBe(1);
    expect(result.current?.lng).toBe(2);
  });
});
