// frontend/tests/e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  context: async ({ browser }, use) => {
    // Use storage state produced by global-setup:
    const storage = './storage/admin.json';
    const context = await browser.newContext({ storageState: storage });
    await use(context);
    await context.close();
  },
});

export const expect = test.expect;
