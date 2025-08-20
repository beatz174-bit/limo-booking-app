import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import CdnAsset from './CdnAsset';

describe('CdnAsset', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefixes CDN base URL in production', () => {
    vi.stubEnv('VITE_CDN_BASE_URL', 'https://cdn.example.com/');
    vi.stubEnv('PROD', 'true');

    render(
      <CdnAsset src="/test.png">
        <img data-testid="img" alt="" />
      </CdnAsset>
    );

    expect(screen.getByTestId('img')).toHaveAttribute('src', 'https://cdn.example.com//test.png');
  });

  it('uses original src when not in production', () => {
    vi.stubEnv('PROD', 'false');

    render(
      <CdnAsset src="/test.png">
        <img data-testid="img" alt="" />
      </CdnAsset>
    );

    expect(screen.getByTestId('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/test.png'),
    );
  });
});
