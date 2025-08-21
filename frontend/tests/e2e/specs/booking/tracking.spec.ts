import { test, expect } from '@playwright/test';

// Simple DOM test to verify marker position and timeline updates.
test('marker and timeline respond to updates', async ({ page }) => {
  await page.setContent(`
    <div id="marker"></div>
    <ol id="timeline">
      <li id="s1"></li>
      <li id="s2"></li>
    </ol>
    <script>
      window.update = function(lat, lng, step) {
        document.getElementById('marker').textContent = lat + ',' + lng;
        const items = document.querySelectorAll('#timeline li');
        items.forEach((li, i) => {
          li.className = i <= step ? 'active' : '';
        });
      };
    </script>
  `);

  await page.evaluate(() =>
    (
      window as unknown as {
        update: (lat: number, lng: number, step: number) => void;
      }
    ).update(1, 2, 0),
  );
  await expect(page.locator('#marker')).toHaveText('1,2');
  await expect(page.locator('#s1')).toHaveClass('active');

  await page.evaluate(() =>
    (
      window as unknown as {
        update: (lat: number, lng: number, step: number) => void;
      }
    ).update(3, 4, 1),
  );
  await expect(page.locator('#marker')).toHaveText('3,4');
  await expect(page.locator('#s2')).toHaveClass('active');
});

