import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../pages/profile/ProfilePage';

interface ProfileUpdate {
  full_name?: string;
  default_pickup_address?: string;
}

const token = 'profile-token';
let captured: ProfileUpdate | null = null;

test('user updates profile information', async ({ page }) => {
  await page.route('**/auth/token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: token, token_type: 'bearer' })
    });
  });

  await page.route('**/users/me', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ full_name: 'Test User', email: 'user@example.com', default_pickup_address: '123 Rd' })
      });
    } else {
      captured = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...captured })
      });
    }
  });

  await page.goto('/login');
  await page.getByLabel(/email/i).fill('user@example.com');
  await page.getByLabel(/password/i).fill('pw');
  await Promise.all([
    page.waitForURL('**/book'),
    page.getByRole('button', { name: /log.?in|sign.?in/i }).click()
  ]);

  const profile = new ProfilePage(page);
  await profile.goto();

  await profile.update({ fullName: 'Updated User', defaultPickup: '456 Ave' });

  expect(captured.full_name).toBe('Updated User');
  expect(captured.default_pickup_address).toBe('456 Ave');
});

