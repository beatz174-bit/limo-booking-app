import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import HomePage from './HomePage';

function seedAuth(id: string) {
  localStorage.setItem('auth_tokens', JSON.stringify({ access_token: 't', refresh_token: 'r', user: { email: 'x' } }));
  localStorage.setItem('userID', id);
  localStorage.setItem('userName', 'Test User');
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

  it('navigates to booking wizard', async () => {
    seedAuth('2');
    renderWithProviders(<HomePage />, {
      extraRoutes: <Route path="/book" element={<h1>Book</h1>} />,
    });
    await userEvent.click(screen.getByRole('link', { name: /book a ride/i }));
    expect(
      await screen.findByRole('heading', { name: /book/i })
    ).toBeInTheDocument();
  });

  it('navigates to ride history details', async () => {
    seedAuth('2');
    renderWithProviders(<HomePage />, {
      extraRoutes: <Route path="/history" element={<h1>History</h1>} />,
    });
    await userEvent.click(screen.getByRole('link', { name: /ride history/i }));
    expect(
      await screen.findByRole('heading', { name: /history/i })
    ).toBeInTheDocument();
  });

  it('navigates to driver dashboard', async () => {
    seedAuth('2');
    renderWithProviders(<HomePage />, {
      extraRoutes: <Route path="/driver" element={<h1>Driver</h1>} />,
    });
    await userEvent.click(screen.getByRole('link', { name: /driver dashboard/i }));
    expect(
      await screen.findByRole('heading', { name: /driver/i })
    ).toBeInTheDocument();
  });

  it('navigates to admin dashboard for admin user', async () => {
    seedAuth('1');
    renderWithProviders(<HomePage />, {
      extraRoutes: <Route path="/admin" element={<h1>Admin</h1>} />,
    });
    await userEvent.click(screen.getByRole('link', { name: /admin dashboard/i }));
    expect(
      await screen.findByRole('heading', { name: /admin/i })
    ).toBeInTheDocument();
  });
});

