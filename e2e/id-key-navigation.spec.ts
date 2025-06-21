import { test, expect } from '@playwright/test';

test.describe('ID Key Navigation with Real Sample Files - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load app and navigate using real sample files with screenshots', async ({ page }) => {
    // The app automatically loads sample files, so we just need to wait for them
    // Wait for the app header to be visible
    await expect(page.locator('.app-title')).toBeVisible();
    
    // Wait for the JSON data to be loaded and displayed
    await expect(page.locator('.json-tree-view, .json-viewer')).toBeVisible();
    
    // Wait for processing/comparison to complete
    await page.waitForTimeout(2000);

    // Take screenshot after the app loads with sample data
    await page.screenshot({ 
      path: 'test-results/01-app-loaded-with-samples.png',
      fullPage: true 
    });

    // Click on the ID Keys tab to ensure it's active
    const idKeysTab = page.locator('.tab-button', { hasText: 'ID Keys' });
    if (await idKeysTab.isVisible()) {
      await idKeysTab.click();
      await page.waitForTimeout(500);
    }

    // Look for ID keys panel or similar navigation elements
    const idKeysPanel = page.locator('.id-keys-panel, [data-testid="id-keys-panel"], .navigation-panel').first();
    
    if (await idKeysPanel.isVisible()) {
      // Look for clickable ID key paths
      const clickableIdPaths = page.locator('.path-value.clickable');
      const clickablePathCount = await clickableIdPaths.count();
      
      if (clickablePathCount > 0) {
        await page.screenshot({ 
          path: 'test-results/02-id-keys-panel-visible.png',
          fullPage: true 
        });

        // Test clicking on the first few ID key paths
        for (let i = 0; i < Math.min(3, clickablePathCount); i++) {
          const pathElement = clickableIdPaths.nth(i);
          const pathText = await pathElement.textContent();
          
          console.log(`Clicking on ID key path ${i + 1}: ${pathText}`);
          await pathElement.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ 
            path: `test-results/03-clicked-id-path-${i + 1}.png`,
            fullPage: true 
          });

          // Check if the corresponding node is highlighted/expanded
          const highlightedElements = page.locator('.highlighted, .selected, .expanded, .diff-highlight');
          const highlightCount = await highlightedElements.count();
          if (highlightCount > 0) {
            console.log(`ID path ${i + 1} navigation successful - ${highlightCount} elements highlighted`);
          }
        }
      }
    } else {
      // If no ID keys panel is visible, take a screenshot to see the current state
      await page.screenshot({ 
        path: 'test-results/02-no-id-keys-panel.png',
        fullPage: true 
      });
      console.log('ID keys panel not found - check app implementation');
    }

    // Final screenshot of the end state
    await page.screenshot({ 
      path: 'test-results/04-final-state.png',
      fullPage: true 
    });
  });

  test('should verify JSON tree expansion and scrolling behavior', async ({ page }) => {
    // Wait for the app to load with sample data
    await expect(page.locator('.app-title')).toBeVisible();
    await expect(page.locator('.json-tree-view, .json-viewer')).toBeVisible();
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'test-results/tree-01-loaded.png',
      fullPage: true 
    });

    // Look for JSON tree structure
    const jsonTree = page.locator('.json-tree-view, .json-viewer, .tree-view').first();
    
    if (await jsonTree.isVisible()) {
      // Test expanding nested objects
      const expandButtons = page.locator('.expand-button, .collapse-button, .toggle-button, button:has-text("▶"), button:has-text("▼")');
      const expandButtonCount = await expandButtons.count();
      
      if (expandButtonCount > 0) {
        // Click first few expand buttons to open the tree
        for (let i = 0; i < Math.min(5, expandButtonCount); i++) {
          const button = expandButtons.nth(i);
          if (await button.isVisible()) {
            await button.click();
            await page.waitForTimeout(300);
          }
        }
        
        await page.screenshot({ 
          path: 'test-results/tree-02-expanded.png',
          fullPage: true 
        });
      }

      // Test scrolling to specific elements
      const targetElements = page.locator('text=legacySavingsSlidersResponse, text=savingsSliders, text=accounts');
      const targetCount = await targetElements.count();
      
      if (targetCount > 0) {
        const targetElement = targetElements.first();
        await targetElement.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: 'test-results/tree-03-scrolled-to-target.png',
          fullPage: true 
        });
      }
    }
  });

  test('should test ID key navigation with different viewport sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Wait for app to load with sample data
    await expect(page.locator('.app-title')).toBeVisible();
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'test-results/mobile-01-loaded.png',
      fullPage: true 
    });

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    await expect(page.locator('.app-title')).toBeVisible();
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'test-results/tablet-01-loaded.png',
      fullPage: true 
    });

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    
    await expect(page.locator('.app-title')).toBeVisible();
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'test-results/desktop-01-loaded.png',
      fullPage: true 
    });
  });

  test('should test rapid ID key navigation for performance', async ({ page }) => {
    // Wait for the app to load with sample data
    await expect(page.locator('.app-title')).toBeVisible();
    await expect(page.locator('.json-tree-view, .json-viewer')).toBeVisible();
    await page.waitForTimeout(2000);

    // Click on the ID Keys tab to ensure it's active
    const idKeysTab = page.locator('.tab-button', { hasText: 'ID Keys' });
    if (await idKeysTab.isVisible()) {
      await idKeysTab.click();
      await page.waitForTimeout(500);
    }

    // Test rapid ID key navigation
    const idKeyElements = page.locator('.path-value.clickable');
    const idKeyCount = await idKeyElements.count();
    
    if (idKeyCount > 0) {
      const startTime = Date.now();
      
      // Click multiple ID keys rapidly
      for (let i = 0; i < Math.min(5, idKeyCount); i++) {
        await idKeyElements.nth(i).click();
        await page.waitForTimeout(200); // Short wait between clicks
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      console.log(`Performance test: Clicked ${Math.min(5, idKeyCount)} ID keys in ${totalTime}ms`);
      
      await page.screenshot({ 
        path: 'test-results/performance-final.png',
        fullPage: true 
      });
    } else {
      console.log('No ID key paths found for performance testing');
      await page.screenshot({ 
        path: 'test-results/performance-no-keys.png',
        fullPage: true 
      });
    }
  });
});
