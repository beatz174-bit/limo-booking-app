import { describe, expect, test, vi } from 'vitest';
import { calculateDistance } from './calculateDistance';

describe('calculateDistance', () => {
  test('falls back to haversine when google compute is unavailable', () => {
    const dist = calculateDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(Math.round(dist)).toBe(111195);
  });

  test('uses google.maps geometry computeDistanceBetween when provided', () => {
    const computeDistanceBetween = vi.fn(() => 42);
    const g = {
      maps: {
        LatLng: class {
          constructor(public lat: number, public lng: number) {}
        },
        geometry: { spherical: { computeDistanceBetween } },
      },
    } as unknown as typeof google;

    const dist = calculateDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, g);
    expect(dist).toBe(42);
    expect(computeDistanceBetween).toHaveBeenCalled();
  });
});
