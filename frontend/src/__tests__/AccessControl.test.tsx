import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('@/contexts/BookingsContext', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const mockValue = {
    bookings: [],
    loading: false,
    error: null,
    refresh: async () => {},
    updateBooking: async () => {},
    addBooking: () => {},
  };
  const BookingsContext = React.createContext(mockValue);
  const BookingsProvider = ({
    children,
  }: {
    children?: import('react').ReactNode;
  }) =>
    React.createElement(
      BookingsContext.Provider,
      { value: mockValue },
      children,
    );
  return {
    __esModule: true,
    BookingsContext,
    BookingsProvider,
    default: BookingsProvider,
  };
});

import App from '@/App';
import { AuthContextType, UserShape } from '@/types/AuthContextType';
import { AuthContext } from '@/contexts/AuthContext';
import { DevFeaturesProvider } from '@/contexts/DevFeaturesContext';
import { CONFIG } from '@/config';

vi.mock('@/components/ApiConfig', async () => {
  const actual = await vi.importActual<
    typeof import('@/components/ApiConfig')
  >('@/components/ApiConfig');
  return {
    ...actual,
    driverBookingsApi: {
      listBookingsApiV1DriverBookingsGet: vi
        .fn()
        .mockResolvedValue({ data: [] }),
    },
    customerBookingsApi: {
      listMyBookingsApiV1CustomersMeBookingsGet: vi
        .fn()
        .mockResolvedValue({ data: [] }),
    },
  };
});

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
  adminID: CONFIG.ADMIN_USER_ID,
  phone: null,
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
      <DevFeaturesProvider>
        <MemoryRouter initialEntries={[initial]}>
          <App />
        </MemoryRouter>
      </DevFeaturesProvider>
    </AuthContext.Provider>
  );
}

describe('route access control', () => {
  it('allows first user to access admin dashboard', () => {
    renderWithAuth({ accessToken: 'tok', userID: CONFIG.ADMIN_USER_ID }, '/admin');
    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });

  it('redirects other users from admin dashboard', async () => {
    renderWithAuth({ accessToken: 'tok', userID: '00000000-0000-0000-0000-000000000002' }, '/admin');
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
  });

  it('allows first user to access driver dashboard', () => {
    renderWithAuth({ accessToken: 'tok', userID: CONFIG.ADMIN_USER_ID }, '/driver');
    expect(screen.getByText('Driver Page')).toBeInTheDocument();
  });

  it('redirects other users from driver dashboard', async () => {
    renderWithAuth({ accessToken: 'tok', userID: '00000000-0000-0000-0000-000000000002' }, '/driver');
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
  });
});
