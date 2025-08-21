import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { DevFeaturesProvider } from '@/contexts/DevFeaturesContext';
import NavBar from './NavBar';
import { render } from '@testing-library/react';

function seedAuth({ id, name, role }: { id: string; name: string; role: string }) {
  localStorage.setItem('auth_tokens', JSON.stringify({ access_token: 't', refresh_token: 'r', user: { email: 'x' }, role }));
  localStorage.setItem('userID', id);
  localStorage.setItem('userName', name);
  localStorage.setItem('userRole', role);
}

function renderWithAuth(initialPath = '/book') {
  return render(
    <DevFeaturesProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/login" element={<h1>Log in</h1>} />
            <Route path="*" element={<NavBar />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </DevFeaturesProvider>
  );
}

describe('NavBar', () => {
  test('shows Admin Dashboard when role is ADMIN', async () => {
    seedAuth({ id: '1', name: 'Admin User', role: 'ADMIN' });
    renderWithAuth();

    await userEvent.click(screen.getByLabelText(/account/i)); // open menu
    expect(await screen.findByRole('menuitem', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  test('shows driver menu items for DRIVER role', async () => {
    seedAuth({ id: '2', name: 'Driver User', role: 'DRIVER' });
    renderWithAuth();

    await userEvent.click(screen.getByLabelText(/account/i));
    expect(await screen.findByRole('menuitem', { name: /driver dashboard/i })).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /availability/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /admin dashboard/i })).not.toBeInTheDocument();
  });

  test('hides role-specific items for CUSTOMER role', async () => {
    seedAuth({ id: '3', name: 'Regular User', role: 'CUSTOMER' });
    renderWithAuth();

    await userEvent.click(screen.getByLabelText(/account/i));
    expect(screen.queryByRole('menuitem', { name: /admin dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /driver dashboard/i })).not.toBeInTheDocument();
  });

  test('Logout clears state and navigates to /login', async () => {
    seedAuth({ id: '1', name: 'Admin User', role: 'ADMIN' });
    renderWithAuth('/book');

    await userEvent.click(screen.getByLabelText(/account/i));
    await userEvent.click(screen.getByRole('menuitem', { name: /logout/i }));

    // We provide a /login route with <h1>Log in</h1>
    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(localStorage.getItem('auth_tokens')).toBeNull();
    expect(localStorage.getItem('userID')).toBeNull();
    expect(localStorage.getItem('userName')).toBeNull();
    expect(localStorage.getItem('userRole')).toBeNull();
  });
});
