#!/bin/bash

# Comprehensive Diff Test Runner
# Tests the complete diff detection and navigation functionality

echo "🧪 Starting Comprehensive Diff Tests..."
echo "📁 Testing with simple1.json and simple2.json files"

# Ensure test results directory exists
mkdir -p test-results

# Run the comprehensive diff test
echo "🚀 Running Playwright tests..."
npx playwright test e2e/comprehensive-diff-test.spec.ts --headed

# Check if tests passed
if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
    echo "📸 Screenshots saved to test-results/"
    echo "📋 Test covered:"
    echo "   - Exactly 11 diffs detected"
    echo "   - Navigation to each diff (1-11)"
    echo "   - Diff type verification (added/removed/changed)"
    echo "   - No duplicate entries"
    echo "   - Edge case handling"
else
    echo "❌ Tests failed!"
    echo "💡 Check the test output above for details"
    exit 1
fi

echo ""
echo "📚 For detailed test plan, see: COMPREHENSIVE_DIFF_TEST_PLAN.md"