# Comprehensive JSON Diff Test Suite

## Overview

This test suite provides comprehensive UI testing for the JSON comparison tool, specifically designed to verify the correct detection and navigation of diffs between `simple1.json` and `simple2.json`.

## Test Files Created

### 1. `/e2e/comprehensive-diff-test.spec.ts`
The main test file containing three comprehensive test scenarios:

#### Test 1: "should detect exactly 11 diffs and verify navigation to each"
- **Purpose**: Verifies that exactly 11 diffs are detected and all can be navigated to
- **Actions**:
  - Loads simple1.json and simple2.json using file selectors
  - Verifies the diff count shows 11 in the Differences tab
  - Navigates to each diff (1-11) using the "Go To" buttons
  - Takes screenshots of each diff for visual verification
  - Tests diff list scrolling and interaction

#### Test 2: "should handle edge cases and error scenarios"
- **Purpose**: Tests robustness and error handling
- **Actions**:
  - Tests navigation to non-existent diffs
  - Tests rapid clicking on multiple diff items
  - Tests tab switching between Differences and ID Keys
  - Verifies graceful handling of edge cases

#### Test 3: "should verify diff content accuracy"
- **Purpose**: Verifies that diff content and categorization are correct
- **Actions**:
  - Tests specific critical diffs for content accuracy
  - Verifies diff type indicators (added/removed/changed)
  - Ensures total diff count equals 11

### 2. `/e2e/diff-analysis.md`
Detailed analysis of the expected differences between the two JSON files:

- **11 Expected Diffs**:
  1. contributionsCalculatorSavingsSlidersRequest (changed from null to object)
  2. contributionsCalculatorSavingsSlidersResponse (added)
  3. legacySavingsSlidersInputAccountIds (removed)
  4-8. Five contribution amounts (changed from 7000 to 3500)
  9. Second contribution object (removed)
  10. Contribution type (changed from PRE_TAX to AFTER_TAX)
  11. New contribution object (added)

### 3. `/run-comprehensive-test.sh`
Test runner script that:
- Checks if dev server is running
- Creates test-results directory
- Runs the comprehensive tests
- Reports results and screenshot locations

## Expected Diff Details

Based on analysis of the JSON files, the test expects these specific differences:

| Diff # | Type | Path | Left Value | Right Value |
|--------|------|------|------------|-------------|
| 1 | Changed | contributionsCalculatorSavingsSlidersRequest | null | {complex object} |
| 2 | Added | contributionsCalculatorSavingsSlidersResponse | missing | {watchdogLogs} |
| 3 | Removed | legacySavingsSlidersInputAccountIds | [3 account IDs] | missing |
| 4-8 | Changed | contributions[0].contributions[0-4] | 7000 | 3500 |
| 9 | Removed | contributions[1] | {participant extra} | missing |
| 10 | Changed | contributions[1].contributionType | PRE_TAX | AFTER_TAX |
| 11 | Added | contributions[2] | missing | {after tax contrib} |

## Test Execution

### Prerequisites
1. Dev server running on `http://localhost:5175`
2. Both `simple1.json` and `simple2.json` files in the public directory
3. Playwright installed and configured

### Running the Tests

```bash
# Method 1: Use the test runner script
./run-comprehensive-test.sh

# Method 2: Direct Playwright execution
npx playwright test e2e/comprehensive-diff-test.spec.ts

# Method 3: Run with specific browser
npx playwright test e2e/comprehensive-diff-test.spec.ts --project=chromium
```

### Test Output

The tests will generate:
- **Screenshots**: `test-results/` directory containing images of each diff
- **Test Report**: `playwright-report/index.html` with detailed results
- **Console Output**: Detailed logging of each test step

## Key Selectors Used

The test uses these CSS selectors based on the actual component structure:

- `.file-selector.left .file-selector-toggle` - Left file browser
- `.file-selector.right .file-selector-toggle` - Right file browser
- `.file-selector-option` - File selection options
- `.tab-button:has-text("Differences")` - Differences tab
- `.diff-item` - Individual diff items
- `.goto-button` - Navigation buttons for diffs
- `.diff-item.added/.removed/.changed` - Diff type indicators

## Validation Points

The comprehensive test validates:

1. **Diff Count Accuracy**: Exactly 11 diffs are detected
2. **Navigation Functionality**: All 11 diffs can be navigated to
3. **UI Responsiveness**: Interface remains responsive during navigation
4. **Error Handling**: Graceful handling of edge cases
5. **Content Accuracy**: Diff summaries contain expected content
6. **Type Classification**: Proper categorization of added/removed/changed

## Integration with CI/CD

This test suite can be integrated into CI/CD pipelines to:
- Catch regressions in diff detection
- Verify UI navigation functionality
- Ensure consistent diff counting after changes
- Validate visual presentation of diffs

## Troubleshooting

### Common Issues

1. **Dev server not running**: Ensure `npm run dev` is running on port 5175
2. **Files not found**: Verify simple1.json and simple2.json exist in public/
3. **Playwright not installed**: Run `npm install` to install dependencies
4. **Test timeouts**: Increase timeout values if running on slow systems

### Debug Mode

Run tests with debug mode for troubleshooting:
```bash
npx playwright test e2e/comprehensive-diff-test.spec.ts --debug
```

This comprehensive test suite ensures that the JSON comparison tool correctly identifies all differences between the test files and provides robust UI navigation capabilities.