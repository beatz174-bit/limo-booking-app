// frontend/tests/e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  context: async ({ browser }, usefixture) => {
    // Use storage state produced by global-setup:
    const storage = './storage/admin.json';
    const context = await browser.newContext({ storageState: storage });
    await usefixture(context);
    await context.close();
  },
});

export const expect = test.expect;
