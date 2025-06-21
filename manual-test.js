import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  console.log('🚀 Starting ID Key Navigation Test...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    console.log('📍 Navigating to app...');
    await page.goto('http://localhost:5175');
    
    // Wait for app to load
    console.log('⏳ Waiting for app to load...');
    await page.waitForSelector('.app-title', { timeout: 10000 });
    
    // Take initial screenshot
    console.log('📸 Taking initial screenshot...');
    await page.screenshot({ path: 'test-results/01-app-loaded.png', fullPage: true });
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    // Click ID Keys tab
    console.log('🖱️ Clicking ID Keys tab...');
    const idKeysTab = page.locator('.tab-button:has-text("ID Keys")');
    await idKeysTab.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot of ID Keys panel
    console.log('📸 Taking ID Keys panel screenshot...');
    await page.screenshot({ path: 'test-results/02-id-keys-panel.png', fullPage: true });
    
    // Find clickable paths
    const clickablePaths = page.locator('.path-value.clickable');
    const pathCount = await clickablePaths.count();
    console.log(`🔍 Found ${pathCount} clickable ID key paths`);
    
    if (pathCount > 0) {
      // Get first path text
      const firstPathText = await clickablePaths.first().textContent();
      console.log(`🎯 Clicking first path: "${firstPathText}"`);
      
      // Click first path
      await clickablePaths.first().click();
      await page.waitForTimeout(2000);
      
      // Take screenshot after click
      console.log('📸 Taking post-click screenshot...');
      await page.screenshot({ path: 'test-results/03-after-click.png', fullPage: true });
      
      console.log('✅ Test completed successfully!');
      console.log('📁 Check test-results/ directory for screenshots');
    } else {
      console.log('❌ No clickable paths found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();
