import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export class ProfilePage {
  private page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/profile');
    await expect(this.page.getByRole('heading', { name: /my profile/i })).toBeVisible();
  }

  fullNameField() {
    return this.page.getByLabel(/full name/i);
  }

  defaultPickupField() {
    return this.page.getByLabel(/default pickup address/i);
  }

  saveButton() {
    return this.page.getByRole('button', { name: /save/i });
  }

  async update(data: { fullName?: string; defaultPickup?: string }) {
    if (data.fullName !== undefined) {
      await this.fullNameField().fill(data.fullName);
    }
    if (data.defaultPickup !== undefined) {
      await this.defaultPickupField().fill(data.defaultPickup);
    }
    await this.saveButton().click();
  }
}

