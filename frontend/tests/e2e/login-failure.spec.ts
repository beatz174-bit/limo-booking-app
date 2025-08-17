import { test, expect } from '@playwright/test';

test('shows error on bad credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('bad@example.com');
  await page.getByLabel(/password/i).fill('wrong');
  await page.getByRole('button', { name: /log in/i }).click();

  // Your LoginPage shows "Invalid credentials" or "Login failed" depending on the failure reason
  await expect(page.getByText(/invalid credentials|login failed/i)).toBeVisible();
});
