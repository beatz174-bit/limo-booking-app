// src/pages/Auth/LoginPage.test.tsx
import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import { Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import { http, HttpResponse } from 'msw';
import { server } from '@/__tests__/setup/msw.server';
import { apiUrl } from '@/__tests__/setup/msw.handlers';
import { CONFIG } from '@/config';

const label = (re: RegExp | string) => screen.getByLabelText(re, { selector: 'input' });

beforeEach(() => {
  localStorage.clear();
});

const cases = [
  {
    role: 'CUSTOMER',
    dest: '/book',
    extra: <Route path="/book" element={<h1>Booking</h1>} />,
    match: /booking/i,
  },
  {
    role: 'DRIVER',
    dest: '/driver',
    extra: <Route path="/driver" element={<h1>Driver Dashboard</h1>} />,
    match: /driver dashboard/i,
  },
  {
    role: 'ADMIN',
    dest: '/admin',
    extra: <Route path="/admin" element={<h1>Admin Dashboard</h1>} />,
    match: /admin dashboard/i,
  },
];

test.each(cases)('navigates to %s for %s role', async ({ role, dest, extra, match }) => {
  server.use(
    http.post(apiUrl('/auth/login'), async ({ request }) => {
      const body = (await request.json()) as { email: string };
      return HttpResponse.json({
        access_token: 'test-token',
        token_type: 'bearer',
        role,
        user: {
          id: CONFIG.ADMIN_USER_ID,
          full_name: 'Test User',
          email: body.email,
          role,
          phone: '123-4567',
        },
      });
    })
  );

  renderWithProviders(<LoginPage />, {
    initialPath: `/login?from=${dest}`,
    extraRoutes: extra,
  });

  await userEvent.type(label(/email/i), 'test@example.com');
  await userEvent.type(label(/password/i), 'pw');
  await userEvent.click(screen.getByRole('button', { name: /log in/i }));

  expect(await screen.findByText(match)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /log in/i })).not.toBeInTheDocument();
});

test('shows error on bad credentials', async () => {
  server.use(
    http.post(apiUrl('/auth/login'), () => HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 }))
  );

  renderWithProviders(<LoginPage />, { initialPath: '/login' });

  await userEvent.type(label(/email/i), 'bad@example.com');
  await userEvent.type(label(/password/i), 'nope');
  await userEvent.click(screen.getByRole('button', { name: /log in/i }));

  const alert = await screen.findByRole('alert').catch(() => null);
  if (alert) expect(alert).toHaveTextContent(/invalid credentials|login failed/i);
  else expect(await screen.findByText((_, n) => !!n && /invalid credentials|login failed/i.test(n.textContent || ''))).toBeInTheDocument();
});

test('Create an Account button navigates to /register', async () => {
  renderWithProviders(<LoginPage />, {
    initialPath: '/login',
    extraRoutes: <Route path="/register" element={<h1>Register</h1>} />
  });

  await userEvent.click(screen.getByRole('button', { name: /create an account/i }));
  expect(await screen.findByRole('heading', { name: /register/i })).toBeInTheDocument();
});
