import { describe, expect, it } from 'vitest';
import { formatAddress } from './formatAddress';

describe('formatAddress', () => {
  it('joins typical address parts', () => {
    const addr = {
      unit: '1',
      house_number: '23',
      road: 'Main St',
      city: 'Springfield',
      postcode: '12345'
    };
    expect(formatAddress(addr)).toBe('1/23 Main St Springfield 12345');
  });

  it('falls back to alternative fields and omits blanks', () => {
    const addr = {
      flat_number: '2',
      pedestrian: 'Highway',
      suburb: 'Shelbyville'
    } as any;
    expect(formatAddress(addr)).toBe('2 Highway Shelbyville');
  });

  it('returns empty string for nullish input', () => {
    // @ts-expect-error testing null input
    expect(formatAddress(null)).toBe('');
  });
});
