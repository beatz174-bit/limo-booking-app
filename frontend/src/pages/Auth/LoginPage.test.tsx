// src/pages/Auth/LoginPage.test.tsx
import { renderWithProviders } from '../../../tests/utils/renderWithProviders';
import { Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import { http, HttpResponse } from 'msw';
import { server } from '../../../tests/setup/server';
import { apiUrl } from '../../../tests/msw/handlers';

const label = (re: RegExp | string) => screen.getByLabelText(re, { selector: 'input' });

test('logs in successfully', async () => {
  // stub /admin only (destination), not /login (source)
  renderWithProviders(<LoginPage />, {
    initialPath: '/login',
    extraRoutes: <Route path="/book" element={<h1>Booking Page</h1>} />
  });

  await userEvent.type(label(/email/i), 'test@example.com');
  await userEvent.type(label(/password/i), 'pw');
  await userEvent.click(screen.getByRole('button', { name: /log in/i }));

  expect(await screen.findByRole('heading', { name: /booking page/i })).toBeInTheDocument();
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
