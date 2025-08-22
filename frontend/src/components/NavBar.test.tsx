import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { DevFeaturesProvider } from '@/contexts/DevFeaturesContext';
import NavBar from './NavBar';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

function seedAuth({ id, name, role }: { id: string; name: string; role: string }) {
  localStorage.setItem('auth_tokens', JSON.stringify({ access_token: 't', refresh_token: 'r', user: { email: 'x' }, role }));
  localStorage.setItem('userID', id);
  localStorage.setItem('userName', name);
  localStorage.setItem('userRole', role);
  localStorage.setItem('role', role);
}

function renderWithAuth(initialPath = '/book', extraRoutes?: ReactNode) {
  return render(
    <DevFeaturesProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            {extraRoutes}
            <Route path="/login" element={<h1>Log in</h1>} />
            <Route path="*" element={<NavBar />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </DevFeaturesProvider>
  );
}

describe('NavBar', () => {
  test.skip('shows Admin Dashboard when role is ADMIN', async () => {
    seedAuth({ id: '1', name: 'Admin User', role: 'ADMIN' });
    renderWithAuth();

    const accountBtn = await screen.findByLabelText(/account/i);
    await userEvent.click(accountBtn); // open menu
    expect(await screen.findByRole('menuitem', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  test.skip('shows driver menu items for DRIVER role', async () => {
    seedAuth({ id: '2', name: 'Driver User', role: 'DRIVER' });
    renderWithAuth();

    const accountBtn = await screen.findByLabelText(/account/i);
    await userEvent.click(accountBtn);
    expect(await screen.findByRole('menuitem', { name: /driver dashboard/i })).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /availability/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /admin dashboard/i })).not.toBeInTheDocument();
  });

  test('hides role-specific items for CUSTOMER role', async () => {
    seedAuth({ id: '3', name: 'Regular User', role: 'CUSTOMER' });
    renderWithAuth();

    const accountBtn = await screen.findByLabelText(/account/i);
    await userEvent.click(accountBtn);
    expect(screen.queryByRole('menuitem', { name: /admin dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /driver dashboard/i })).not.toBeInTheDocument();
  });

  test('Logout clears state and navigates to /login', async () => {
    seedAuth({ id: '1', name: 'Admin User', role: 'ADMIN' });
    renderWithAuth('/book');

    const accountBtn = await screen.findByLabelText(/account/i);
    await userEvent.click(accountBtn);
    await userEvent.click(screen.getByRole('menuitem', { name: /logout/i }));

    // We provide a /login route with <h1>Log in</h1>
    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(localStorage.getItem('auth_tokens')).toBeNull();
    expect(localStorage.getItem('userID')).toBeNull();
    expect(localStorage.getItem('userName')).toBeNull();
    expect(localStorage.getItem('userRole')).toBeNull();
  });

  test('book menu item navigates to booking wizard', async () => {
    seedAuth({ id: '3', name: 'Regular User', role: 'CUSTOMER' });
    renderWithAuth('/home', <Route path="/book" element={<h1>Book</h1>} />);

    const accountBtn = await screen.findByLabelText(/account/i);
    await userEvent.click(accountBtn);
    await userEvent.click(screen.getByRole('menuitem', { name: /book/i }));
    expect(
      await screen.findByRole('heading', { name: /book/i })
    ).toBeInTheDocument();
  });

  test('ride history menu item navigates to history page', async () => {
    seedAuth({ id: '3', name: 'Regular User', role: 'CUSTOMER' });
    renderWithAuth('/home', <Route path="/history" element={<h1>History</h1>} />);

    const accountBtn = await screen.findByLabelText(/account/i);
    await userEvent.click(accountBtn);
    await userEvent.click(screen.getByRole('menuitem', { name: /ride history/i }));
    expect(
      await screen.findByRole('heading', { name: /history/i })
    ).toBeInTheDocument();
  });

  test('driver dashboard menu navigates to driver dashboard', async () => {
    seedAuth({ id: '2', name: 'Driver User', role: 'DRIVER' });
    renderWithAuth('/book', <Route path="/driver" element={<h1>Driver</h1>} />);

    const accountBtn = await screen.findByLabelText(/account/i);
    await userEvent.click(accountBtn);
    await userEvent.click(
      screen.getByRole('menuitem', { name: /driver dashboard/i })
    );
    expect(
      await screen.findByRole('heading', { name: /driver/i })
    ).toBeInTheDocument();
  });

  test('availability menu navigates to driver availability', async () => {
    seedAuth({ id: '2', name: 'Driver User', role: 'DRIVER' });
    renderWithAuth(
      '/book',
      <Route path="/driver/availability" element={<h1>Availability</h1>} />,
    );

    const accountBtn = await screen.findByLabelText(/account/i);
    await userEvent.click(accountBtn);
    await userEvent.click(
      screen.getByRole('menuitem', { name: /availability/i })
    );
    expect(
      await screen.findByRole('heading', { name: /availability/i })
    ).toBeInTheDocument();
  });

  test('admin menu item navigates to admin dashboard', async () => {
    seedAuth({ id: '1', name: 'Admin User', role: 'ADMIN' });
    renderWithAuth('/book', <Route path="/admin" element={<h1>Admin</h1>} />);

    const accountBtn = await screen.findByLabelText(/account/i);
    await userEvent.click(accountBtn);
    await userEvent.click(
      screen.getByRole('menuitem', { name: /admin dashboard/i })
    );
    expect(
      await screen.findByRole('heading', { name: /admin/i })
    ).toBeInTheDocument();
  });
});
