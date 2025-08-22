import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export class DriverAvailabilityPage {
  private page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/driver/availability');
    await expect(this.page.getByRole('heading', { name: /availability/i })).toBeVisible();
  }

  startField() {
    return this.page.getByLabel(/start/i);
  }

  endField() {
    return this.page.getByLabel(/end/i);
  }

  addButton() {
    return this.page.getByRole('button', { name: /add/i });
  }

  async addSlot(start: string, end: string) {
    await this.startField().fill(start);
    await this.endField().fill(end);
    await this.addButton().click();
  }
}

