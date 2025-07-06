import { test, expect } from '@playwright/test';

test.describe('Simple App Test', () => {
  test('should load the app and take screenshot', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app title to be visible
    await expect(page.locator('.app-title')).toBeVisible();
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'test-results/simple-test.png',
      fullPage: true 
    });
    
    // Look for the ID Keys panel
    const idKeysTab = page.locator('.tab-button', { hasText: 'ID Keys' });
    if (await idKeysTab.isVisible()) {
      await idKeysTab.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/id-keys-tab-clicked.png',
        fullPage: true 
      });
      
      // Check if we can find clickable ID key paths
      const clickableIdPaths = page.locator('.path-value.clickable');
      const pathCount = await clickableIdPaths.count();
      
      console.log(`Found ${pathCount} clickable ID key paths`);
      
      if (pathCount > 0) {
        // Click the first path
        await clickableIdPaths.first().click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: 'test-results/first-id-path-clicked.png',
          fullPage: true 
        });
      }
    }
  });
});
