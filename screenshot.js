#!/usr/bin/env node

/**
 * Screenshot Capture Tool for Chat Logging
 * 
 * Automatically captures screenshots of the browser window
 * and associates them with chat requests for documentation.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ScreenshotCapture {
  constructor() {
    this.screenshotDir = path.join(__dirname, 'screenshots');
    this.browser = null;
    
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir);
    }
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 }
    });
  }

  async captureLocal(requestNumber, description = '') {
    if (!this.browser) await this.init();
    
    const page = await this.browser.newPage();
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load
    await page.waitForSelector('.App', { timeout: 10000 });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `req-${requestNumber}-${timestamp}${description ? '-' + description.replace(/\s+/g, '-') : ''}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    
    await page.screenshot({ 
      path: filepath, 
      fullPage: true 
    });
    
    await page.close();
    console.log(`📸 Screenshot saved: ${filename}`);
    return filename;
  }

  async captureElement(requestNumber, selector, description = '') {
    if (!this.browser) await this.init();
    
    const page = await this.browser.newPage();
    await page.goto('http://localhost:5173');
    
    await page.waitForSelector(selector, { timeout: 10000 });
    const element = await page.$(selector);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `req-${requestNumber}-${timestamp}-${description.replace(/\s+/g, '-')}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    
    await element.screenshot({ path: filepath });
    
    await page.close();
    console.log(`📸 Element screenshot saved: ${filename}`);
    return filename;
  }

  async captureBefore(requestNumber) {
    return await this.captureLocal(requestNumber, 'before');
  }

  async captureAfter(requestNumber) {
    return await this.captureLocal(requestNumber, 'after');
  }

  async captureIssue(requestNumber, description) {
    return await this.captureLocal(requestNumber, `issue-${description}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const capture = new ScreenshotCapture();

  (async () => {
    try {
      switch (args[0]) {
        case 'local':
          const requestNum = parseInt(args[1]) || Date.now();
          const description = args[2] || '';
          await capture.captureLocal(requestNum, description);
          break;

        case 'element':
          const reqNum = parseInt(args[1]) || Date.now();
          const selector = args[2];
          const desc = args[3] || '';
          if (!selector) {
            console.error('Usage: node screenshot.js element <request_num> <selector> [description]');
            process.exit(1);
          }
          await capture.captureElement(reqNum, selector, desc);
          break;

        case 'before':
          await capture.captureBefore(parseInt(args[1]) || Date.now());
          break;

        case 'after':
          await capture.captureAfter(parseInt(args[1]) || Date.now());
          break;

        default:
          console.log(`
Usage: node screenshot.js <command> [args]

Commands:
  local <req_num> [desc]           Capture full page screenshot
  element <req_num> <selector> [desc]  Capture specific element
  before <req_num>                 Capture 'before' state
  after <req_num>                  Capture 'after' state

Examples:
  node screenshot.js local 15 "alignment-issue"
  node screenshot.js element 15 ".diff-list-container" "diff-panel"
  node screenshot.js before 15
  node screenshot.js after 15
          `);
      }
    } catch (error) {
      console.error('Screenshot capture failed:', error.message);
    } finally {
      await capture.close();
    }
  })();
}

export default ScreenshotCapture;
