// src/pages/Admin/AdminDashboard.test.tsx
import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import { screen, waitForElementToBeRemoved, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from './AdminDashboard';
import { http, HttpResponse } from 'msw';
import { server } from '@/__tests__/setup/msw.server';
import { apiUrl } from '@/__tests__/setup/msw.handlers';

const labelInput = (re: RegExp | string) => screen.getByLabelText(re, { selector: 'input' });

const defaultSettings = {
  account_mode: true,
  flagfall: 10.5,
  per_km_rate: 2.75,
  per_minute_rate: 1.1,
};

function mockSettingsGet(data = defaultSettings) {
  server.use(http.get(apiUrl('/settings'), () => HttpResponse.json(data)));
}

function mockSettingsPut(assertBody?: (b: unknown) => void, status = 200) {
  server.use(
    http.put(apiUrl('/settings'), async ({ request }) => {
      const body = await request.json();
      assertBody?.(body);
      if (status >= 400) {
        return HttpResponse.json({ detail: 'Boom' }, { status });
      }
      return HttpResponse.json({ ok: true });
    }),
  );
}

async function awaitLoaded() {
  const maybeSpinner = screen.queryByRole('progressbar');
  if (maybeSpinner) {
    await waitForElementToBeRemoved(maybeSpinner);
  }
  // Wait for any of the known controls to exist
  await screen.findByLabelText(/flagfall/i, undefined, { timeout: 3000 });
}

test('loads and displays current settings', async () => {
  mockSettingsGet(defaultSettings);
  renderWithProviders(<AdminDashboard />, { initialPath: '/admin' });

  await awaitLoaded();

  expect(labelInput(/flagfall/i)).toHaveValue(10.5);
  expect(labelInput(/per km rate/i)).toHaveValue(2.75);
  expect(labelInput(/per minute rate/i)).toHaveValue(1.1);

  // Ensure Account Mode is present via label (works for both Select and Switch)
  expect(screen.getByLabelText(/account mode/i)).toBeInTheDocument();
});

test('validation disables Save when fields are invalid', async () => {
  mockSettingsGet(defaultSettings);
  renderWithProviders(<AdminDashboard />, { initialPath: '/admin' });
  await awaitLoaded();
  fireEvent.change(labelInput(/flagfall/i), { target: { value: '-1' } });
  fireEvent.change(labelInput(/per km rate/i), { target: { value: '-0.5' } });

  expect(screen.getAllByText('Must be ≥ 0').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
});

test('saves settings (PUT /settings) with correct payload and shows success', async () => {
  mockSettingsGet(defaultSettings);
  let seen: unknown | null = null;
  mockSettingsPut((b) => (seen = b));

  renderWithProviders(<AdminDashboard />, { initialPath: '/admin' });

  await awaitLoaded();
  fireEvent.change(labelInput(/flagfall/i), { target: { value: '12.34' } });
  fireEvent.change(labelInput(/per km rate/i), { target: { value: '3.21' } });
  fireEvent.change(labelInput(/per minute rate/i), { target: { value: '0.9' } });

  expect(labelInput(/flagfall/i)).toHaveValue(12.34);
  expect(labelInput(/per km rate/i)).toHaveValue(3.21);
  expect(labelInput(/per minute rate/i)).toHaveValue(0.9);

  await userEvent.click(screen.getByRole('button', { name: /save/i }));

  expect(await screen.findByText(/settings saved/i)).toBeInTheDocument();

  expect(seen).toMatchObject({ account_mode: true });
});

test('shows API error when save fails', async () => {
  mockSettingsGet(defaultSettings);
  mockSettingsPut(undefined, 500);

  renderWithProviders(<AdminDashboard />, { initialPath: '/admin' });

  await awaitLoaded();
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(await screen.findByText(/save failed/i)).toBeInTheDocument();
});