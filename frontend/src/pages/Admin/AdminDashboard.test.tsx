// src/pages/Admin/AdminDashboard.test.tsx
import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import { screen, waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from './AdminDashboard';
import { http, HttpResponse } from 'msw';
import { server } from '@/__tests__/setup/msw.server';
import { apiUrl } from '@/__tests__/setup/msw.handlers';

const getInput = (testId: string) => screen.getByTestId(testId) as HTMLInputElement;

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
  await screen.findByTestId('settings-flagfall', undefined, { timeout: 3000 });
  await screen.findByDisplayValue(String(defaultSettings.flagfall));
}

test('loads and displays current settings', async () => {
  mockSettingsGet(defaultSettings);
  renderWithProviders(<AdminDashboard />, { initialPath: '/admin' });

  await awaitLoaded();

  expect(getInput('settings-flagfall')).toHaveValue(10.5);
  expect(getInput('settings-per-km')).toHaveValue(2.75);
  expect(getInput('settings-per-minute')).toHaveValue(1.1);

  // Ensure Account Mode is present via label (works for both Select and Switch)
  expect(screen.getByLabelText(/account mode/i)).toBeInTheDocument();
});

test.skip('validation disables Save when fields are invalid', async () => {
  mockSettingsGet(defaultSettings);
  renderWithProviders(<AdminDashboard />, { initialPath: '/admin' });
  await awaitLoaded();
  await userEvent.clear(getInput('settings-flagfall'));
  await userEvent.type(getInput('settings-flagfall'), '-1');
  await userEvent.clear(getInput('settings-per-km'));
  await userEvent.type(getInput('settings-per-km'), '-0.5');

  await waitFor(() =>
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled(),
  );
});

test.skip('saves settings (PUT /settings) with correct payload and shows success', async () => {
  mockSettingsGet(defaultSettings);
  let seen: unknown | null = null;
  mockSettingsPut((b) => (seen = b));

  renderWithProviders(<AdminDashboard />, { initialPath: '/admin' });

  await awaitLoaded();
  await userEvent.clear(getInput('settings-flagfall'));
  await userEvent.type(getInput('settings-flagfall'), '12.34');
  await userEvent.clear(getInput('settings-per-km'));
  await userEvent.type(getInput('settings-per-km'), '3.21');
  await userEvent.clear(getInput('settings-per-minute'));
  await userEvent.type(getInput('settings-per-minute'), '0.9');

  await userEvent.click(screen.getByRole('button', { name: /save/i }));

  expect(await screen.findByText(/settings saved/i)).toBeInTheDocument();

  await waitFor(() =>
    expect(seen).toMatchObject({
      account_mode: true,
      flagfall: 12.34,
      per_km_rate: 3.21,
      per_minute_rate: 0.9,
    }),
  );
});

test('shows API error when save fails', async () => {
  mockSettingsGet(defaultSettings);
  mockSettingsPut(undefined, 500);

  renderWithProviders(<AdminDashboard />, { initialPath: '/admin' });

  await awaitLoaded();
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(await screen.findByText(/save failed/i)).toBeInTheDocument();
});
