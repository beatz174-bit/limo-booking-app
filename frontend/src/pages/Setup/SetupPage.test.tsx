import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import { Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/__tests__/setup/msw.server';
import { apiUrl } from '@/__tests__/setup/msw.handlers';
import App from '@/App';

const label = (re: RegExp | string) => screen.getByLabelText(re, { selector: 'input' });

test('submits setup form and navigates to /login', async () => {
  server.use(
    http.get(apiUrl('/setup'), () => HttpResponse.json(null)),
    http.post(apiUrl('/setup'), () => HttpResponse.json({ message: 'Setup complete' }))
  );

  renderWithProviders(<App />, {
    initialPath: '/setup',
    extraRoutes: <Route path="/login" element={<h1>Log in</h1>} />,
  });

  await screen.findByRole('heading', { name: /initial setup/i });
  await userEvent.type(label(/full name/i), 'Admin User');
  await userEvent.type(label(/email/i), 'admin@example.com');
  await userEvent.type(label(/password/i), 'pw');
  await userEvent.type(label(/flagfall/i), '5');
  await userEvent.type(label(/per km rate/i), '2');
  await userEvent.type(label(/per minute rate/i), '1');
  await userEvent.click(screen.getByRole('button', { name: /complete setup/i }));

  expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
});

test('redirects to /login if already configured', async () => {
  server.use(
    http.get(apiUrl('/setup'), () =>
      HttpResponse.json({ account_mode: true, flagfall: 1, per_km_rate: 2, per_minute_rate: 3 })
    )
  );

  renderWithProviders(<App />, {
    initialPath: '/setup',
    extraRoutes: <Route path="/login" element={<h1>Log in</h1>} />,
  });

  expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
});

