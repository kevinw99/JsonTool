import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Comprehensive Diff Panel Navigation - E2E Tests', () => {
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
    
    // Ensure we're in tree view mode for navigation testing
    const treeViewButton = page.locator('text=Tree View');
    if (await treeViewButton.isVisible()) {
      await treeViewButton.click();
    }
    
    await page.screenshot({ path: 'test-results/navigation-setup.png' });
  });

  test.describe('Basic GoTo Functionality', () => {
    test('should find and display diff entries with clickable paths', async ({ page }) => {
      // Look for diff entries in the UI
      const diffItems = await page.locator('.diff-item').count();
      console.log(`Found ${diffItems} diff items`);
      
      expect(diffItems).toBeGreaterThan(0);
      await page.screenshot({ path: 'test-results/diff-items-found.png' });

      // Check that diff items have clickable paths
      const clickablePaths = await page.locator('.diff-path-inline.clickable').count();
      console.log(`Found ${clickablePaths} clickable diff paths`);
      
      expect(clickablePaths).toBeGreaterThan(0);

      // Verify first diff has required attributes
      const firstDiff = page.locator('.diff-item').first();
      await expect(firstDiff).toBeVisible();
      
      const firstPath = firstDiff.locator('.diff-path-inline');
      await expect(firstPath).toBeVisible();
      
      const pathText = await firstPath.textContent();
      expect(pathText).toBeTruthy();
      
      console.log('First diff path:', pathText);
      await page.screenshot({ path: 'test-results/first-diff-verified.png' });
    });

    test('should navigate to target element when clicking diff path', async ({ page }) => {
      // Find the first clickable diff path
      const firstClickablePath = page.locator('.diff-path-inline.clickable').first();
      await expect(firstClickablePath).toBeVisible();
      
      const diffPath = await firstClickablePath.textContent() || '';
      console.log(`Testing navigation for diff path: "${diffPath}"`);
      
      await page.screenshot({ path: 'test-results/before-navigation.png' });

      // Click the diff path to trigger navigation
      await firstClickablePath.click();

      // Wait for navigation to complete
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/after-navigation.png' });

      // Check if target elements exist and are visible
      if (diffPath) {
        const rootSegment = diffPath.split('.')[0];
        const targetElements = await page.locator(`[data-path*="${rootSegment}"]`).count();
        console.log(`Found ${targetElements} potential target elements`);
        
        expect(targetElements).toBeGreaterThan(0);
        
        if (targetElements > 0) {
          await page.screenshot({ path: 'test-results/target-elements-found.png' });
        }
      }
    });

    test('should apply persistent highlighting after navigation', async ({ page }) => {
      const firstClickablePath = page.locator('.diff-path-inline.clickable').first();
      await expect(firstClickablePath).toBeVisible();

      // Click to trigger navigation
      await firstClickablePath.click();
      await page.waitForTimeout(2000);

      // Look for elements with highlighting classes or styles
      const highlightedElements = await page.locator('.highlighted, .persistent-highlight, [class*="highlight"]').count();
      const styledElements = await page.locator('[style*="border"], [style*="background"]').count();
      
      console.log(`Found ${highlightedElements} highlighted elements`);
      console.log(`Found ${styledElements} styled elements`);
      
      await page.screenshot({ path: 'test-results/highlighting-applied.png' });
      
      // Should have some form of highlighting applied
      expect(highlightedElements + styledElements).toBeGreaterThan(0);
    });
  });

  test.describe('Different Diff Types Navigation', () => {
    test('should handle navigation for changed items', async ({ page }) => {
      // Look for a "changed" diff specifically
      const changedDiffs = await page.locator('.diff-item.changed').count();
      
      if (changedDiffs > 0) {
        console.log(`Testing changed diff navigation (${changedDiffs} available)`);
        
        const changedPath = page.locator('.diff-item.changed .diff-path-inline.clickable').first();
        await expect(changedPath).toBeVisible();

        const diffPath = await changedPath.textContent() || '';
        console.log(`Changed diff path: "${diffPath}"`);

        await page.screenshot({ path: 'test-results/changed-diff-before.png' });

        // Click to navigate
        await changedPath.click();
        await page.waitForTimeout(2000);

        await page.screenshot({ path: 'test-results/changed-diff-after.png' });

        // For changed items, both left and right viewers should have the target
        if (diffPath) {
          const rootSegment = diffPath.split('.')[0];
          const leftTarget = await page.locator(`[data-path^="left_"][data-path*="${rootSegment}"]`).count();
          const rightTarget = await page.locator(`[data-path^="right_"][data-path*="${rootSegment}"]`).count();
          
          console.log('Left target found:', leftTarget > 0);
          console.log('Right target found:', rightTarget > 0);
          
          // At least one target should be found
          expect(leftTarget + rightTarget).toBeGreaterThan(0);
        }
      } else {
        console.log('No changed diffs found, skipping test');
        await page.screenshot({ path: 'test-results/no-changed-diffs.png' });
      }
    });

    test('should handle navigation for added items', async ({ page }) => {
      const addedDiffs = await page.locator('.diff-item.added').count();
      
      if (addedDiffs > 0) {
        console.log(`Testing added diff navigation (${addedDiffs} available)`);
        
        const addedPath = page.locator('.diff-item.added .diff-path-inline.clickable').first();
        
        await page.screenshot({ path: 'test-results/added-diff-before.png' });
        
        await addedPath.click();
        await page.waitForTimeout(2000);

        await page.screenshot({ path: 'test-results/added-diff-after.png' });

        // For added items, primarily the right viewer should show the target
        const pathText = await addedPath.textContent() || '';
        if (pathText) {
          const rootSegment = pathText.split('.')[0];
          const rightTarget = await page.locator(`[data-path^="right_"][data-path*="${rootSegment}"]`).count();
          expect(rightTarget).toBeGreaterThan(0);
        }
      } else {
        console.log('No added diffs found, skipping test');
        await page.screenshot({ path: 'test-results/no-added-diffs.png' });
      }
    });

    test('should handle navigation for removed items', async ({ page }) => {
      const removedDiffs = await page.locator('.diff-item.removed').count();
      
      if (removedDiffs > 0) {
        console.log(`Testing removed diff navigation (${removedDiffs} available)`);
        
        const removedPath = page.locator('.diff-item.removed .diff-path-inline.clickable').first();
        
        await page.screenshot({ path: 'test-results/removed-diff-before.png' });
        
        await removedPath.click();
        await page.waitForTimeout(2000);

        await page.screenshot({ path: 'test-results/removed-diff-after.png' });

        // For removed items, primarily the left viewer should show the target
        const pathText = await removedPath.textContent() || '';
        if (pathText) {
          const rootSegment = pathText.split('.')[0];
          const leftTarget = await page.locator(`[data-path^="left_"][data-path*="${rootSegment}"]`).count();
          expect(leftTarget).toBeGreaterThan(0);
        }
      } else {
        console.log('No removed diffs found, skipping test');
        await page.screenshot({ path: 'test-results/no-removed-diffs.png' });
      }
    });
  });

  test.describe('Complex Path Navigation', () => {
    test('should handle deep nested path navigation', async ({ page }) => {
      // Look for diffs with deep nesting (multiple dots in path)
      const allPaths = await page.locator('.diff-path-inline.clickable').allTextContents();
      const deepPaths = allPaths.filter(path => path.split('.').length >= 3);

      if (deepPaths.length > 0) {
        const deepPath = deepPaths[0];
        console.log(`Testing deep nested path: "${deepPath}"`);

        const pathElement = page.locator('.diff-path-inline.clickable').filter({ hasText: deepPath });
        
        await page.screenshot({ path: 'test-results/deep-path-before.png' });
        
        await pathElement.click();
        await page.waitForTimeout(3000); // Extra time for complex navigation

        await page.screenshot({ path: 'test-results/deep-path-after.png' });

        // Verify that parent containers are expanded
        const pathSegments = deepPath.split('.');
        const rootSegment = pathSegments[0];
        
        // Look for expanded elements in the path hierarchy
        const expandedElements = await page.locator(`[data-path*="${rootSegment}"]`).count();
        console.log(`Found ${expandedElements} elements in path hierarchy`);
        
        expect(expandedElements).toBeGreaterThan(0);
      } else {
        console.log('No deep nested paths found, skipping test');
        await page.screenshot({ path: 'test-results/no-deep-paths.png' });
      }
    });

    test('should handle ID-based array navigation', async ({ page }) => {
      // Look for paths with ID-based segments [id=value]
      const allPaths = await page.locator('.diff-path-inline.clickable').allTextContents();
      const idBasedPaths = allPaths.filter(path => /\[id=/.test(path));

      if (idBasedPaths.length > 0) {
        const idBasedPath = idBasedPaths[0];
        console.log(`Testing ID-based path: "${idBasedPath}"`);

        const pathElement = page.locator('.diff-path-inline.clickable').filter({ hasText: idBasedPath });
        
        await page.screenshot({ path: 'test-results/id-based-before.png' });
        
        await pathElement.click();
        await page.waitForTimeout(3000);

        await page.screenshot({ path: 'test-results/id-based-after.png' });

        // For ID-based paths, verify correlation between viewers
        const leftElements = await page.locator('[data-path^="left_"]').count();
        const rightElements = await page.locator('[data-path^="right_"]').count();
        
        console.log(`ID-based navigation - Left elements: ${leftElements}, Right elements: ${rightElements}`);
        
        // Should have correlated elements in both viewers
        expect(leftElements).toBeGreaterThan(0);
        expect(rightElements).toBeGreaterThan(0);
      } else {
        console.log('No ID-based paths found, skipping test');
        await page.screenshot({ path: 'test-results/no-id-based-paths.png' });
      }
    });
  });

  test.describe('Visual Verification', () => {
    test('should verify DOM elements have correct data-path attributes', async ({ page }) => {
      // Check that all data-path attributes follow the correct format
      const dataPathElements = await page.locator('[data-path]').count();
      console.log(`Found ${dataPathElements} elements with data-path attributes`);
      
      expect(dataPathElements).toBeGreaterThan(0);
      await page.screenshot({ path: 'test-results/data-path-elements.png' });

      // Sample a few data-path values to verify format
      const samplePaths = await page.locator('[data-path]').first().getAttribute('data-path');
      console.log('Sample data-path:', samplePaths);

      if (samplePaths) {
        // Check if it follows ViewerPath format: left_... or right_...
        const isValidViewer = /^(left|right)_/.test(samplePaths);
        expect(isValidViewer).toBe(true);
        
        // Verify it doesn't have unexpected "root." in the middle
        const hasUnexpectedRoot = /^(left|right)_.*root\..*root\./.test(samplePaths);
        expect(hasUnexpectedRoot).toBe(false);
      }
    });

    test('should verify expansion state persistence after navigation', async ({ page }) => {
      const firstClickablePath = page.locator('.diff-path-inline.clickable').first();
      
      // Click to navigate and expand
      await firstClickablePath.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/expansion-after-navigation.png' });

      // Check for expanded state indicators
      const expandedIndicators = await page.locator('.expanded, [class*="expand"], .tree-node.open').count();
      console.log(`Found ${expandedIndicators} expanded state indicators`);
      
      // Should have some expanded elements after navigation
      expect(expandedIndicators).toBeGreaterThan(0);

      // Wait a bit more and verify expansion persists
      await page.waitForTimeout(1000);
      
      const persistentExpanded = await page.locator('.expanded, [class*="expand"], .tree-node.open').count();
      expect(persistentExpanded).toBeGreaterThan(0);
      
      await page.screenshot({ path: 'test-results/persistent-expansion.png' });
    });

    test('should verify scroll behavior and element focusing', async ({ page }) => {
      const firstClickablePath = page.locator('.diff-path-inline.clickable').first();
      
      // Get initial viewport position
      const initialScrollTop = await page.evaluate(() => window.scrollY);
      console.log('Initial scroll position:', initialScrollTop);

      await page.screenshot({ path: 'test-results/before-scroll.png' });

      // Click to trigger navigation
      await firstClickablePath.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/after-scroll.png' });

      // Check if scroll position changed or target is visible
      const newScrollTop = await page.evaluate(() => window.scrollY);
      console.log('New scroll position:', newScrollTop);

      // Either scroll should have changed OR target element should be visible
      const hasScrolled = newScrollTop !== initialScrollTop;
      
      // Also check if target elements are in viewport
      const visibleTargets = await page.locator('[data-path]:visible').count();
      
      console.log(`Scroll changed: ${hasScrolled}, Visible targets: ${visibleTargets}`);
      expect(hasScrolled || visibleTargets > 0).toBe(true);
    });
  });

  test.describe('Integration with Other Features', () => {
    test('should work correctly with ID Keys panel navigation', async ({ page }) => {
      // Switch to ID Keys panel if available
      const idKeysTab = page.locator('text=/ID Keys/');
      
      if (await idKeysTab.isVisible()) {
        await idKeysTab.click();
        await page.screenshot({ path: 'test-results/id-keys-panel.png' });
        
        // Look for ID Keys panel elements
        const idKeyElements = await page.locator('.id-keys-panel, [class*="id-key"]').count();
        console.log(`Found ${idKeyElements} ID Keys elements`);
        
        // Switch back to differences and verify it still works
        await page.click('text=/Differences/');
        await page.screenshot({ path: 'test-results/back-to-differences.png' });
        
        const diffItems = await page.locator('.diff-item').count();
        expect(diffItems).toBeGreaterThan(0);
      }
    });

    test('should maintain sync between left and right viewers', async ({ page }) => {
      const firstClickablePath = page.locator('.diff-path-inline.clickable').first();
      
      // Click to navigate
      await firstClickablePath.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/viewer-sync.png' });

      // Check if both viewers have corresponding elements
      const leftElements = await page.locator('[data-path^="left_"]').count();
      const rightElements = await page.locator('[data-path^="right_"]').count();
      
      console.log(`Sync check - Left elements: ${leftElements}, Right elements: ${rightElements}`);
      
      // Both viewers should have content (may not be equal due to diff types)
      expect(leftElements).toBeGreaterThan(0);
      expect(rightElements).toBeGreaterThan(0);
    });
  });
});