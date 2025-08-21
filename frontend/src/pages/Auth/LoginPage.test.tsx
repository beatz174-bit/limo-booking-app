// src/pages/Auth/LoginPage.test.tsx
import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import { Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import { http, HttpResponse } from 'msw';
import { server } from '@/__tests__/setup/msw.server';
import { apiUrl } from '@/__tests__/setup/msw.handlers';

const label = (re: RegExp | string) => screen.getByLabelText(re, { selector: 'input' });

test('navigates to /book for customer', async () => {
  renderWithProviders(<LoginPage />, {
    initialPath: '/login',
    extraRoutes: <Route path="/" element={<h1>Home Page</h1>} />
  });

  await userEvent.type(label(/email/i), 'test@example.com');
  await userEvent.type(label(/password/i), 'pw');
  await userEvent.click(screen.getByRole('button', { name: /log in/i }));

  expect(await screen.findByRole('heading', { name: /home page/i })).toBeInTheDocument();
});

test('navigates to /driver for driver role', async () => {
  server.use(
    http.post(apiUrl('/auth/login'), async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        access_token: 'test-token',
        token_type: 'bearer',
        role: 'DRIVER',
        user: { id: 1, full_name: 'Test User', email: body.email, role: 'DRIVER' },
      });
    })
  );

  renderWithProviders(<LoginPage />, {
    initialPath: '/login',
    extraRoutes: <Route path="/driver" element={<h1>Driver Dashboard</h1>} />
  });

  await userEvent.type(label(/email/i), 'driver@example.com');
  await userEvent.type(label(/password/i), 'pw');
  await userEvent.click(screen.getByRole('button', { name: /log in/i }));

  expect(await screen.findByRole('heading', { name: /driver dashboard/i })).toBeInTheDocument();
});

test('navigates to /admin for admin role', async () => {
  server.use(
    http.post(apiUrl('/auth/login'), async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        access_token: 'test-token',
        token_type: 'bearer',
        role: 'ADMIN',
        user: { id: 1, full_name: 'Test User', email: body.email, role: 'ADMIN' },
      });
    })
  );

  renderWithProviders(<LoginPage />, {
    initialPath: '/login',
    extraRoutes: <Route path="/admin" element={<h1>Admin Dashboard</h1>} />
  });

  await userEvent.type(label(/email/i), 'admin@example.com');
  await userEvent.type(label(/password/i), 'pw');
  await userEvent.click(screen.getByRole('button', { name: /log in/i }));

  expect(await screen.findByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
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
