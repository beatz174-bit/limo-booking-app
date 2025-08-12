// e2e/example.spec.ts
import { test, expect } from "@playwright/test";

const uniqueEmail = `user+${Date.now()}@example.com`;
const password = 'pw';

test('register then logout then login', async ({ page }) => {

  // Helpful diagnostics
  page.on("pageerror", (e) => console.error("pageerror:", e));
  page.on("console", (m) => console.log("console:", m.type(), m.text()));

  // Register
  await page.goto('/register');
  await page.getByLabel(/full name/i).fill('E2E User');
  await page.getByLabel(/email/i).fill(uniqueEmail);
  await page.getByLabel(/password/i).fill(password);
  await Promise.all([
    page.waitForURL('**/book'),
    page.getByRole('button', { name: /register/i }).click(),
  ]);
  await expect(page).toHaveURL(/\/book$/);
  await expect(page.getByRole("heading", { name: /booking page/i })).toBeVisible();

  // Logout (open account menu → click Logout)
  await page.getByRole("button", { name: /account/i }).click();  // prefer role; or add data-testid
  await Promise.all([
    page.waitForURL("**/login"),
    page.getByRole("menuitem", { name: /logout/i }).click(),
  ]);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /log\s*in/i })).toBeVisible();


  await page.getByLabel(/email/i).fill(uniqueEmail);
  await page.getByLabel(/password/i).fill(password);
  await Promise.all([
    page.waitForURL("**/book"),
    page.getByRole("button", { name: /log.?in|sign.?in/i }).click(),
  ]);
  await expect(page).toHaveURL(/\/book$/);
  await expect(page.getByRole("heading", { name: /booking page/i })).toBeVisible();
});
