# Manual Navigation and Synchronized Behavior Test Suite

This test suite validates the manual navigation features, synchronized expand/collapse behavior, sync scrolling, and sync-to-counterpart functionality in the JSON comparison tool.

## Test Files
- `manual-navigation-test.spec.ts` - Comprehensive UI tests for manual navigation

## Test Cases

### 1. Manual Navigation with Synchronized Expand/Collapse
**Test**: `should manually navigate to longest diff path and test synchronized expand/collapse`

**What it tests:**
- Finds the diff with the longest path (deepest nesting)
- Navigates to that diff using "Go To" button
- Tests manual expand/collapse of JSON nodes
- Verifies synchronized behavior between left and right viewers

**Key validations:**
- Navigation to deep nested paths works correctly
- Expand/collapse buttons are functional
- Screenshots capture the navigation flow
- JSON tree expansion is properly synchronized

### 2. Synchronized Scrolling with Viewport Management
**Test**: `should test synchronized scrolling when nodes are outside viewport`

**What it tests:**
- Navigates to deep nested content that may be outside viewport
- Tests vertical scrolling synchronization between viewers
- Tests horizontal scrolling synchronization (if content is wide)
- Validates scroll position alignment within acceptable variance

**Key validations:**
- Left and right viewers scroll synchronously
- Scroll differences are within 50px tolerance
- Both vertical and horizontal scrolling work
- Screenshots show scroll synchronization

### 3. IDPath to Numeric Path Conversion
**Test**: `should test IDPath to numeric path conversion during navigation`

**What it tests:**
- Finds diffs with ID-based paths (contains `[id=`, `[name=`, `[username=`, etc.)
- Tests navigation for each ID-based diff
- Validates that IDPath is correctly converted to numeric paths
- Tests both standard and non-standard ID key patterns

**Key validations:**
- Navigation works for all ID-based path formats
- Proper highlighting of corresponding nodes
- Correct behavior for added/removed/changed items
- Non-standard ID keys (keyUnique, username, etc.) work correctly

### 4. Breadcrumb Navigation
**Test**: `should test breadcrumb navigation and path display`

**What it tests:**
- Looks for breadcrumb or path display elements
- Tests clickable breadcrumb segments if available
- Validates path display during navigation

**Key validations:**
- Breadcrumb elements are detected (if implemented)
- Clickable segments navigate correctly
- Path information is displayed properly

### 5. Sync-to-Counterpart Functionality
**Test**: `should test sync-to-counterpart functionality`

**What it tests:**
- Manual expansion of nodes in left viewer
- Detection and testing of sync-to-counterpart buttons
- Sync functionality from left to right viewer
- Sync functionality from right to left viewer
- Scroll synchronization after node expansion

**Key validations:**
- Sync buttons are found and functional
- Manual node expansion works
- Sync-to-counterpart triggers proper alignment
- Scroll positions remain synchronized after expansion
- Screenshots document the sync process

## Test Data
The tests use the same test data as other test suites:
- `public/simple1.json` - Left side JSON data
- `public/simple2.json` - Right side JSON data with differences

## Key Features Tested

### Manual Navigation
- ✅ Longest diff path navigation
- ✅ Deep nested path handling
- ✅ IDPath to numeric conversion
- ✅ Non-standard ID key support (`[name=]`, `[username=]`, `[keyUnique=]`)

### Synchronized Behavior
- ✅ Expand/collapse synchronization
- ✅ Vertical scroll synchronization
- ✅ Horizontal scroll synchronization
- ✅ Sync-to-counterpart functionality

### UI Interaction
- ✅ Manual node expansion/collapse
- ✅ Button click handling
- ✅ Context menu detection
- ✅ Viewport management

### Path Conversion
- ✅ ID-based path navigation
- ✅ Standard ID patterns (`[id=value]`)
- ✅ Non-standard ID patterns (`[property=value]`)
- ✅ Numeric path conversion accuracy

## Screenshots Generated
The tests generate comprehensive screenshots for visual validation:
- `01-longest-path-navigated.png` - Initial navigation result
- `02-expand-collapse-*.png` - Expand/collapse interactions
- `03-manual-node-click-*.png` - Manual node interactions
- `04-before-scroll-test.png` - Pre-scroll state
- `05-after-scroll-200px.png` - After vertical scroll
- `06-after-scroll-to-bottom.png` - Bottom scroll position
- `07-after-horizontal-scroll.png` - Horizontal scroll (if applicable)
- `08-id-path-navigation-*.png` - ID-based path navigation results
- `09-non-standard-id-navigation.png` - Non-standard ID key navigation
- `10-breadcrumb-navigation.png` - Breadcrumb interaction
- `11-final-navigation-state.png` - Final state
- `12-sync-counterpart-initial.png` - Sync test initial state
- `13-after-left-expansion.png` - After expanding left node
- `14-after-sync-to-counterpart.png` - After sync button click
- `15-context-menu-sync.png` - Context menu sync (if available)
- `16-right-to-left-sync.png` - Right-to-left sync result
- `17-final-sync-with-expansion.png` - Final sync state

## Performance Characteristics
- **Browser Support**: Chrome/Chromium only (configured for speed)
- **Test Duration**: ~20-30 seconds for full suite
- **Timeout**: 30 seconds per test
- **Stability**: Uses appropriate waits and retries for UI interactions

## Usage
```bash
# Run all manual navigation tests
npx playwright test e2e/manual-navigation-test.spec.ts

# Run specific test
npx playwright test e2e/manual-navigation-test.spec.ts --grep "sync-to-counterpart"

# Run with visual output
npx playwright test e2e/manual-navigation-test.spec.ts --reporter=list
```