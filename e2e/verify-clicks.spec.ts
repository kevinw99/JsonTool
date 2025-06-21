import { test, expect } from '@playwright/test';

test.describe('ID Key Click Verification', () => {
  test('should click ID key paths and capture evidence', async ({ page }) => {
    console.log('🚀 Starting ID Key navigation test...');
    
    // Navigate to the app
    await page.goto('/');
    console.log('✅ Navigated to app');
    
    // Wait for the app to load
    await expect(page.locator('.app-title')).toBeVisible();
    console.log('✅ App title visible');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/01-app-loaded.png',
      fullPage: true 
    });
    console.log('📸 Screenshot 1: App loaded');
    
    // Wait for JSON data to be processed
    await page.waitForTimeout(3000);
    
    // Click on ID Keys tab
    const idKeysTab = page.locator('.tab-button:has-text("ID Keys")');
    await expect(idKeysTab).toBeVisible();
    await idKeysTab.click();
    console.log('✅ Clicked ID Keys tab');
    
    await page.waitForTimeout(1000);
    
    // Take screenshot of ID Keys panel
    await page.screenshot({ 
      path: 'test-results/02-id-keys-panel.png',
      fullPage: true 
    });
    console.log('📸 Screenshot 2: ID Keys panel visible');
    
    // Find all clickable ID key paths
    const clickablePaths = page.locator('.path-value.clickable');
    const pathCount = await clickablePaths.count();
    console.log(`🔍 Found ${pathCount} clickable ID key paths`);
    
    if (pathCount > 0) {
      // Get text of first path for logging
      const firstPathText = await clickablePaths.first().textContent();
      console.log(`🎯 About to click first path: "${firstPathText}"`);
      
      // Click the first path
      await clickablePaths.first().click();
      console.log('🖱️ Clicked first ID key path');
      
      // Wait for navigation/highlighting to occur
      await page.waitForTimeout(2000);
      
      // Take screenshot after clicking
      await page.screenshot({ 
        path: 'test-results/03-after-first-click.png',
        fullPage: true 
      });
      console.log('📸 Screenshot 3: After clicking first path');
      
      // Try to click a second path if available
      if (pathCount > 1) {
        const secondPathText = await clickablePaths.nth(1).textContent();
        console.log(`🎯 About to click second path: "${secondPathText}"`);
        
        await clickablePaths.nth(1).click();
        console.log('🖱️ Clicked second ID key path');
        
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'test-results/04-after-second-click.png',
          fullPage: true 
        });
        console.log('📸 Screenshot 4: After clicking second path');
      }
      
      // Check for any highlighted or expanded elements
      const highlightedElements = page.locator('.highlighted, .selected, .expanded, .diff-highlight');
      const highlightCount = await highlightedElements.count();
      console.log(`✨ Found ${highlightCount} highlighted/expanded elements`);
      
      // Final screenshot
      await page.screenshot({ 
        path: 'test-results/05-final-state.png',
        fullPage: true 
      });
      console.log('📸 Screenshot 5: Final state');
      
    } else {
      console.log('❌ No clickable ID key paths found');
      await page.screenshot({ 
        path: 'test-results/no-paths-found.png',
        fullPage: true 
      });
    }
    
    console.log('🏁 Test completed successfully!');
  });
});
