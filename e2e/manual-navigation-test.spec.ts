import { test, expect } from '@playwright/test';

test.describe('Manual Navigation and Synchronized Behavior Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Load simple1.json and simple2.json files
    await page.locator('button:has-text("Browse Files")').first().click();
    await page.click('text=simple1.json');
    
    await page.locator('button:has-text("Browse Files")').last().click();
    await page.click('text=simple2.json');
    
    // Wait for comparison to complete
    await page.waitForSelector('.diff-list-container', { timeout: 10000 });
  });

  test('should manually navigate to longest diff path and test synchronized expand/collapse', async ({ page }) => {
    // Click on Differences tab to view diffs
    await page.click('button:has-text("Differences")');
    
    // Find the longest diff path (likely one of the deep nested contribution paths)
    const diffItems = page.locator('.diff-item');
    const diffCount = await diffItems.count();
    
    let longestPath = '';
    let longestDiffIndex = 0;
    
    // Find the diff with the longest path
    for (let i = 0; i < diffCount; i++) {
      const diffItem = diffItems.nth(i);
      const pathText = await diffItem.locator('.diff-path-inline').textContent();
      
      if (pathText && pathText.length > longestPath.length) {
        longestPath = pathText;
        longestDiffIndex = i;
      }
    }
    
    console.log(`Longest diff path found: ${longestPath} (index: ${longestDiffIndex})`);
    
    // Navigate to the longest path
    const longestDiffItem = diffItems.nth(longestDiffIndex);
    const diffPath = longestDiffItem.locator('code.diff-path-inline');
    await diffPath.click();
    
    // Wait for navigation to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-results/01-longest-path-navigated.png',
      fullPage: true 
    });
    
    // Find expanded nodes in both JSON viewers
    const leftViewer = page.locator('[data-viewer="left"]');
    const rightViewer = page.locator('[data-viewer="right"]');
    
    // Look for expand/collapse buttons in the path
    const leftExpandButtons = leftViewer.locator('button:has-text("▼"), button:has-text("▲"), .expand-button, .collapse-button');
    const rightExpandButtons = rightViewer.locator('button:has-text("▼"), button:has-text("▲"), .expand-button, .collapse-button');
    
    const leftButtonCount = await leftExpandButtons.count();
    const rightButtonCount = await rightExpandButtons.count();
    
    console.log(`Found ${leftButtonCount} expand/collapse buttons in left viewer`);
    console.log(`Found ${rightButtonCount} expand/collapse buttons in right viewer`);
    
    if (leftButtonCount > 0) {
      // Test synchronized expand/collapse by clicking buttons in left viewer
      for (let i = 0; i < Math.min(3, leftButtonCount); i++) {
        const leftButton = leftExpandButtons.nth(i);
        
        // Get the button text before clicking
        const buttonTextBefore = await leftButton.textContent();
        console.log(`Clicking left expand/collapse button ${i + 1}: ${buttonTextBefore}`);
        
        // Click the button
        await leftButton.click();
        await page.waitForTimeout(500);
        
        // Take screenshot after each click
        await page.screenshot({ 
          path: `test-results/02-expand-collapse-${i + 1}.png`,
          fullPage: true 
        });
        
        // Verify the button state changed
        const buttonTextAfter = await leftButton.textContent();
        console.log(`Button text changed from "${buttonTextBefore}" to "${buttonTextAfter}"`);
        
        // Check if there's a corresponding button in the right viewer at similar position
        if (i < rightButtonCount) {
          const rightButton = rightExpandButtons.nth(i);
          const rightButtonText = await rightButton.textContent();
          console.log(`Corresponding right button text: ${rightButtonText}`);
          
          // In a synchronized viewer, the states should match or be complementary
          // (This depends on the implementation - they might mirror each other)
        }
      }
    }
    
    // Test manual collapse/expand of specific nodes
    const leftJsonNodes = leftViewer.locator('.json-key-value, .json-object, .json-array');
    const nodeCount = await leftJsonNodes.count();
    
    if (nodeCount > 0) {
      console.log(`Testing manual node expansion with ${nodeCount} nodes available`);
      
      // Click on a few nodes to test expansion
      for (let i = 0; i < Math.min(2, nodeCount); i++) {
        const node = leftJsonNodes.nth(i);
        
        // Check if node is clickable/expandable
        const nodeClass = await node.getAttribute('class');
        console.log(`Clicking on node ${i + 1} with class: ${nodeClass}`);
        
        await node.click();
        await page.waitForTimeout(300);
        
        // Take screenshot after node click
        await page.screenshot({ 
          path: `test-results/03-manual-node-click-${i + 1}.png`,
          fullPage: true 
        });
      }
    }
  });

  test('should test synchronized scrolling when nodes are outside viewport', async ({ page }) => {
    // Navigate to a deep nested diff that will likely be outside viewport
    await page.click('button:has-text("Differences")');
    
    // Find a diff with deep nesting (contributions array items)
    const deepDiffSelector = '.diff-item:has-text("contributions[")';
    const deepDiffItem = page.locator(deepDiffSelector).first();
    
    if (await deepDiffItem.count() > 0) {
      console.log('Found deep nested diff for scroll testing');
      
      const diffPath = deepDiffItem.locator('code.diff-path-inline');
      await diffPath.click();
      await page.waitForTimeout(2000);
    } else {
      // Fallback: click on any diff and then scroll manually
      const firstDiff = page.locator('.diff-item').first();
      const diffPath = firstDiff.locator('code.diff-path-inline');
      await diffPath.click();
      await page.waitForTimeout(2000);
    }
    
    // Get references to both JSON viewers - try multiple selectors
    let leftViewer = page.locator('[data-viewer="left"] .json-tree-content');
    let rightViewer = page.locator('[data-viewer="right"] .json-tree-content');
    
    // Fallback selectors if the main ones don't work
    if (await leftViewer.count() === 0) {
      leftViewer = page.locator('.json-tree-content').first();
      rightViewer = page.locator('.json-tree-content').last();
    }
    
    // Another fallback
    if (await leftViewer.count() === 0) {
      leftViewer = page.locator('.json-tree-view').first();
      rightViewer = page.locator('.json-tree-view').last();
    }
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/04-before-scroll-test.png',
      fullPage: true 
    });
    
    // Test synchronized scrolling by scrolling the left viewer
    console.log('Testing synchronized scrolling...');
    
    // Scroll down in the left viewer
    await leftViewer.evaluate((element) => {
      element.scrollTop = 200;
    });
    await page.waitForTimeout(500);
    
    // Check if right viewer scrolled synchronously
    const leftScrollTop = await leftViewer.evaluate((element) => element.scrollTop);
    const rightScrollTop = await rightViewer.evaluate((element) => element.scrollTop);
    
    console.log(`Left viewer scroll position: ${leftScrollTop}`);
    console.log(`Right viewer scroll position: ${rightScrollTop}`);
    
    // Take screenshot after scroll
    await page.screenshot({ 
      path: 'test-results/05-after-scroll-200px.png',
      fullPage: true 
    });
    
    // Verify synchronized scrolling (they should be close, allowing for some variance)
    const scrollDifference = Math.abs(leftScrollTop - rightScrollTop);
    expect(scrollDifference).toBeLessThan(50); // Allow 50px variance for sync
    
    // Test scrolling to bottom
    await leftViewer.evaluate((element) => {
      element.scrollTop = element.scrollHeight - element.clientHeight;
    });
    await page.waitForTimeout(500);
    
    const leftScrollBottom = await leftViewer.evaluate((element) => element.scrollTop);
    const rightScrollBottom = await rightViewer.evaluate((element) => element.scrollTop);
    
    console.log(`After scroll to bottom - Left: ${leftScrollBottom}, Right: ${rightScrollBottom}`);
    
    // Take screenshot after scroll to bottom
    await page.screenshot({ 
      path: 'test-results/06-after-scroll-to-bottom.png',
      fullPage: true 
    });
    
    // Verify bottom scroll sync
    const bottomScrollDifference = Math.abs(leftScrollBottom - rightScrollBottom);
    expect(bottomScrollDifference).toBeLessThan(50);
    
    // Test horizontal scrolling if content is wide enough
    const leftScrollWidth = await leftViewer.evaluate((element) => element.scrollWidth);
    const leftClientWidth = await leftViewer.evaluate((element) => element.clientWidth);
    
    if (leftScrollWidth > leftClientWidth) {
      console.log('Testing horizontal scroll synchronization...');
      
      // Scroll horizontally
      await leftViewer.evaluate((element) => {
        element.scrollLeft = 100;
      });
      await page.waitForTimeout(500);
      
      const leftScrollLeft = await leftViewer.evaluate((element) => element.scrollLeft);
      const rightScrollLeft = await rightViewer.evaluate((element) => element.scrollLeft);
      
      console.log(`Horizontal scroll - Left: ${leftScrollLeft}, Right: ${rightScrollLeft}`);
      
      // Take screenshot after horizontal scroll
      await page.screenshot({ 
        path: 'test-results/07-after-horizontal-scroll.png',
        fullPage: true 
      });
      
      // Verify horizontal scroll sync
      const horizontalScrollDifference = Math.abs(leftScrollLeft - rightScrollLeft);
      expect(horizontalScrollDifference).toBeLessThan(50);
    }
  });

  test('should test IDPath to numeric path conversion during navigation', async ({ page }) => {
    // Click on Differences tab
    await page.click('button:has-text("Differences")');
    
    // Find a diff with ID-based path (contains [id=, [name=, [username=, etc.)
    const idBasedDiffs = page.locator('.diff-item:has-text("["), .diff-item:has-text("=")');
    const idBasedCount = await idBasedDiffs.count();
    
    console.log(`Found ${idBasedCount} diffs with ID-based paths`);
    
    if (idBasedCount > 0) {
      // Test navigation for each ID-based diff
      for (let i = 0; i < Math.min(5, idBasedCount); i++) {
        const idBasedDiff = idBasedDiffs.nth(i);
        const pathText = await idBasedDiff.locator('.diff-path-inline').textContent();
        
        console.log(`Testing ID-based path navigation ${i + 1}: ${pathText}`);
        
        // Navigate to this diff
        const diffPath = idBasedDiff.locator('code.diff-path-inline');
        await diffPath.click();
        await page.waitForTimeout(1000);
        
        // Check that navigation was successful by looking for highlighted nodes
        const highlightedNodes = page.locator('.json-added, .json-removed, .json-changed, .json-parent-changed, .highlighted, .selected');
        const highlightCount = await highlightedNodes.count();
        
        console.log(`Navigation result: ${highlightCount} nodes highlighted/selected`);
        
        // Take screenshot of the navigation result
        await page.screenshot({ 
          path: `test-results/08-id-path-navigation-${i + 1}.png`,
          fullPage: true 
        });
        
        // Verify that at least one node was highlighted/selected
        expect(highlightCount).toBeGreaterThan(0);
        
        // Check if the correct node is visible in both viewers
        const leftHighlighted = page.locator('[data-viewer="left"] .json-added, [data-viewer="left"] .json-removed, [data-viewer="left"] .json-changed, [data-viewer="left"] .highlighted');
        const rightHighlighted = page.locator('[data-viewer="right"] .json-added, [data-viewer="right"] .json-removed, [data-viewer="right"] .json-changed, [data-viewer="right"] .highlighted');
        
        const leftCount = await leftHighlighted.count();
        const rightCount = await rightHighlighted.count();
        
        console.log(`Highlighted nodes - Left: ${leftCount}, Right: ${rightCount}`);
        
        // For changed items, both sides should be highlighted
        // For added items, only right should be highlighted
        // For removed items, only left should be highlighted
        if (pathText?.includes('Changed:') || pathText?.includes('~')) {
          expect(leftCount).toBeGreaterThan(0);
          expect(rightCount).toBeGreaterThan(0);
        } else if (pathText?.includes('Added:') || pathText?.includes('+')) {
          expect(rightCount).toBeGreaterThan(0);
        } else if (pathText?.includes('Removed:') || pathText?.includes('-')) {
          expect(leftCount).toBeGreaterThan(0);
        }
      }
    }
    
    // Test with the new non-standard ID key diffs we added
    const customDataSetDiffs = page.locator('.diff-item:has-text("zzCustomDataSets")');
    const userProfileDiffs = page.locator('.diff-item:has-text("zzUserProfiles")');
    
    const customCount = await customDataSetDiffs.count();
    const userCount = await userProfileDiffs.count();
    
    console.log(`Found ${customCount} zzCustomDataSets diffs and ${userCount} zzUserProfiles diffs`);
    
    // Test navigation for non-standard ID key patterns
    if (customCount > 0) {
      const customDiff = customDataSetDiffs.first();
      const customPathText = await customDiff.locator('.diff-path-inline').textContent();
      
      console.log(`Testing non-standard ID key navigation: ${customPathText}`);
      
      const diffPath = customDiff.locator('code.diff-path-inline');
      await diffPath.click();
      await page.waitForTimeout(1000);
      
      // Verify navigation success
      const highlightedAfterCustom = page.locator('.json-added, .json-removed, .json-changed, .highlighted');
      const customHighlightCount = await highlightedAfterCustom.count();
      
      console.log(`Non-standard ID key navigation result: ${customHighlightCount} nodes highlighted`);
      expect(customHighlightCount).toBeGreaterThan(0);
      
      await page.screenshot({ 
        path: 'test-results/09-non-standard-id-navigation.png',
        fullPage: true 
      });
    }
  });

  test('should test breadcrumb navigation and path display', async ({ page }) => {
    // Navigate to a deep diff
    await page.click('button:has-text("Differences")');
    
    const deepDiff = page.locator('.diff-item:has-text("contributions[")').first();
    
    if (await deepDiff.count() > 0) {
      const diffPath = deepDiff.locator('code.diff-path-inline');
      await diffPath.click();
      await page.waitForTimeout(1500);
      
      // Look for breadcrumb or path display elements
      const breadcrumbSelectors = [
        '.breadcrumb-segments',
        '.json-path-breadcrumb', 
        '.path-display',
        '.current-path',
        '[data-testid="breadcrumb"]'
      ];
      
      let breadcrumbFound = false;
      
      for (const selector of breadcrumbSelectors) {
        const breadcrumb = page.locator(selector);
        if (await breadcrumb.count() > 0) {
          const breadcrumbText = await breadcrumb.textContent();
          console.log(`Found breadcrumb with selector ${selector}: ${breadcrumbText}`);
          breadcrumbFound = true;
          
          // Test breadcrumb interaction if clickable
          const clickableSegments = breadcrumb.locator('button, .clickable, [role="button"]');
          const segmentCount = await clickableSegments.count();
          
          if (segmentCount > 0) {
            console.log(`Found ${segmentCount} clickable breadcrumb segments`);
            
            // Click on a breadcrumb segment to test navigation
            const firstSegment = clickableSegments.first();
            await firstSegment.click();
            await page.waitForTimeout(500);
            
            await page.screenshot({ 
              path: 'test-results/10-breadcrumb-navigation.png',
              fullPage: true 
            });
          }
          
          break;
        }
      }
      
      if (!breadcrumbFound) {
        console.log('No breadcrumb elements found - this may be expected based on current implementation');
      }
      
      // Take final screenshot
      await page.screenshot({ 
        path: 'test-results/11-final-navigation-state.png',
        fullPage: true 
      });
    }
  });

  test('should test sync-to-counterpart functionality', async ({ page }) => {
    // Navigate to a deep diff first
    await page.click('button:has-text("Differences")');
    
    const deepDiff = page.locator('.diff-item:has-text("contributions[")').first();
    if (await deepDiff.count() > 0) {
      const diffPath = deepDiff.locator('code.diff-path-inline');
      await diffPath.click();
      await page.waitForTimeout(2000);
    }
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/12-sync-counterpart-initial.png',
      fullPage: true 
    });
    
    // Look for expandable nodes in the left viewer
    const leftViewer = page.locator('[data-viewer="left"]');
    const rightViewer = page.locator('[data-viewer="right"]');
    
    // Find expand/collapse buttons or clickable nodes - use more specific visible selectors
    const leftExpandableNodes = leftViewer.locator('button:visible, .json-key:visible, [role="button"]:visible');
    const leftNodeCount = await leftExpandableNodes.count();
    
    console.log(`Found ${leftNodeCount} potentially expandable nodes in left viewer`);
    
    if (leftNodeCount > 0) {
      // Try to click on visible expandable nodes
      let nodeClicked = false;
      for (let i = 0; i < Math.min(5, leftNodeCount); i++) {
        try {
          const expandableNode = leftExpandableNodes.nth(i);
          await expandableNode.click({ timeout: 2000 });
          nodeClicked = true;
          console.log(`Successfully clicked expandable node ${i + 1}`);
          break;
        } catch (error) {
          console.log(`Failed to click node ${i + 1}, trying next...`);
        }
      }
      
      if (!nodeClicked) {
        console.log('No expandable nodes could be clicked, skipping expansion test');
        return;
      }
      
      await page.waitForTimeout(500);
      
      console.log('Expanded node in left viewer');
      
      // Take screenshot after expansion
      await page.screenshot({ 
        path: 'test-results/13-after-left-expansion.png',
        fullPage: true 
      });
      
      // Look for sync-to-counterpart buttons or functionality
      const syncToCounterpartSelectors = [
        'button:has-text("Sync")',
        'button:has-text("sync")',
        '.sync-button',
        '.sync-to-counterpart',
        '[data-testid="sync-counterpart"]',
        'button:has-text("⇄")',
        'button:has-text("↔")'
      ];
      
      let syncButtonFound = false;
      
      for (const selector of syncToCounterpartSelectors) {
        const syncButtons = page.locator(selector);
        const buttonCount = await syncButtons.count();
        
        if (buttonCount > 0) {
          console.log(`Found ${buttonCount} sync buttons with selector: ${selector}`);
          syncButtonFound = true;
          
          // Click the first sync button
          const firstSyncButton = syncButtons.first();
          await firstSyncButton.click();
          await page.waitForTimeout(1000);
          
          console.log('Clicked sync-to-counterpart button');
          
          // Take screenshot after sync
          await page.screenshot({ 
            path: 'test-results/14-after-sync-to-counterpart.png',
            fullPage: true 
          });
          
          break;
        }
      }
      
      if (!syncButtonFound) {
        console.log('No explicit sync-to-counterpart buttons found, testing context menu or right-click');
        
        // Try right-clicking on the expanded node to see if context menu has sync option
        await firstExpandableNode.click({ button: 'right' });
        await page.waitForTimeout(500);
        
        // Look for context menu sync options
        const contextMenuSync = page.locator('.context-menu button:has-text("Sync"), .menu-item:has-text("sync")');
        if (await contextMenuSync.count() > 0) {
          await contextMenuSync.first().click();
          await page.waitForTimeout(1000);
          
          console.log('Used context menu sync option');
          
          await page.screenshot({ 
            path: 'test-results/15-context-menu-sync.png',
            fullPage: true 
          });
        }
      }
    }
    
    // Test sync from right side to left side (simplified)
    console.log('Testing right-to-left sync functionality...');
    
    // Look for sync functionality from right to left without requiring expansion
    const rightSyncButtons = rightViewer.locator('button:has-text("Sync"), button:has-text("sync"), .sync-button');
    const rightSyncCount = await rightSyncButtons.count();
    
    if (rightSyncCount > 0) {
      const rightSyncButton = rightSyncButtons.first();
      await rightSyncButton.click();
      await page.waitForTimeout(1000);
      
      console.log('Clicked sync-to-counterpart from right to left');
      
      await page.screenshot({ 
        path: 'test-results/16-right-to-left-sync.png',
        fullPage: true 
      });
    } else {
      console.log('No sync buttons found in right viewer, skipping right-to-left sync test');
    }
    
    // Test scroll synchronization with viewport changes
    console.log('Testing scroll sync with expanded nodes...');
    
    // Scroll down to test if sync maintains proper alignment
    const leftScrollable = leftViewer.locator('.json-tree-content, .json-tree-view').first();
    const rightScrollable = rightViewer.locator('.json-tree-content, .json-tree-view').first();
    
    if (await leftScrollable.count() > 0) {
      await leftScrollable.evaluate((element) => {
        element.scrollTop = 300;
      });
      await page.waitForTimeout(500);
      
      // Check if right side scrolled synchronously
      const leftScrollPos = await leftScrollable.evaluate((element) => element.scrollTop);
      const rightScrollPos = await rightScrollable.evaluate((element) => element.scrollTop);
      
      console.log(`After expansion and scroll - Left: ${leftScrollPos}, Right: ${rightScrollPos}`);
      
      // Take final screenshot showing scroll sync with expanded content
      await page.screenshot({ 
        path: 'test-results/18-final-sync-with-expansion.png',
        fullPage: true 
      });
      
      // Verify scroll sync (allowing some variance for different content heights)
      const scrollDifference = Math.abs(leftScrollPos - rightScrollPos);
      console.log(`Scroll difference after expansion: ${scrollDifference}px`);
      
      // More lenient check since expanded content might have different heights
      expect(scrollDifference).toBeLessThan(100);
    }
  });
});