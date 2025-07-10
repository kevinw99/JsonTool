# Comprehensive Diff Test Plan

## Test Scenario: Navigate and Verify All Diffs (1-11)

### Pre-test Setup
1. Load `simple1.json` and `simple2.json` files
2. Wait for comparison to complete
3. Navigate to Differences tab

### Expected Results Summary
- **Total Diffs**: Exactly 11 diffs
- **Added Diffs**: 2 (contributionsCalculatorSavingsSlidersResponse + new contribution)
- **Removed Diffs**: 2 (legacySavingsSlidersInputAccountIds + extra contribution)
- **Changed Diffs**: 7 (contributionsCalculatorSavingsSlidersRequest + 5 amounts + contribution type)

## Detailed Verification Steps for Each Diff

### Diff #1: `contributionsCalculatorSavingsSlidersRequest`
- **Type**: Changed
- **Summary**: `null → Object`
- **Verification Steps**:
  1. Click "Go To" button
  2. Verify JSON node is highlighted with `.json-changed` class
  3. Verify breadcrumb shows correct path
  4. Take screenshot for visual verification

### Diff #2: `contributionsCalculatorSavingsSlidersResponse`
- **Type**: Added
- **Summary**: `Object(3 keys)`
- **Verification Steps**:
  1. Click "Go To" button
  2. Verify JSON node is highlighted with `.json-added` class
  3. Verify this appears only in right panel
  4. Verify object contains 3 keys

### Diff #3: `legacySavingsSlidersInputAccountIds`
- **Type**: Removed
- **Summary**: `Array(3 items)`
- **Verification Steps**:
  1. Click "Go To" button
  2. Verify JSON node is highlighted with `.json-removed` class
  3. Verify this appears only in left panel
  4. Verify array contained 3 items

### Diff #4-8: Contribution Amount Changes
- **Paths**: `boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions[0-4]`
- **Type**: Changed (all 5 diffs)
- **Summary**: `7000 → 3500` (for each)
- **Verification Steps** (for each):
  1. Click "Go To" button
  2. Verify JSON node is highlighted with `.json-changed` class
  3. Verify left panel shows `7000`
  4. Verify right panel shows `3500`
  5. Verify path contains ID-based segments correctly

### Diff #9: `boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-extra_0]`
- **Type**: Removed
- **Summary**: `Object(3 keys)`
- **Verification Steps**:
  1. Click "Go To" button
  2. Verify JSON node is highlighted with `.json-removed` class
  3. Verify this appears only in left panel
  4. Verify object structure with 3 keys

### Diff #10: `boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributionType`
- **Type**: Changed
- **Summary**: `CATCH_UP_50_SEPARATE_PRE_TAX → CATCH_UP_50_SEPARATE_AFTER_TAX`
- **Verification Steps**:
  1. Click "Go To" button
  2. Verify JSON node is highlighted with `.json-changed` class
  3. Verify left panel shows `CATCH_UP_50_SEPARATE_PRE_TAX`
  4. Verify right panel shows `CATCH_UP_50_SEPARATE_AFTER_TAX`

### Diff #11: `boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-after_0]`
- **Type**: Added
- **Summary**: `Object(3 keys)`
- **Verification Steps**:
  1. Click "Go To" button
  2. Verify JSON node is highlighted with `.json-added` class
  3. Verify this appears only in right panel
  4. Verify object structure with 3 keys

## Additional Test Scenarios

### Test 1: Basic Count Verification
- **Assertion**: Total diff count equals 11
- **Assertion**: Tab shows "(11)" in label
- **Assertion**: No duplicate diffs for same path

### Test 2: Rapid Navigation Test
- **Process**: Navigate through diffs 1-5 rapidly
- **Assertion**: No JavaScript errors occur
- **Assertion**: All navigation completes successfully

### Test 3: Diff Categorization Test
- **Assertion**: Added diffs count = 2
- **Assertion**: Removed diffs count = 2
- **Assertion**: Changed diffs count = 7
- **Assertion**: Total = 11

### Test 4: Edge Cases Test
- **Test**: Navigate to non-existent diff #20
- **Assertion**: Handles gracefully (no crash)
- **Test**: Switch tabs during navigation
- **Assertion**: Diff count remains correct
- **Test**: Scroll to last diff
- **Assertion**: Navigation still works

## Common Assertions for All Diffs

1. **Visibility**: Diff item is visible in differences list
2. **Go To Button**: "Go To" button exists and is clickable
3. **Highlighting**: Correct CSS class applied after navigation
4. **Breadcrumb**: Path breadcrumb updates correctly
5. **Panel Focus**: Correct panel (left/right) is highlighted
6. **No Errors**: No JavaScript errors in console
7. **Visual Verification**: Screenshot captures correct state

## Test File Location
- **Main Test**: `/e2e/comprehensive-diff-test.spec.ts`
- **Run Command**: `npm run test:e2e -- --grep "Comprehensive Diff"`
- **Screenshots**: Saved to `test-results/diff-{N}-navigation.png`

## Success Criteria
- All 11 diffs detected correctly
- All "Go To" navigation works without errors
- Correct diff type classification
- Proper JSON node highlighting
- No duplicate diff entries
- Breadcrumb navigation accuracy
- Visual verification through screenshots