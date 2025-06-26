# JSON Comparison Tool - Features Specification

## Overview
This document defines the exact requ### ✅ FIXED (Recently Completed)
1. **Diff Panel showing ID-key based paths instead of index-based**
   - ✅ Fixed: displayPath now uses `[idKey=value]` format
   - ✅ Root cause: jsonCompare.ts was using numeric indices for displayPath
   - ✅ Solution: Updated compareArraysWithIdKey function to generate proper ID-key paths

2. **JSON tree diff highlighting working**
   - ✅ Fixed: Path matching logic completely rewritten
   - ✅ Root cause: Overly complex path conversion causing no matches
   - ✅ Solution: Simplified exact match and parent match logic with proper ID-key to numeric conversion

3. **File persistence on reload**
   - ✅ Added: Files now auto-save to localStorage when loaded
   - ✅ Added: On reload, tries to restore saved files first, falls back to sample1.json/sample2.json
   - ✅ Added: 7-day expiration for saved files to prevent stale datand expected behavior for all features in the JSON comparison tool to prevent regressions and ensure consistent functionality.

## Core Features

### 1. JSON Diff Detection and Display

#### 1.1 Diff Panel (DiffList)
**Requirements:**
- ✅ **MUST** display differences using ID-key based paths when ID key is set
- ✅ **MUST** show human-readable paths (e.g., `household.accounts[name=83531838::1].currentContributionOverride`)
- ✅ **MUST NOT** show numeric index paths (e.g., `household.accounts[0].currentContributionOverride`)
- ✅ **MUST** display three diff types with different styling:
  - **Added** (green): Only in right/new JSON
  - **Removed** (red): Only in left/old JSON  
  - **Changed** (blue): Different values between left and right
- ✅ **MUST** show before/after values for changed items
- ✅ **MUST** provide working "Go To" functionality for each diff

#### 1.2 JSON Tree Highlighting
**Requirements:**
- ✅ **MUST** highlight diffs in JSON tree with appropriate colors
- ✅ **MUST** support three highlight types:
  - **Direct node highlighting**: Node that has the actual diff
  - **Parent node highlighting**: Parent of a node that has diffs
  - **Value highlighting**: For primitive value changes
- ✅ **MUST** use ID-key based path matching when ID key is configured
- ✅ **MUST** handle both sides (left/right) correctly for added/removed items

#### 1.3 Navigation Integration
**Requirements:**
- ✅ **MUST** "Go To" from diff panel navigates to correct node in JSON tree
- ✅ **MUST** highlight and scroll to the target node
- ✅ **MUST** expand parent nodes as needed to reveal target
- ✅ **MUST** work with both ID-key and numeric paths

### 2. ID Key Management

#### 2.1 ID Key Detection and Selection
**Requirements:**
- ✅ **MUST** automatically detect potential ID keys in arrays
- ✅ **MUST** allow manual ID key selection
- ✅ **MUST** update all displays when ID key changes
- ✅ **MUST** show ID Keys panel with discovered keys

#### 2.2 ID Keys Panel
**Requirements:**
- ✅ **MUST** show list of detected ID keys with occurrence counts
- ✅ **MUST** provide "Show All Occurrences" functionality
- ✅ **MUST** make individual occurrences clickable for navigation
- ✅ **MUST** expand/collapse occurrence lists
- ✅ **MUST** navigate to correct array items when clicked

### 3. File Management

#### 3.1 File Loading
**Requirements:**
- ✅ **MUST** support drag-and-drop file loading
- ✅ **MUST** support file picker dialog
- ✅ **MUST** handle large JSON files efficiently
- ✅ **MUST** show file names in headers
- ✅ **MUST** validate JSON format

#### 3.2 File Saving
**Requirements:**
- ✅ **MUST** save files with real filenames (not "left"/"right")
- ✅ **MUST** preserve .json extension
- ✅ **MUST** work through unified Vite dev server
- ✅ **MUST** provide save confirmation/feedback

### 4. UI/UX Requirements

#### 4.1 Responsive Design
**Requirements:**
- ✅ **MUST** use single-line layout with ellipsis truncation
- ✅ **MUST** provide horizontal scrolling for long content
- ✅ **MUST** maintain readability on different screen sizes
- ✅ **MUST** not wrap content to multiple lines

#### 4.2 View Modes
**Requirements:**
- ✅ **MUST** support Tree View and Text View modes
- ✅ **MUST** pretty-print JSON in Text View with proper alignment
- ✅ **MUST** maintain sync between view modes
- ✅ **MUST** preserve formatting and indentation

#### 4.3 Diff-Only Mode
**Requirements:**
- ✅ **MUST** show only nodes with differences when enabled
- ✅ **MUST** show parent nodes of differing nodes
- ✅ **MUST** hide unchanged content
- ✅ **MUST** maintain navigation functionality

## Current Status (Updated: 2025-06-26)

### � FIXED (Recently Completed)
1. **Diff Panel showing ID-key based paths instead of index-based**
   - ✅ Fixed: displayPath now uses `[idKey=value]` format
   - ✅ Root cause: jsonCompare.ts was using numeric indices for displayPath
   - ✅ Solution: Updated compareArraysWithIdKey function to generate proper ID-key paths

2. **JSON tree diff highlighting working**
   - ✅ Fixed: Path matching logic improved
   - ✅ Root cause: ID-key to numeric path conversion not working
   - ✅ Solution: Enhanced getNodeDiffStatus with proper path matching

### 🟡 NEEDS VERIFICATION
1. **Different diff types highlighted with different colors**
   - CSS classes exist (json-added, json-deleted, json-changed)
   - Need to verify visual differences are working

2. **"Go To" navigation in diff panel**
   - Path matching should now work with fixed displayPath
   - Need to test navigation functionality

3. **Three highlight types (parent, node, value)**
   - Logic exists for json-parent-changed class
   - Need to verify visual styling differences

### 🟢 WORKING
- Basic JSON loading and display
- File drag-and-drop
- Tree expansion/collapse
- Basic view switching

## Test Scenarios

### Test Case 1: Basic Diff Detection
1. Load two JSON files with differences
2. Verify diff panel shows ID-key based paths
3. Verify different diff types have different colors
4. Verify "Go To" navigation works

### Test Case 2: ID Key Navigation
1. Set an ID key for arrays
2. Verify diff panel uses ID-key format
3. Click on ID Keys panel items
4. Verify navigation to correct array elements

### Test Case 3: Large File Handling
1. Load large JSON files (>1MB)
2. Verify performance remains acceptable
3. Verify all features work with large datasets

## Regression Prevention

### Before Making Changes
1. **Document current working state**
2. **Test all core scenarios**
3. **Take screenshots of working features**
4. **Commit working state**

### Development Process
1. **Make incremental changes**
2. **Test after each change**
3. **Document what each change affects**
4. **Revert immediately if something breaks**

### Code Review Checklist
- [ ] Diff panel shows ID-key based paths
- [ ] Three diff types visually distinct
- [ ] "Go To" navigation works
- [ ] JSON tree highlighting works
- [ ] ID Keys panel navigation works
- [ ] File save uses real filenames
- [ ] Responsive design maintained
- [ ] No console errors
- [ ] Performance acceptable

## Architecture Notes

### Key Components
- `JsonTreeView.tsx`: Main tree rendering and diff highlighting
- `DiffList.tsx`: Diff panel display and navigation
- `JsonViewerSyncContext.tsx`: State management and synchronization
- `jsonCompare.ts`: Diff detection logic
- `IdKeysPanel.tsx`: ID key management and navigation

### Critical Path Dependencies
1. `jsonCompare.ts` generates diff results with numeric paths
2. `DiffList.tsx` must convert numeric to ID-key paths for display
3. `JsonTreeView.tsx` must match both numeric and ID-key paths for highlighting
4. Navigation must work bidirectionally between panels

## Recovery Plan

If features are broken:
1. **Identify last working commit** using `git log --oneline`
2. **Create feature branch** from working commit
3. **Apply fixes incrementally** with testing
4. **Merge back to main** only when all tests pass
