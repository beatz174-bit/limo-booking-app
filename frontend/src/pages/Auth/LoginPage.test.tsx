// src/pages/Auth/LoginPage.test.tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../tests/setup/server';
import { renderWithProviders } from '../../../tests/utils/renderWithProviders';
import LoginPage from './LoginPage';
import { apiUrl } from '../../../tests/msw/handlers';

describe('LoginPage', () => {
  test('logs in successfully', async () => {
    // Ensure success handler is active (defined in testHandlers.ts)

    renderWithProviders(<LoginPage />, '/login');

    await userEvent.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'pw');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    // After a successful login, your app should navigate to /book
    // We stubbed that route to render "Welcome"
    expect(await screen.findByText(/Welcome/i)).toBeInTheDocument();
  });

  test('shows error on bad credentials', async () => {
    // Override login just for this test to 401
    server.use(
      http.post(apiUrl('/auth/login'), async () => {
        return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
      })
    );

    renderWithProviders(<LoginPage />, '/login');

    await userEvent.type(screen.getByLabelText(/email/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    // Assert your component displays the API-provided error text
    expect(await screen.findByText(/Login failed/i)).toBeInTheDocument();
  });
});
