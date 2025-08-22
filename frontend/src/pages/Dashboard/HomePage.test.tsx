import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import { screen } from '@testing-library/react';
import HomePage from './HomePage';

function seedAuth(id: string, role = 'CUSTOMER') {
  localStorage.setItem(
    'auth_tokens',
    JSON.stringify({ access_token: 't', refresh_token: 'r', user: { email: 'x', role }, role })
  );
  localStorage.setItem('userID', id);
  localStorage.setItem('userName', 'Test User');
  localStorage.setItem('role', role);
}

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows common tiles for a regular user', () => {
    seedAuth('2');
    renderWithProviders(<HomePage />);
    expect(screen.getByRole('link', { name: /book a ride/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ride history/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /driver dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
  });

  it('shows admin dashboard tile for admin user', () => {
    seedAuth('1');
    renderWithProviders(<HomePage />);
    expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  it('shows availability tile for driver', () => {
    seedAuth('2', 'DRIVER');
    renderWithProviders(<HomePage />);
    const availabilityLink = screen.getByRole('link', { name: /availability/i });
    expect(availabilityLink).toBeInTheDocument();
    // ensure layout includes the extra tile
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });
});

