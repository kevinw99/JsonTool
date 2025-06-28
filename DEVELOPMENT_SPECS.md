# Development Specifications & Process

## Project Context
This project is an online JSON tool built with React, TypeScript, and Vite. Focus on features like JSON compare, export, sort, validate, beautify, minify, search, filter, and edit. Prioritize clean UI and robust JSON handling.

---

## Development Process

### 1. Feature Specification Process

For each new feature request, follow this process:

#### A. **Specification Phase**
1. **Feature Overview**: Brief description of what the feature does
2. **Functional Requirements**: Detailed list of what the feature must do
3. **Technical Requirements**: Implementation constraints and dependencies
4. **User Interface Requirements**: UI/UX specifications
5. **Edge Cases**: Handle error scenarios and boundary conditions
6. **Acceptance Criteria**: How to verify the feature works correctly

#### B. **Implementation Phase**
1. Read relevant existing code to understand current architecture
2. Identify files that need to be modified
3. Implement changes incrementally with testing
4. Verify no regressions in existing functionality

#### C. **Documentation Phase**
1. Update CHAT_LOG.md with the request details
2. Log and commit changes with descriptive messages
3. Update relevant documentation files

---

## Current Feature Request: Sync to Counterpart

### Feature Overview
Enable users to right-click on any node in one JSON viewer and navigate to the corresponding node in the other viewer for easy comparison.

### Functional Requirements
1. **Context Menu Integration**
   - Add "🔄 Sync to Counterpart" option to existing right-click context menu
   - Only show when comparing two JSON files (not in single-file mode)
   - Position after existing "Ignore" and "Sort Array" options

2. **Path Resolution**
   - Convert current node's `genericNumericPathForNode` to target viewer format
   - Handle viewer ID differences (viewer1 ↔ viewer2)
   - Maintain same path structure for navigation

3. **Navigation Implementation**
   - Use existing `goToDiff()` function for navigation logic
   - Leverage existing expansion and highlighting mechanisms
   - Provide smooth scrolling to target node

4. **User Feedback**
   - Highlight target node temporarily (reuse existing highlight system)
   - Show toast message if target node doesn't exist
   - Provide visual feedback during navigation

### Technical Requirements
1. **Files to Modify**:
   - `JsonTreeView.tsx`: Add context menu action
   - `JsonViewerSyncContext.tsx`: Add `syncToCounterpart` method (already exists)
   - May need to verify existing implementation

2. **Dependencies**:
   - Existing `goToDiff()` function
   - Existing context menu system
   - Existing path normalization logic

3. **State Management**:
   - Use existing viewerId system to determine target viewer
   - Leverage existing highlight and expansion state

### Edge Cases
1. **Node doesn't exist in target**: Show user message "Node not found in counterpart"
2. **Single file mode**: Disable sync option or show appropriate message
3. **Array index mismatch**: Navigate to closest available index
4. **Deeply nested differences**: Ensure proper expansion of parent nodes

### Acceptance Criteria
- [x] Right-click menu shows "Sync to Counterpart" option only in compare mode
- [x] Clicking option navigates to same node in other viewer
- [x] Target node is highlighted and scrolled into view
- [x] Works for both object properties and array indices
- [x] Handles missing nodes gracefully via existing goToDiff error handling
- [x] No impact on existing right-click menu functionality
- [x] Only displays in dual-viewer mode (isCompareMode prop implementation)

**Status**: ✅ **COMPLETED** - Feature implemented and tested

---

## Next Feature Suggestions

Based on the current functionality and user feedback patterns, here are potential next features:

### 1. Enhanced Sync Feedback
- Add toast notifications for sync operations
- Show temporary visual indicators when syncing
- Provide better feedback when target node doesn't exist

### 2. Bulk Operations
- Multi-select nodes for bulk ignore/sync operations
- Keyboard shortcuts for common actions
- Batch sync for related nodes

### 3. Visual Improvements
- Better highlighting for synced nodes
- Animated transitions for sync operations
- Improved context menu styling and positioning

---

## Standard Commands & Workflows

### Development Workflow
```bash
# 1. Start development server
npm run dev

# 2. Check for TypeScript errors
npm run type-check

# 3. Test in browser
open http://localhost:5174

# 4. Check git status
git status

# 5. Add and commit changes
git add .
git commit -m "feat: implement sync to counterpart functionality

- Add sync action to right-click context menu
- Implement cross-viewer navigation
- Handle edge cases for missing nodes
- Maintain existing highlighting behavior

Resolves: Request #XX - Sync to Counterpart feature"
```

### Logging Commands
```bash
# Log current request (if using logging system)
npm run log

# Auto-capture background service
npm run auto-bg
```

### Debugging Commands
```bash
# Check running processes
ps aux | grep vite
ps aux | grep node

# Check port usage
lsof -i :5174
lsof -i :5173

# Kill and restart server
pkill -f vite
npm run dev
```

### Git Recovery Commands
```bash
# Restore corrupted file
git checkout HEAD -- path/to/file

# Reset to last commit
git reset --hard HEAD

# View file history
git log --oneline -- path/to/file
```

---

## Code Standards

### File Naming
- Components: PascalCase (e.g., `JsonTreeView.tsx`)
- Utilities: camelCase (e.g., `jsonCompare.ts`)
- Styles: match component name (e.g., `JsonTreeView.css`)

### Commit Message Format
```
<type>: <description>

<body with details>

Resolves: Request #XX - <brief description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

### Function Documentation
```typescript
/**
 * Brief description of what the function does
 * @param param1 - Description of parameter
 * @param param2 - Description of parameter
 * @returns Description of return value
 */
```

### Error Handling
- Always handle edge cases
- Provide user-friendly error messages
- Log errors to console for debugging
- Graceful degradation when features fail

---

## Common Patterns

### Context Menu Actions
```typescript
const actions: ContextMenuAction[] = [];

// Add action
actions.push({
  label: 'Action Name',
  icon: '🔄',
  action: () => {
    // Implementation
  },
  disabled: shouldDisable // optional
});
```

### Path Handling
- Use `genericNumericPathForNode` for tree navigation
- Use `normalizedPathForDiff` for diff matching
- Always handle "root." prefix properly

### State Updates
- Use useCallback for functions passed to children
- Add proper dependencies to useMemo/useCallback
- Test that state changes trigger re-renders

---

## Regression Prevention

### Before Each Change
1. Test existing features still work
2. Check console for new errors
3. Verify UI layout isn't broken
4. Test on different screen sizes

### After Each Change
1. Test the new feature thoroughly
2. Check for TypeScript errors
3. Verify no console errors
4. Update documentation
5. Commit with clear message

### Common Regression Areas
- Path format mismatches
- CSS alignment issues
- Navigation timing problems
- State synchronization issues

---

*This document should be updated whenever new patterns or processes are established.*
