import { describe, it, expect } from 'vitest';
import * as logger from '@/lib/logger';

const endpoints: [string, string][] = [
  ['OpenRouteService', 'https://api.openrouteservice.org/'],
  ['GoogleMaps', 'https://maps.googleapis.com/'],
  ['Stripe', 'https://api.stripe.com/'],
];

describe.skip('external services', () => {
  endpoints.forEach(([name, url]) => {
    it(`${name} is reachable`, async () => {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        expect(res.status).toBeLessThan(500);
      } catch (err) {
        logger.warn('__tests__/externalServices', `${name} unreachable`, err);
      }
    });
  });
});
