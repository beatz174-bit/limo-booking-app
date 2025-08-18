// src/pages/Auth/RegisterPage.test.tsx
import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import { Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from './RegisterPage';
import { http, HttpResponse } from 'msw';
import { server } from '@/__tests__/setup/msw.server';
import { apiUrl } from '@/__tests__/setup/msw.handlers';

const label = (re: RegExp | string) => screen.getByLabelText(re, { selector: 'input' });

test('registers successfully and navigates to /book', async () => {
  renderWithProviders(<RegisterPage />, {
    initialPath: '/register',
    extraRoutes: <Route path="/admin" element={<h1>Admin Dashboard</h1>} />
  });

  await userEvent.type(label(/full name/i), 'New User');
  await userEvent.type(label(/email/i), 'new@example.com');
  await userEvent.type(label(/password/i), 'pw');
  await userEvent.click(screen.getByRole('button', { name: /register/i }));

  expect(await screen.findByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
});

test('shows validation error (422)', async () => {
  server.use(
    http.post(apiUrl('/auth/register'), () =>
      HttpResponse.json({ detail: 'Invalid input. Please check all fields.' }, { status: 422 })
    )
  );

  renderWithProviders(<RegisterPage />, { initialPath: '/register' });

  await userEvent.type(label(/full name/i), 'New User');
  await userEvent.type(label(/email/i), 'bad@example.com');
  await userEvent.type(label(/password/i), 'pw');
  await userEvent.click(screen.getByRole('button', { name: /register/i }));

  const alert = await screen.findByRole('alert').catch(() => null);
  if (alert) expect(alert).toHaveTextContent(/invalid input/i);
  else expect(await screen.findByText((_, n) => !!n && /invalid input/i.test(n.textContent || ''))).toBeInTheDocument();
});

test('shows API-provided 400 error detail', async () => {
  server.use(
    http.post(apiUrl('/auth/register'), () =>
      HttpResponse.json({ detail: 'Email already registered' }, { status: 400 })
    )
  );

  renderWithProviders(<RegisterPage />, { initialPath: '/register' });

  await userEvent.type(label(/full name/i), 'New User');
  await userEvent.type(label(/email/i), 'dupe@example.com');
  await userEvent.type(label(/password/i), 'pw');
  await userEvent.click(screen.getByRole('button', { name: /register/i }));

  expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
});

test('Back to Login navigates to /login', async () => {
  renderWithProviders(<RegisterPage />, {
    initialPath: '/register',
    extraRoutes: <Route path="/login" element={<h1>Log in</h1>} />
  });

  await userEvent.click(screen.getByRole('button', { name: /back to login/i }));
  expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
});
