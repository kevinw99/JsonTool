#!/bin/bash

echo "🚀 Running ID Key Navigation Test with Manual Screenshots"
echo "========================================================="

# Create test results directory
mkdir -p test-results

echo "📋 Step 1: Taking manual screenshot of the app..."
# Use Playwright to take a screenshot
npx playwright codegen http://localhost:5175 --output=test-results/manual-screenshot.png

echo "✅ Test setup complete!"
echo ""
echo "🔍 To manually verify ID Key navigation:"
echo "1. Open: http://localhost:5175"
echo "2. Click the 'ID Keys' tab at the bottom"
echo "3. Click any blue clickable path (e.g., 'accounts[]')"
echo "4. Observe the JSON tree expanding and highlighting"
echo ""
echo "📸 Screenshots will be saved to test-results/ directory"
