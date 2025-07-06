import { test, expect } from '@playwright/test';

test.describe('Responsive Layout Testing', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'narrow', width: 480, height: 800 },
    { name: 'desktop', width: 1200, height: 800 }
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should display correctly on ${name} viewport (${width}x${height})`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width, height });
      
      // Navigate to app
      await page.goto('/');
      
      // Wait for app to load
      await expect(page.locator('.app-title')).toBeVisible();
      await page.waitForTimeout(3000);
      
      // Take screenshot of main view
      await page.screenshot({ 
        path: `test-results/responsive-${name}-main.png`,
        fullPage: true 
      });
      
      // Click ID Keys tab
      const idKeysTab = page.locator('.tab-button:has-text("ID Keys")');
      if (await idKeysTab.isVisible()) {
        await idKeysTab.click();
        await page.waitForTimeout(1000);
        
        // Take screenshot of ID Keys panel
        await page.screenshot({ 
          path: `test-results/responsive-${name}-idkeys.png`,
          fullPage: true 
        });
        
        // Test clicking an ID key path to see navigation
        const clickablePaths = page.locator('.path-value.clickable');
        const pathCount = await clickablePaths.count();
        
        if (pathCount > 0) {
          await clickablePaths.first().click();
          await page.waitForTimeout(1500);
          
          // Take screenshot after navigation
          await page.screenshot({ 
            path: `test-results/responsive-${name}-navigation.png`,
            fullPage: true 
          });
        }
      }
      
      console.log(`✅ ${name} viewport test completed`);
    });
  });
});
