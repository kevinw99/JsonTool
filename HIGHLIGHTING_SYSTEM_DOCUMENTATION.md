# JSON Tool Highlighting System - Comprehensive Documentation

## Overview

The JSON Tool implements a sophisticated multi-layered highlighting system that visually indicates differences between JSON documents. The system operates on multiple levels and uses different highlighting techniques to show various types of changes.

## Highlighting Types

### 1. **Direct Diff Highlighting** (Primary Changes)
These are the core diff types that represent actual changes detected by the comparison engine:

#### **`json-added`** - Added Properties/Values
- **Purpose**: Highlights properties or array elements that exist in the new JSON but not in the original
- **Visual**: Green background (`#90ee90` - stronger green, `#66dd66` in light mode)
- **Location**: `src/components/JsonTreeView.css:126-133`
- **Logic**: Applied when `diffType === 'added'` and `jsonSide === 'right'`
- **CSS Class**: `.json-node.json-added > .json-node-content`

#### **`json-deleted`** - Removed Properties/Values  
- **Purpose**: Highlights properties or array elements that exist in the original JSON but not in the new
- **Visual**: Red background (`#ffb3ba` - stronger red, `#ff6666` in light mode)
- **Location**: `src/components/JsonTreeView.css:135-142`
- **Logic**: Applied when `diffType === 'removed'` and `jsonSide === 'left'`
- **CSS Class**: `.json-node.json-deleted > .json-node-content`

#### **`json-changed`** - Modified Values
- **Purpose**: Highlights properties where the value has changed between versions
- **Visual**: Yellow background (`#ffeb99` - stronger yellow, `#ffdd44` in light mode)
- **Location**: `src/components/JsonTreeView.css:145-152`
- **Logic**: Applied when `diffType === 'changed'` (shows on both sides)
- **CSS Class**: `.json-node.json-changed > .json-node-content`

### 2. **Parent Container Highlighting** (Structural Context)

#### **`json-parent-changed`** - Parent of Changed Elements
- **Purpose**: Highlights container objects/arrays that contain changed elements
- **Visual**: Light blue background (`#b3d9ff` - stronger blue, `#6bb6ff` in light mode)
- **Location**: `src/components/JsonTreeView.css:116-123`
- **Logic**: Applied to parent paths that contain any child changes
- **CSS Class**: `.json-node.json-parent-changed > .json-node-content`

**Parent Detection Algorithm** (`src/utils/HighlightingProcessor.ts:126-158`):
1. For each diff, extract all parent paths using `extractParentPaths()`
2. Store parent paths in `parentContainers` Set for O(1) lookup
3. Build `childToParentMap` for relationship tracking
4. During rendering, check if current path exists in `parentContainers`

### 3. **Navigation & UI Highlighting** (Interactive Elements)

#### **`highlighted-node`** - Current Navigation Target
- **Purpose**: Temporarily highlights the currently navigated-to element
- **Visual**: Applied via JavaScript, works with expansion/scrolling logic
- **Location**: `src/components/JsonTreeView.tsx:500`
- **Logic**: Applied when `isHighlighted` is true (from context `highlightPath`)

#### **`persistent-highlight`** - Persistent Navigation Border
- **Purpose**: Provides persistent border highlighting that remains until next navigation
- **Visual**: Blue border (`#007acc`, 2px solid with border-radius)
- **Location**: `src/components/JsonTreeView.css:203-208`
- **Logic**: Applied when `isPersistentlyHighlighted` is true (from context `persistentHighlightPath`)

#### **`json-flash`** - Flash Animation
- **Purpose**: Animated flash effect for drawing attention to elements
- **Visual**: Pulsing yellow animation with scale and shadow effects
- **Location**: `src/components/JsonTreeView.css:155-200`
- **Duration**: 1 second animation with easing

#### **`json-sync-feedback`** - Sync Operation Visual
- **Purpose**: Shows visual feedback during sync operations between viewers
- **Visual**: Sliding blue gradient animation
- **Location**: `src/components/JsonTreeView.css:306-339`
- **Animation**: 1.5 second sliding gradient effect

## Architecture & Implementation

### Core Components

#### **HighlightingProcessor** (`src/utils/HighlightingProcessor.ts`)
**Purpose**: Preprocesses diff results into efficient lookup structures

**Key Functions**:
- `buildHighlightingMaps()` - Converts diff results into O(1) lookup maps
- `extractParentPaths()` - Extracts all parent paths from a given path
- `getDiffHighlightingClass()` - Maps diff types to CSS classes
- `normalizePath()` - Handles path normalization (removes "root." prefix)

**Data Structures**:
```typescript
interface HighlightingInfo {
  exactDiffs: Map<string, DiffResult>;           // numericPath -> diff
  displayPathToDiff: Map<string, DiffResult>;    // displayPath -> diff
  parentContainers: Set<string>;                 // all parent paths with changes
  childToParentMap: Map<string, string[]>;       // childPath -> [parentPaths]
  displayToNumericMap: Map<string, string>;      // path correlations
  numericToDisplayMap: Map<string, string>;      
  addedPaths: Set<string>;                        // categorized diffs
  removedPaths: Set<string>;  
  changedPaths: Set<string>;
}
```

#### **JsonTreeView** (`src/components/JsonTreeView.tsx`)
**Purpose**: Applies highlighting logic during rendering

**Key Function**: `getNodeDiffStatus()` (lines 270-316)
1. **Exact Match Check**: Uses `highlightingInfo.exactDiffs` for O(1) lookup
2. **Display Path Check**: Uses `highlightingInfo.displayPathToDiff` for ID-based correlation
3. **Parent Check**: Uses `highlightingInfo.parentContainers` for parent highlighting
4. **Path Normalization**: Uses `PathConverter` for comprehensive path matching

#### **JsonViewerSyncContext** (`src/components/JsonViewerSyncContext.tsx`)
**Purpose**: Manages highlighting state and navigation

**Key State**:
- `highlightPath` - Current navigation target
- `persistentHighlightPath` - Persistent border highlighting
- `highlightingInfo` - Preprocessed highlighting maps
- `ignoredDiffs` - Set of ignored diff paths

### CSS Architecture

#### **Base Structure** (`src/components/JsonTreeView.css`)
- **Hardware Acceleration**: Uses `transform: translateZ(0)` and `will-change: background-color`
- **Background Rendering**: Uses `isolation: isolate` for proper layer creation
- **Cross-browser**: Separate rules for Safari/Chrome background rendering issues
- **Responsive**: Media queries for mobile optimization
- **Dark Mode**: Separate color schemes for light/dark preferences

#### **Color System**
- **Light Mode**: Stronger, more visible colors (`#90ee90`, `#ffb3ba`, `#ffeb99`, `#b3d9ff`)
- **Dark Mode**: Darker variants for contrast (`#1a4d1a`, `#4d1a1a`, `#4d4d1a`, `#1a4480`)
- **Accessibility**: High contrast ratios for readability

### Performance Optimizations

#### **O(1) Lookups**
- Pre-builds all lookup maps during initialization
- Avoids O(n) linear searches during rendering
- Uses `Map` and `Set` data structures for efficiency

#### **Path Normalization**
- Handles multiple path formats (numeric, display, ID-based)
- Caches normalization results
- Supports array index correlation

#### **Lazy Processing**
- Only processes highlighting when diff results change
- Memoizes expensive computations
- Debounces UI updates

## Usage Patterns

### **Adding New Highlighting Types**
1. **Define CSS Class**: Add new class in `JsonTreeView.css`
2. **Update Logic**: Modify `getNodeDiffStatus()` in `JsonTreeView.tsx`
3. **Extend Data Structure**: Add new fields to `HighlightingInfo` if needed
4. **Update Processor**: Modify `buildHighlightingMaps()` for new logic

### **Debugging Highlighting Issues**
1. **Use Debug Functions**: Call `debugHighlightingInfo()` and `debugNodeInfo()`
2. **Check Path Variations**: Verify path normalization works correctly
3. **Inspect Maps**: Check if paths exist in lookup maps
4. **CSS Debugging**: Use `window.debugCSSHighlighting()` function

### **Performance Monitoring**
- Monitor `highlightingInfo` map sizes in console
- Check for excessive re-renders during highlighting
- Profile path normalization performance for large datasets

## Edge Cases & Considerations

### **Path Correlation**
- **ID-based Arrays**: Handles both numeric and ID-based array paths
- **Nested Arrays**: Supports complex nested array structures
- **Root Path Handling**: Properly handles "root." prefix variations

### **Side-Specific Rendering**
- **Added Items**: Only show green on right side
- **Removed Items**: Only show red on left side  
- **Changed Items**: Show yellow on both sides
- **Parent Highlighting**: Shows blue on both sides

### **Browser Compatibility**
- **Safari Background Issues**: Uses `isolation: isolate` for proper rendering
- **Chrome Compositing**: Uses hardware acceleration hints
- **Mobile Responsive**: Optimized layouts for small screens

### **State Management**
- **Persistent vs Temporary**: Distinguishes between navigation and diff highlighting
- **Sync Operations**: Temporarily disables highlighting during sync alignment
- **Ignored Diffs**: Excludes ignored paths from highlighting calculations

## Future Enhancements

### **Potential Improvements**
1. **Custom Color Themes**: User-configurable color schemes
2. **Highlighting Intensity**: Adjustable opacity/intensity levels
3. **Animation Controls**: Configurable animation speeds/types
4. **Accessibility**: Screen reader support for highlighting information
5. **Performance**: Virtual scrolling for large JSON documents

### **Known Limitations**
1. **Deep Nesting**: Performance may degrade with very deep object hierarchies
2. **Large Arrays**: Memory usage grows with array size for ID correlation
3. **Path Complexity**: Complex array path correlation may need optimization
4. **CSS Conflicts**: May conflict with user-defined CSS in embedded scenarios

This documentation provides a comprehensive overview of the highlighting system architecture, implementation details, and usage patterns for developers working with the JSON Tool.