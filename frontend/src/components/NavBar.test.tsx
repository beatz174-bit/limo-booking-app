import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { DevFeaturesProvider } from '@/contexts/DevFeaturesContext';
import NavBar from './NavBar';
import { render } from '@testing-library/react';

function seedAuth({ id, name }: { id: string; name: string }) {
  localStorage.setItem('auth_tokens', JSON.stringify({ access_token: 't', refresh_token: 'r', user: { email: 'x' } }));
  localStorage.setItem('userID', id);
  localStorage.setItem('userName', name);
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
  test('shows Administration menu item when userID == "1"', async () => {
    seedAuth({ id: '1', name: 'Admin User' });
    renderWithAuth();

    await userEvent.click(screen.getByLabelText(/account/i)); // open menu
    expect(await screen.findByRole('menuitem', { name: /administration/i })).toBeInTheDocument();
  });

  test('hides Administration menu item for non-admin user', async () => {
    seedAuth({ id: '2', name: 'Regular User' });
    renderWithAuth();

    await userEvent.click(screen.getByLabelText(/account/i));
    expect(screen.queryByRole('menuitem', { name: /administration/i })).not.toBeInTheDocument();
  });

  test('Logout clears state and navigates to /login', async () => {
    seedAuth({ id: '1', name: 'Admin User' });
    renderWithAuth('/book');

    await userEvent.click(screen.getByLabelText(/account/i));
    await userEvent.click(screen.getByRole('menuitem', { name: /logout/i }));

    // We provide a /login route with <h1>Log in</h1>
    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(localStorage.getItem('auth_tokens')).toBeNull();
    expect(localStorage.getItem('userID')).toBeNull();
    expect(localStorage.getItem('userName')).toBeNull();
  });
});
