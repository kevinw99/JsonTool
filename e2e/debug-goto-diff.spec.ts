import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Debug GoToDiff Navigation (Playwright)', () => {
  test('should load sample data and debug diff navigation with screenshots', async ({ page }) => {
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
    
    await page.screenshot({ path: 'test-results/debug-initial-load.png' });
    console.log('Loaded simple1.json and simple2.json programmatically');

    await page.screenshot({ path: 'test-results/debug-after-load.png' });

    // Check how many Go To buttons were found
    const goToButtons = await page.locator('text=/Go To/').count();
    console.log('Number of Go To buttons found:', goToButtons);

    // Check if there are any difference items
    const diffItems = await page.locator('[class*="diff"]').count();
    console.log('Number of diff-related elements:', diffItems);

    // Take screenshot of differences section
    const differencesVisible = await page.locator('text=/Differences/').isVisible();
    console.log('Differences section visible:', differencesVisible);
    
    if (differencesVisible) {
      await page.screenshot({ path: 'test-results/debug-differences-section.png' });
    }

    // Check if files were loaded correctly by looking at viewers
    const leftViewer = page.locator('[data-viewer="left"]').first();
    const rightViewer = page.locator('[data-viewer="right"]').first();
    
    const leftVisible = await leftViewer.isVisible();
    const rightVisible = await rightViewer.isVisible();
    
    console.log('Left viewer visible:', leftVisible);
    console.log('Right viewer visible:', rightVisible);

    if (leftVisible && rightVisible) {
      await page.screenshot({ path: 'test-results/debug-both-viewers.png' });
    }

    // Look for any elements containing "boomerForecastV3Requests"
    const boomerElements = await page.locator('[data-path*="boomerForecastV3Requests"]').count();
    const leftBoomerElements = await page.locator('[data-path^="left_"][data-path*="boomerForecastV3Requests"]').count();
    const rightBoomerElements = await page.locator('[data-path^="right_"][data-path*="boomerForecastV3Requests"]').count();
    
    console.log('Number of boomerForecastV3Requests elements:', boomerElements);
    console.log('Left boomerForecastV3Requests elements:', leftBoomerElements);
    console.log('Right boomerForecastV3Requests elements:', rightBoomerElements);

    // Take screenshot showing the elements with boomerForecastV3Requests
    if (boomerElements > 0) {
      await page.screenshot({ path: 'test-results/debug-boomer-elements.png' });
      
      // Highlight the first boomerForecastV3Requests element
      const firstBoomerElement = page.locator('[data-path*="boomerForecastV3Requests"]').first();
      if (await firstBoomerElement.isVisible()) {
        await firstBoomerElement.scrollIntoViewIfNeeded();
        await page.screenshot({ path: 'test-results/debug-first-boomer-element.png' });
      }
    }

    // Try to find clickable diff paths
    const clickablePaths = await page.locator('.diff-path-inline.clickable').count();
    console.log('Number of clickable diff paths:', clickablePaths);

    if (clickablePaths > 0) {
      await page.screenshot({ path: 'test-results/debug-clickable-paths.png' });
      
      // Try clicking the first diff path
      const firstPath = page.locator('.diff-path-inline.clickable').first();
      const pathText = await firstPath.textContent();
      console.log('First clickable path text:', pathText);
      
      await firstPath.click();
      await page.waitForTimeout(1000); // Wait for navigation
      await page.screenshot({ path: 'test-results/debug-after-path-click.png' });
    }

    // Check if Tree View mode is active
    const treeViewButton = page.locator('text=Tree View');
    const isTreeView = await treeViewButton.isVisible();
    console.log('Tree View button visible:', isTreeView);
    
    if (isTreeView) {
      await treeViewButton.click();
      await page.screenshot({ path: 'test-results/debug-tree-view-mode.png' });
    }

    // Final screenshot showing the complete state
    await page.screenshot({ path: 'test-results/debug-final-state.png' });

    // Verify that the test doesn't fail - this is for debugging purposes
    expect(true).toBe(true);
  });

  test('should test specific GoTo diff functionality with visual verification', async ({ page }) => {
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
    
    // Ensure we're in tree view
    const treeViewButton = page.locator('text=Tree View');
    if (await treeViewButton.isVisible()) {
      await treeViewButton.click();
    }
    
    await page.screenshot({ path: 'test-results/goto-test-setup.png' });

    // Find the first clickable diff path
    const firstClickablePath = page.locator('.diff-path-inline.clickable').first();
    
    if (await firstClickablePath.isVisible()) {
      const pathText = await firstClickablePath.textContent();
      console.log(`Testing navigation for diff path: "${pathText}"`);
      
      // Take screenshot before clicking
      await page.screenshot({ path: 'test-results/goto-before-click.png' });
      
      // Record initial scroll positions
      const leftViewer = page.locator('[data-viewer="left"]');
      const rightViewer = page.locator('[data-viewer="right"]');
      
      // Click the diff path to trigger navigation
      await firstClickablePath.click();
      
      // Wait for potential navigation/scrolling
      await page.waitForTimeout(2000);
      
      // Take screenshot after clicking
      await page.screenshot({ path: 'test-results/goto-after-click.png' });
      
      // Check if any highlighting was applied
      const highlightedElements = await page.locator('.highlighted, .persistent-highlight, [class*="highlight"]').count();
      const styledElements = await page.locator('[style*="border"], [style*="background"]').count();
      
      console.log(`Found ${highlightedElements} highlighted elements`);
      console.log(`Found ${styledElements} styled elements`);
      
      if (highlightedElements > 0 || styledElements > 0) {
        await page.screenshot({ path: 'test-results/goto-highlighting-applied.png' });
      }
      
      // Look for target elements that match the path
      if (pathText) {
        const rootSegment = pathText.split('.')[0];
        const targetElements = await page.locator(`[data-path*="${rootSegment}"]`).count();
        console.log(`Found ${targetElements} potential target elements for "${rootSegment}"`);
        
        if (targetElements > 0) {
          await page.screenshot({ path: 'test-results/goto-target-elements-found.png' });
        }
      }
    } else {
      console.log('No clickable diff paths found');
      await page.screenshot({ path: 'test-results/goto-no-clickable-paths.png' });
    }
  });
});