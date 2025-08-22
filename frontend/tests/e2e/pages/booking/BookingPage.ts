import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export class BookingPage {
  private page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/book');
    await expect(this.page.getByRole('heading', { name: /make a booking/i })).toBeVisible();
  }
}

