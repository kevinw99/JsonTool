# Path Conversion Guidelines

## Overview
This document establishes strict guidelines for path conversions in the JsonTool codebase to ensure consistency, type safety, and maintainability.

## Core Principles

### 1. Centralized Path Conversion
**All path conversions MUST use functions from `src/utils/PathConverter.ts`**

❌ **DO NOT** create ad-hoc path conversion logic scattered throughout components
✅ **DO** use the standardized PathConverter utility functions

### 2. Strict Type Safety
**All path conversion functions MUST use strict branded types - NO generic strings**

❌ **FORBIDDEN:**
```typescript
function convertPath(path: string): string
function processPath(path: any): any
```

✅ **REQUIRED:**
```typescript
function convertIdPathToIndexPath(idPath: IdBasedPath, context: PathConversionContext): NumericPath | null
function convertIdPathToViewerPath(idPath: IdBasedPath, context: PathConversionContext, viewerId: ViewerId): ViewerPath | null
```

### 3. Context Requirements
**Path conversions that require data lookup MUST include proper context**

❌ **INVALID:** Converting ID paths to index paths without context
✅ **VALID:** Converting ID paths to index paths with PathConversionContext

### 4. Null Handling
**All conversion functions MUST handle failure cases and return null when conversion is impossible**

## Standard Path Types

```typescript
// Core path types (from PathTypes.ts)
type NumericPath = string & { __brand: 'NumericPath' };           // "root.accounts[0].name"
type IdBasedPath = string & { __brand: 'IdBasedPath' };           // "root.accounts[id=123].name"
type ArrayPatternPath = string & { __brand: 'ArrayPatternPath' }; // "accounts[].transactions[]"
type ViewerPath = string & { __brand: 'ViewerPath' };             // "left_root.accounts[0].name"

// Context for conversions requiring data lookup
interface PathConversionContext {
  jsonData?: any;
  idKeysUsed?: IdKeyInfo[];
}
```

## Approved Conversion Functions

### Valid Conversions (with context)
- `convertIdPathToIndexPath(idPath: IdBasedPath, context: PathConversionContext): NumericPath | null`
- `convertIdPathToViewerPath(idPath: IdBasedPath, context: PathConversionContext, viewerId: ViewerId): ViewerPath | null`
- `convertIndexPathToIdPath(indexPath: NumericPath, context: PathConversionContext): IdBasedPath | null`
- `viewerPathToIdBasedPath(viewerPath: string, jsonData: {left: any, right: any}, idKeysUsed: IdKeyInfo[]): string | null`

### Valid Conversions (without context)
- `stripAllPrefixes(path: AnyPath): AnyPath`
- `arePathsEquivalent(path1: AnyPath, path2: AnyPath, context?: PathConversionContext): boolean`
- `convertArrayPatternToNumericPath(arrayPattern: ArrayPatternPath, context: PathConversionContext): NumericPath`

### Specialized Correlation Functions
- `getPathVariationsForHighlighting(path: AnyPath, context?: PathConversionContext): AnyPath[]`
- `convertPathForSameViewer(path: AnyPath, context: PathConversionContext, targetFormat: 'id' | 'index'): AnyPath | null`
- `convertPathForCrossViewerSync(path: AnyPath, context: PathConversionContext, fromViewer: string, toViewer: string, targetFormat: 'id' | 'index'): AnyPath | null`

## Common Anti-Patterns to Avoid

### ❌ Manual String Manipulation
```typescript
// DON'T DO THIS
const leftPath = path.replace('right_', 'left_');
const indexPath = idPath.replace(/\[id=([^\]]+)\]/, '[0]');
```

### ❌ Component-Level Path Logic
```typescript
// DON'T DO THIS - conversion logic in components
const MyComponent = () => {
  const convertPath = (path: string) => {
    // Custom conversion logic here
  };
};
```

### ❌ Unsafe Type Conversions
```typescript
// DON'T DO THIS
const numericPath = idPath as NumericPath; // Unsafe cast
const viewerPath = path as ViewerPath;     // No validation
```

## Required Patterns

### ✅ Proper Context Usage
```typescript
const leftContext: PathConversionContext = {
  jsonData: jsonData.left,
  idKeysUsed: idKeysUsed || []
};

const leftViewerPath = convertIdPathToViewerPath(
  validateAndCreateIdBasedPath(targetPath, 'ComponentName.handlerName'),
  leftContext,
  'left'
);
```

### ✅ Null Checking
```typescript
const numericPath = convertIdPathToIndexPath(idPath, context);
if (!numericPath) {
  console.error('Failed to convert ID path to numeric path');
  return;
}
```

### ✅ Type Validation
```typescript
const idPath = validateAndCreateIdBasedPath(pathString, 'source.context');
const viewerPath = validateViewerPath(pathString, 'source.context');
```

## Implementation Checklist

Before implementing any path conversion:

- [ ] Check if required conversion function exists in PathConverter.ts
- [ ] Ensure proper context is available for data-dependent conversions
- [ ] Use strict branded types for all inputs and outputs
- [ ] Handle null return values appropriately
- [ ] Add validation for path strings from external sources
- [ ] Include source context in validation calls for debugging

## Code Review Requirements

When reviewing code that involves path conversions:

1. **Verify centralization**: All conversions use PathConverter functions
2. **Check type safety**: No generic strings or `any` types
3. **Validate context**: Data-dependent conversions have proper context
4. **Confirm null handling**: Failure cases are properly managed
5. **Test coverage**: Conversion logic has appropriate tests

## Migration Strategy

When refactoring existing code:

1. **Identify**: Find manual path conversion logic
2. **Extract**: Move logic to PathConverter.ts if not already present
3. **Standardize**: Apply strict typing and proper context
4. **Replace**: Update all call sites to use centralized functions
5. **Test**: Ensure functionality remains intact
6. **Remove**: Delete obsolete conversion code

## Examples of Functions That Should Be Replaced

### Candidates for Replacement
- `resolvePath()` functions that manually parse paths
- String manipulation for viewer prefix changes
- Manual array index to ID conversions
- Custom path normalization logic
- Ad-hoc path correlation implementations

### Replacement Strategy
1. Analyze existing function behavior
2. Map to appropriate PathConverter function
3. Ensure context requirements are met
4. Update all call sites
5. Remove obsolete function
6. Add tests for new implementation

---

**Note**: This document should be updated whenever new conversion patterns are established or existing ones are modified. All team members should review this before working on path-related functionality.