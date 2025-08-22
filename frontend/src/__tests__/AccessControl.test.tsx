import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { AuthContextType, UserShape } from '@/types/AuthContextType';
import { AuthContext } from '@/contexts/AuthContext';
import { vi } from 'vitest';

vi.mock('@/pages/Admin/AdminDashboard', () => ({ default: () => <div>Admin Page</div> }));
vi.mock('@/pages/Driver/DriverDashboard', () => ({ default: () => <div>Driver Page</div> }));
vi.mock('@/pages/Auth/LoginPage', () => ({ default: () => <div>Login Page</div> }));
vi.mock('@/components/NavBar', () => ({ default: () => <div>NavBar</div> }));

const baseAuth: AuthContextType = {
  accessToken: null,
  user: null as UserShape,
  loading: false,
  userName: null,
  userID: null,
  role: null,
  loginWithPassword: vi.fn(),
  registerWithPassword: vi.fn(),
  loginWithOAuth: vi.fn(),
  finishOAuthIfCallback: vi.fn(),
  logout: vi.fn(),
  ensureFreshToken: vi.fn(),
};

function renderWithAuth(value: Partial<AuthContextType>, initial: string) {
  return render(
    <AuthContext.Provider value={{ ...baseAuth, ...value }}>
      <MemoryRouter initialEntries={[initial]}>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('route access control', () => {
  it('allows admin to access admin dashboard', () => {
    renderWithAuth({ accessToken: 'tok', role: 'admin' }, '/admin');
    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });

  it('redirects non-admin from admin dashboard', async () => {
    renderWithAuth({ accessToken: 'tok', role: 'driver' }, '/admin');
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
  });

  it('allows driver to access driver dashboard', () => {
    renderWithAuth({ accessToken: 'tok', role: 'driver' }, '/driver');
    expect(screen.getByText('Driver Page')).toBeInTheDocument();
  });

  it('redirects non-driver from driver dashboard', async () => {
    renderWithAuth({ accessToken: 'tok', role: 'admin' }, '/driver');
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
  });
});
