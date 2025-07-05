
✻ Thinking…

Now let me provide the complete effort estimate.


⏺ 🗂️ Files Affected (9 Total)

Core Files - Complete Rewrite (4 files)

1. src/utils/HighlightingProcessor.ts - REPLACE entirely
2. src/components/JsonTreeView.tsx - Modify highlighting logic (getNodeDiffStatus())
3. src/components/JsonViewerSyncContext.tsx - Update state management & context
4. src/components/JsonTreeView.css - Keep (CSS classes remain the same)

Integration Files - Modify (3 files)

5. src/App.tsx - Minor changes to pass context data
6. src/components/DiffList/DiffList.tsx - Update path handling
7. src/utils/index.ts - Update exports

Style Files - Keep As-Is (2 files)

8. src/components/JsonDiffViewer.css - No changes needed
9. src/components/JsonDiffViewer.tsx - No changes needed (legacy component)

🔧 Components & Methods to Rewrite


⏺ Update Todos

⎿  ☒ Analyze current highlighting system dependencies
☒ Review PathConverter.ts capabilities
☒ Estimate files affected by highlighting rewrite
☒ Identify components and methods to rewrite
☐ Assess complexity and timeline estimate



✻ Thinking…

Let me complete the final assessment.


⏺ 🚫 Remove/Replace Completely

- HighlightingProcessor.ts (215 lines) - Replace with PathConverter-based solution
    - buildHighlightingMaps() - Replace with PathConverter logic
    - extractParentPaths() - Use PathConverter path parsing
    - HighlightingInfo interface - Simplify data structure
    - All manual path normalization logic

🔄 Modify Heavily

- JsonTreeView.tsx::getNodeDiffStatus() (45 lines) - Rewrite using PathConverter
    - Replace normalizePathForComparison() calls
    - Use normalizePathForComparison() from PathConverter
    - Simplify path variation generation

📝 Minor Updates

- JsonViewerSyncContext.tsx - Update buildHighlightingMaps() call
- DiffList.tsx - Use PathConverter utilities for path handling
- App.tsx - Ensure proper context data passing

💡 New Architecture Benefits

Using PathConverter.ts Instead of Current System

✅ Advantages:
- Unified Path Handling: Single source of truth for path conversion
- Better ID Correlation: Native support for ID-based array matching
- Simplified Logic: Remove duplicate path normalization code
- Robust: Handle all edge cases in one place
- Performance: More efficient path matching

❌ Current System Issues:
- Duplicate Logic: Path normalization scattered across files
- Manual Correlation: Hand-coded ID/index matching
- Complex Data Structures: Over-engineered lookup maps
- Maintenance: Changes require updates in multiple places

⏱️ Effort & Complexity Estimate


⏺ Update Todos

⎿  ☒ Analyze current highlighting system dependencies
☒ Review PathConverter.ts capabilities
☒ Estimate files affected by highlighting rewrite
☒ Identify components and methods to rewrite
☒ Assess complexity and timeline estimate



✻ Thinking…

Now I'll provide the final timeline and complexity assessment.


⏺ 📊 Development Time Estimate

| Task                                          | Complexity | Time     | Lines of Code      |
  |-----------------------------------------------|------------|----------|--------------------|
| New PathConverter-based HighlightingProcessor | High       | 2-3 days | ~100-150 lines     |
| Rewrite JsonTreeView highlighting logic       | Medium     | 1-2 days | ~50 lines modified |
| Update JsonViewerSyncContext integration      | Low        | 0.5 days | ~20 lines modified |
| Update DiffList & App.tsx                     | Low        | 0.5 days | ~10 lines each     |
| Testing & Integration                         | Medium     | 1-2 days | Test suite updates |
| Documentation Updates                         | Low        | 0.5 days | Update docs        |

📅 Total Estimate: 5-8 Development Days

