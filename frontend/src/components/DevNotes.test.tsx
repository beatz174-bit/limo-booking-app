import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import DevNotes from './DevNotes';
import { DevFeaturesProvider } from '@/contexts/DevFeaturesContext';

vi.mock('@/config', () => ({
  CONFIG: {
    API_BASE_URL: 'https://api.test',
    CDN_BASE_URL: '',
    OAUTH_CLIENT_ID: 'client-123',
    OAUTH_AUTHORIZE_URL: 'https://auth.test/authorize',
    OAUTH_TOKEN_URL: 'https://auth.test/token',
    OAUTH_REDIRECT_URI: 'http://localhost/callback',
    GOOGLE_MAPS_API_KEY: 'gmaps-key'
  }
}));

describe('DevNotes', () => {
  test('renders configuration values', () => {
    render(<DevNotes />);
    expect(screen.getByText(/https:\/\/api\.test/)).toBeInTheDocument();
    expect(screen.getByText('client-123')).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/auth\.test\/authorize/)).toBeInTheDocument();
    expect(screen.getByText('configured')).toBeInTheDocument();
  });
});
