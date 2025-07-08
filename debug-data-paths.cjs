const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the app to load
    await page.waitForSelector('[data-path]', { timeout: 10000 });
    
    // Get all data-path attributes
    const dataPathElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-path]');
      return Array.from(elements).map(el => ({
        dataPath: el.getAttribute('data-path'),
        textContent: el.textContent?.substring(0, 50) || '',
        className: el.className
      }));
    });
    
    console.log('📍 Found', dataPathElements.length, 'elements with data-path attributes');
    
    // Check for problematic path patterns
    const problematicPattern = /boomerForecastV3Requests.*accountParams.*contributions.*contributionType/;
    const matchingElements = dataPathElements.filter(el => problematicPattern.test(el.dataPath));
    
    console.log('\n🎯 Elements matching the problematic pattern:');
    matchingElements.forEach((el, i) => {
      console.log(`${i + 1}. data-path="${el.dataPath}"`);
      console.log(`   text: "${el.textContent}"`);
      console.log(`   class: "${el.className}"`);
      console.log('');
    });
    
    // Check for specific path components
    const accountParamsElements = dataPathElements.filter(el => 
      el.dataPath.includes('accountParams') && el.dataPath.includes('boomerForecastV3Requests')
    );
    
    console.log('\n📊 AccountParams related elements:');
    accountParamsElements.forEach((el, i) => {
      console.log(`${i + 1}. "${el.dataPath}"`);
    });
    
    // Look for left/right prefixed paths
    const leftPaths = dataPathElements.filter(el => el.dataPath.startsWith('left_'));
    const rightPaths = dataPathElements.filter(el => el.dataPath.startsWith('right_'));
    
    console.log(`\n🔍 Found ${leftPaths.length} left_ prefixed paths`);
    console.log(`🔍 Found ${rightPaths.length} right_ prefixed paths`);
    
    // Sample some left paths that contain the problematic structure
    const leftProblematicPaths = leftPaths.filter(el => 
      el.dataPath.includes('boomerForecastV3Requests') && el.dataPath.includes('accountParams')
    );
    
    console.log('\n🎯 Left viewer paths with boomerForecastV3Requests.accountParams:');
    leftProblematicPaths.slice(0, 10).forEach((el, i) => {
      console.log(`${i + 1}. "${el.dataPath}"`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
})();