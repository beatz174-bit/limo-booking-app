// tests/e2e/pages/AdminDashboardPage.ts
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
export class AdminDashboardPage {
  private page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/admin');
    await expect(this.page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
  }

  flagfall()        { return this.page.getByTestId('settings-flagfall'); }
  perKm()           { return this.page.getByTestId('settings-per-km'); }
  perMinute()       { return this.page.getByTestId('settings-per-minute'); }
  accountMode()     { return this.page.getByTestId('settings-account-mode'); } // this is a <select/>
  saveButton()      { return this.page.getByTestId('settings-save'); }

  // Optionally expose explicit helpers:
  async setAccountModeOpen(isOpen: boolean) {
    // Component values: "open" | "closed"
    await this.accountMode().selectOption(isOpen ? 'open' : 'closed');
  }

  async readValues() {
    const [flagfall, perKm, perMin] = await Promise.all([
      this.flagfall().inputValue(),
      this.perKm().inputValue(),
      this.perMinute().inputValue(),
    ]);
    const accountValue = await this.page.getByTestId('settings-account-mode').inputValue();
    return { flagfall, perKm, perMin, isOpen: accountValue === 'open' };
  }

  async setValues({ flagfall, perKm, perMin, isOpen }: { flagfall?: string; perKm?: string; perMin?: string; isOpen?: boolean; }) {
    if (flagfall !== undefined) { await this.flagfall().fill(flagfall); }
    if (perKm    !== undefined) { await this.perKm().fill(perKm); }
    if (perMin   !== undefined) { await this.perMinute().fill(perMin); }
    if (isOpen   !== undefined) { await this.setAccountModeOpen(isOpen); }
  }

  async save() {
    await this.saveButton().click();
  }
}
