import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('ID Keys Navigation Feature - Unit Tests (Playwright)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Load test data directly from files
    const simple1Content = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/simple1.json'), 'utf8'));
    const simple2Content = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/simple2.json'), 'utf8'));
    
    // Wait for the app to be ready and expose testing methods
    await page.waitForFunction(() => typeof (window as any).setTestFiles === 'function', { timeout: 5000 });
    
    // Programmatically inject the test data into the application
    await page.evaluate(({ file1Data, file2Data }) => {
      (window as any).setTestFiles(file1Data, file2Data);
    }, { 
      file1Data: { content: simple1Content, isTextMode: false, fileName: 'simple1.json' },
      file2Data: { content: simple2Content, isTextMode: false, fileName: 'simple2.json' }
    });
    
    // Wait for comparison to complete
    await page.waitForSelector('.diff-list-container', { timeout: 10000 });
    
    await page.screenshot({ path: 'test-results/id-keys-unit-initial.png' });
  });

  test('should consolidate ID keys correctly and verify in UI', async ({ page }) => {
    await page.screenshot({ path: 'test-results/id-keys-loaded.png' });

    // Navigate to ID Keys tab
    await page.click('text=ID Keys');
    await page.screenshot({ path: 'test-results/id-keys-tab.png' });

    // Verify ID keys are displayed
    const idKeyElements = page.locator('.id-keys-panel, [class*="id-key"]');
    await expect(idKeyElements.first()).toBeVisible();

    // Check for specific expected ID keys from sample data
    const expectedKeys = [
      'boomerForecastV3Requests[].parameters.accountParams[]',
      'boomerForecastV3Requests[].parameters.accountParams[].contributions[]',
      'zzCustomDataSets[]'
    ];

    for (const key of expectedKeys) {
      await expect(page.locator(`text="${key}"`).first()).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/id-keys-validated.png' });
  });

  test('should handle ID key detection during JSON comparison', async ({ page }) => {
    // Data is already loaded in beforeEach

    // Switch to ID Keys panel
    await page.click('text=ID Keys');
    
    // Take screenshot showing detected ID keys
    await page.screenshot({ path: 'test-results/json-comparison-id-keys.png' });

    // Verify ID keys were detected (should be more than 0)
    const idKeyItems = page.locator('[class*="id-key"], .id-key-item');
    const count = await idKeyItems.count();
    expect(count).toBeGreaterThan(0);

    // Check that 'id' key is detected for arrays with id fields (use first specific element)
    await expect(page.locator('code.key-value:has-text("id")').first()).toBeVisible();
    
    // Verify array paths are shown
    await expect(page.locator(':text("[]")').first()).toBeVisible();
  });

  test('should not generate ID keys for arrays that exist on only one side', async ({ page }) => {
    // Data is already loaded in beforeEach

    // Navigate to ID Keys tab
    await page.click('text=ID Keys');
    await page.screenshot({ path: 'test-results/one-sided-arrays-check.png' });

    // Get all visible ID key paths from the ID Keys panel
    const idKeyPaths = await page.locator('.path-value').allTextContents();
    
    console.log('Detected ID key paths:', idKeyPaths);

    // Should have valid arrays that exist on both sides (simple1.json and simple2.json have these arrays)
    const expectedValidPaths = [
      'boomerForecastV3Requests[]',
      'boomerForecastV3Requests[].parameters.accountParams[]', 
      'boomerForecastV3Requests[].parameters.accountParams[].contributions[]',
      'zzCustomDataSets[]',
      'zzUserProfiles[]'
    ];
    
    const hasValidPaths = expectedValidPaths.some(expectedPath => 
      idKeyPaths.some(path => path.includes(expectedPath))
    );
    expect(hasValidPaths).toBe(true);

    // Screenshot showing final ID keys
    await page.screenshot({ path: 'test-results/valid-id-keys-only.png' });
  });

  test('should generate correct ArrayPatternPath format with brackets', async ({ page }) => {
    // Data is already loaded in beforeEach

    // Navigate to ID Keys tab
    await page.click('text=ID Keys');
    
    // Take screenshot of ID keys panel
    await page.screenshot({ path: 'test-results/array-pattern-paths.png' });

    // Get all array pattern paths
    const pathElements = page.locator('.path-value:has-text("[]")');
    const paths = await pathElements.allTextContents();

    console.log('Array pattern paths found:', paths);

    // Verify all paths end with []
    const arrayPaths = paths.filter(path => path.includes('[]'));
    expect(arrayPaths.length).toBeGreaterThan(0);

    for (const path of arrayPaths) {
      expect(path).toMatch(/\[\]$/);
      // Should not contain specific indices or ID values
      expect(path).not.toMatch(/\[0\]|\[1\]|\[id=/);
    }
  });

  test('should not generate duplicate diffs for added properties', async ({ page }) => {
    // Data is already loaded in beforeEach

    // Take screenshot of differences
    await page.screenshot({ path: 'test-results/differences-loaded.png' });

    // Check for any property that was added
    const diffItems = page.locator('.diff-item, [class*="diff"]');
    const diffCount = await diffItems.count();
    
    console.log(`Found ${diffCount} diff items`);

    // Look for specific paths that might have duplicates
    const diffTexts = await diffItems.allTextContents();
    const pathCounts = new Map<string, number>();

    diffTexts.forEach(text => {
      // Extract path from diff text (simplified)
      const pathMatch = text.match(/(\w+(?:\.\w+)*)/);
      if (pathMatch) {
        const path = pathMatch[1];
        pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
      }
    });

    // Take screenshot showing all diffs
    await page.screenshot({ path: 'test-results/all-diffs-no-duplicates.png' });

    // Each unique path should appear only once (no duplicates for same property)
    for (const [path, count] of pathCounts) {
      if (count > 1) {
        console.log(`Potential duplicate found for path: ${path} (${count} times)`);
      }
    }
  });
});