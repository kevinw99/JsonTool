#!/bin/bash

# Comprehensive Diff Test Runner
# This script runs the comprehensive JSON diff tests for simple1.json vs simple2.json

echo "🚀 Starting Comprehensive JSON Diff Tests"
echo "=========================================="

# Create test-results directory if it doesn't exist
mkdir -p test-results

echo "📁 Test results will be saved in: test-results/"

# Check if the dev server is running
if ! curl -s http://localhost:5175 > /dev/null; then
    echo "⚠️  Dev server is not running on port 5175"
    echo "Please start the dev server first with: npm run dev"
    exit 1
fi

echo "✅ Dev server is running on http://localhost:5175"

# Run the comprehensive test
echo "🧪 Running comprehensive diff tests..."
npx playwright test e2e/comprehensive-diff-test.spec.ts --reporter=line

# Check the exit code
if [ $? -eq 0 ]; then
    echo "✅ All tests passed successfully!"
    echo "📸 Check the test-results/ directory for screenshots"
    echo "📊 Test report: playwright-report/index.html"
else
    echo "❌ Some tests failed"
    echo "📸 Check the test-results/ directory for failure screenshots"
    echo "📊 Test report: playwright-report/index.html"
    exit 1
fi