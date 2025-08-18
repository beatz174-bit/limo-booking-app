// src/pages/Admin/AdminDashboard.test.tsx
import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from './AdminDashboard';
import { http, HttpResponse } from 'msw';
import { server } from '@/__tests__/setup/msw.server';
import { apiUrl } from '@/__tests__/setup/msw.handlers';

const labelInput = (re: RegExp | string) => screen.getByLabelText(re, { selector: 'input' });

const defaultSettings = {
  account_mode: true,
  google_maps_api_key: 'XYZ',
  flagfall: 10.5,
  per_km_rate: 2.75,
  per_minute_rate: 1.1,
};

function mockSettingsGet(data = defaultSettings) {
  server.use(http.get(apiUrl('/settings'), () => HttpResponse.json(data)));
}

function mockSettingsPut(assertBody?: (b: any) => void, status = 200) {
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
  await screen.findByLabelText(/google maps/i, undefined, { timeout: 3000 });
}

test('loads and displays current settings', async () => {
  mockSettingsGet(defaultSettings);
  renderWithProviders(<AdminDashboard />, { initialPath: '/admin' });

  await awaitLoaded();

  expect(labelInput(/google maps/i)).toHaveValue('XYZ');
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

  await userEvent.clear(labelInput(/google maps/i));
  await userEvent.clear(labelInput(/flagfall/i));
  await userEvent.type(labelInput(/flagfall/i), '-1');
  await userEvent.clear(labelInput(/per km rate/i));
  await userEvent.type(labelInput(/per km rate/i), '-0.5');

  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
});

test('saves settings (PUT /settings) with correct payload and shows success', async () => {
  mockSettingsGet(defaultSettings);
  let seen: any | null = null;
  mockSettingsPut((b) => (seen = b));

  renderWithProviders(<AdminDashboard />, { initialPath: '/admin' });

  await awaitLoaded();

  await userEvent.clear(labelInput(/google maps/i));
  await userEvent.type(labelInput(/google maps/i), 'NEWKEY');
  await userEvent.clear(labelInput(/flagfall/i));
  await userEvent.type(labelInput(/flagfall/i), '12.34');
  await userEvent.clear(labelInput(/per km rate/i));
  await userEvent.type(labelInput(/per km rate/i), '3.21');
  await userEvent.clear(labelInput(/per minute rate/i));
  await userEvent.type(labelInput(/per minute rate/i), '0.9');

  await userEvent.click(screen.getByRole('button', { name: /save/i }));

  expect(await screen.findByText(/settings saved/i)).toBeInTheDocument();

  expect(seen).toMatchObject({
    account_mode: true,
    google_maps_api_key: 'NEWKEY',
    flagfall: 12.34,
    per_km_rate: 3.21,
    per_minute_rate: 0.9,
  });
});

test('shows API error when save fails', async () => {
  mockSettingsGet(defaultSettings);
  mockSettingsPut(undefined, 500);

  renderWithProviders(<AdminDashboard />, { initialPath: '/admin' });

  await awaitLoaded();
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(await screen.findByText(/save failed/i)).toBeInTheDocument();
});