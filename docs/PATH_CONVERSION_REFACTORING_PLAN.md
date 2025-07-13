# Path Conversion Refactoring Plan

## Overview
This document outlines the systematic refactoring plan to centralize all path conversion logic and eliminate manual string manipulation patterns throughout the codebase.

## Phase 1: ✅ COMPLETED - Foundation and Guidelines

### 1.1 Established Guidelines
- ✅ Created `PATH_CONVERSION_GUIDELINES.md` with comprehensive rules
- ✅ Added new utility functions to `PathConverter.ts`:
  - `extractViewerPrefix()` - Safe viewer prefix extraction
  - `removeViewerPrefix()` - Remove viewer prefixes
  - `addViewerPrefix()` - Add viewer prefixes
  - `matchesWildcardPattern()` - Pattern matching
  - `getExpansionPaths()` - Tree expansion paths
  - `getParentPath()` - Parent path extraction
  - `validateConversionRequirements()` - Context validation

### 1.2 Code Analysis Completed
- ✅ Identified manual string manipulation patterns
- ✅ Found type safety violations
- ✅ Catalogued functions that need replacement
- ✅ Prioritized refactoring targets

## Phase 2: High Priority Refactoring

### 2.1 JsonViewerSyncContext.tsx (CRITICAL)
**Issues to Fix:**
- Manual viewer prefix removal: `path.replace(/^root_(left|right)_/, '')`
- Complex wildcard pattern matching (lines 649-681)
- Manual path parsing for expansion (lines 473-490)
- Path truncation logic (line 325)

**Actions Required:**
1. Replace manual prefix operations with `removeViewerPrefix()`
2. Move wildcard pattern logic to `matchesWildcardPattern()`
3. Replace path parsing with `getExpansionPaths()`
4. Use `getParentPath()` for parent path calculations

### 2.2 IdKeysPanel.tsx (HIGH)
**Issues to Fix:**
- Manual root prefix removal: `originalPath.substring(5)`
- Manual array pattern conversion: `originalPath.replace(/\[[^\]]*\]/g, '[]')`

**Actions Required:**
1. Replace with `stripAllPrefixes()` or `removeViewerPrefix()`
2. Use `PathTypes.anyPathToArrayPattern()`

### 2.3 JsonPathBreadcrumb.tsx (MEDIUM)
**Issues to Fix:**
- Manual root prefix removal: `normalizedPath.substring(5)`
- Hardcoded path segment handling

**Actions Required:**
1. Use PathConverter utilities for prefix handling
2. Implement dynamic path segment generation

## Phase 3: Type Safety Improvements

### 3.1 Function Signature Updates
**Target Files:**
- `JsonPathBreadcrumb.tsx`: `onSegmentClick: (path: string)` → `(path: AnyPath)`
- `jsonCompare.ts`: `getValueByPath(obj: JSONObject, path: string)` → `(path: NumericPath)`
- Various components using generic strings

**Actions Required:**
1. Update function signatures to use branded path types
2. Add runtime validation using PathTypes validation functions
3. Update all call sites to use proper type constructors

### 3.2 Context Validation
**Target Pattern:**
- Functions doing ID-based conversions without context
- Missing null checks for conversion results

**Actions Required:**
1. Add `validateConversionRequirements()` calls
2. Implement proper error handling for null results
3. Add context requirements to function documentation

## Phase 4: Utility Function Migration

### 4.1 Move Complex Logic to PathConverter
**Candidates for Migration:**
1. **Wildcard Pattern Matching** (JsonViewerSyncContext.tsx:649-681)
   - Move to `matchesWildcardPattern()` ✅ DONE
   
2. **Path Expansion Logic** (JsonViewerSyncContext.tsx:473-490)
   - Move to `getExpansionPaths()` ✅ DONE
   
3. **Parent Path Calculation** (Various files)
   - Use `getParentPath()` ✅ DONE

### 4.2 Eliminate Duplicate Logic
**Target Areas:**
- Multiple implementations of viewer prefix handling
- Repeated path parsing patterns
- Duplicate path normalization code

## Phase 5: Testing and Validation

### 5.1 Unit Tests
**Requirements:**
- ✅ All existing tests must continue passing
- Add tests for new PathConverter utilities
- Test edge cases for conversion functions

### 5.2 Integration Tests
**Requirements:**
- ✅ E2E tests must pass after refactoring
- Verify ID Keys panel functionality
- Test path correlation across viewers

### 5.3 Type Coverage
**Requirements:**
- No generic `string` types for path parameters
- All path conversions use branded types
- Runtime validation for external path inputs

## Implementation Checklist

### Immediate Actions (Next Session)
- [ ] Refactor JsonViewerSyncContext.tsx viewer prefix handling
- [ ] Replace manual pattern matching with `matchesWildcardPattern()`
- [ ] Update IdKeysPanel.tsx to use PathConverter utilities
- [ ] Add type safety to JsonPathBreadcrumb.tsx

### Medium Term Actions
- [ ] Update all function signatures to use branded types
- [ ] Add comprehensive error handling for path conversions
- [ ] Create tests for new PathConverter utilities
- [ ] Document conversion requirements for each function

### Validation Actions
- [ ] Run full test suite after each major change
- [ ] Verify E2E tests continue passing
- [ ] Check that path correlation functionality works correctly
- [ ] Validate type safety improvements with TypeScript compiler

## Success Criteria

### Functionality
- ✅ All existing functionality preserved
- ✅ Path correlation works correctly
- ✅ Tree expansion/navigation unchanged
- ✅ No regression in user experience

### Code Quality
- [ ] No manual string manipulation for paths
- [ ] All path operations use PathConverter utilities
- [ ] Strict typing with branded path types
- [ ] Centralized logic with no duplication

### Maintainability
- [ ] Clear guidelines for future path operations
- [ ] Consistent patterns across codebase
- [ ] Easy to extend with new path types
- [ ] Comprehensive documentation

## Risk Mitigation

### Testing Strategy
- Run tests after each file refactoring
- Maintain git branches for rollback capability
- Incremental changes with verification steps

### Type Safety
- Use runtime validation for external inputs
- Gradual migration to avoid breaking changes
- Comprehensive error handling for edge cases

---

**Note**: This plan should be executed incrementally with thorough testing at each stage. The foundation has been established, and the next phase involves systematic refactoring of the identified files.