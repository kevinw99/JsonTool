# JSON Tool V2 - User-Driven Feature List & Development Roadmap

*Generated on: June 18, 2025*  
*Optimized for productive development workflow*  
*Includes regression test specifications*

---

## 🎯 **USER-REQUESTED FEATURES** *(Extracted from Chat History)*

### **High Priority UI/UX Improvements**
- [ ] 🔥 **Perfect array/object node alignment** - consistent indentation at all levels
- [ ] 🔥 **Compact, non-redundant header** - maximize screen real estate
- [ ] 🔥 **Drag-and-drop file loading** - with visual feedback and error handling
- [ ] 🔥 **Consistent JSON tree indentation** - no cumulative spacing issues
- [ ] 🔥 **Non-intrusive diff markers** - clear but not overwhelming
- [ ] 🔥 **Structured, enumerated responses** - clear communication format

### **Synchronization & Navigation**
- [ ] 📡 **Synchronized expand/collapse** - same nodes in both viewers
- [ ] 📡 **Synchronized tree/text mode toggle** - both viewers switch together
- [ ] 📡 **Synchronized scrolling** - default enabled with toggle
- [ ] 📡 **Synchronized "show differences only"** - filter both sides
- [ ] 🎯 **"Go To" diff navigation** - instant jump to specific differences
- [ ] 🎯 **Visual highlighting on navigation** - flash animation for found items

### **Default Settings & Behavior**
- [ ] ⚙️ **Default tree fully collapsed** - better overview on load
- [ ] ⚙️ **Show colored diff view default** - immediate visual feedback
- [ ] ⚙️ **Grouped toggle controls** - all options in one accessible area
- [ ] ⚙️ **Compact expand/collapse controls** - better space utilization

### **Advanced Functionality**
- [ ] 🔍 **Search and filter within JSON** - find specific keys/values
- [ ] 📊 **JSON sort by keys** - organize for better comparison
- [ ] ✅ **JSON validation** - syntax and structure checking
- [ ] 🎨 **JSON beautify/minify** - format optimization
- [ ] 📝 **Edit JSON inline** - make changes within the tool

---

## 🚀 **OPTIMIZED DEVELOPMENT ORDER** *(Most Productive Workflow)*

### **PHASE 1: Foundation & Core Alignment** 🏗️
*Focus: Get indentation perfect before building features*

1. **Project Setup & Base Architecture**
   - Vite + React + TypeScript + Tailwind CSS
   - Component structure and TypeScript types
   - Testing framework (Vitest + Testing Library)

2. **JsonNode Component** ⭐ *CRITICAL*
   - Pixel-perfect indentation system
   - Expander positioning and sizing
   - Key/value/bracket alignment
   - **REGRESSION TEST**: Array/object alignment

3. **JsonTree Container**
   - Tree rendering with proper nesting
   - Expand/collapse state management
   - Default collapsed state
   - **REGRESSION TEST**: Multi-level indentation consistency

4. **Basic JSON Loading**
   - File upload and drag-drop
   - JSON parsing and validation
   - Error handling and feedback

### **PHASE 2: Visual Diff System** 🎨
*Focus: Core comparison functionality*

5. **Diff Algorithm Implementation**
   - Deep object comparison
   - Array matching with ID detection
   - Path generation for navigation

6. **Diff Visualization**
   - Color-coded highlighting (add/remove/change)
   - Non-intrusive diff markers
   - Side-by-side comparison layout

7. **JsonViewer Component**
   - Dual-pane layout with resizable divider
   - Synchronized state management
   - **REGRESSION TEST**: Diff marker positioning

### **PHASE 3: Navigation & Synchronization** 🔄
*Focus: User interaction and sync features*

8. **Synchronization Engine**
   - Expand/collapse sync
   - Scroll synchronization
   - Mode toggle sync (tree/text)

9. **Diff Navigation**
   - "Go To" functionality
   - Visual highlighting on navigation
   - Smooth scrolling to target

10. **Diff Management Panel**
    - Interactive diff list
    - Ignore/restore functionality
    - Search and filter diffs

### **PHASE 4: Polish & Advanced Features** ✨
*Focus: User experience and productivity*

11. **Enhanced UI Controls**
    - Grouped toggle controls
    - Compact header design
    - Responsive layout improvements

12. **Search & Filter**
    - JSON content search
    - Filter by key/value patterns
    - Highlight search results

13. **JSON Manipulation**
    - Sort by keys
    - Beautify/minify
    - Basic inline editing

14. **Export & Sharing**
    - Export diff reports
    - Save/load sessions
    - Share links with state

---

## 🧪 **COMPREHENSIVE REGRESSION TEST SUITE**

### **Test Category 1: Alignment & Indentation** ⭐ *CRITICAL*

```typescript
describe('JsonNode Alignment', () => {
  describe('Array/Object Indentation', () => {
    it('should maintain consistent pixel-based indentation across all levels', () => {
      const deeplyNested = {
        level1: {
          level2: {
            level3: {
              level4: ['item1', 'item2', { level5: 'value' }]
            }
          }
        }
      };
      
      render(<JsonTree data={deeplyNested} />);
      
      // Test: Each level should be exactly 20px more indented than parent
      const level1Node = screen.getByTestId('node-level-1');
      const level2Node = screen.getByTestId('node-level-2');
      const level3Node = screen.getByTestId('node-level-3');
      const level4Node = screen.getByTestId('node-level-4');
      
      expect(getComputedStyle(level1Node).paddingLeft).toBe('20px');
      expect(getComputedStyle(level2Node).paddingLeft).toBe('40px');
      expect(getComputedStyle(level3Node).paddingLeft).toBe('60px');
      expect(getComputedStyle(level4Node).paddingLeft).toBe('80px');
    });

    it('should align array opening/closing brackets at same level', () => {
      const testArray = ['item1', ['nested1', 'nested2'], 'item3'];
      
      render(<JsonTree data={testArray} />);
      
      const openingBracket = screen.getByText('[');
      const closingBracket = screen.getByText(']');
      
      expect(openingBracket.getBoundingClientRect().left)
        .toBe(closingBracket.getBoundingClientRect().left);
    });

    it('should align object opening/closing braces at same level', () => {
      const testObject = { key1: 'value1', nested: { key2: 'value2' } };
      
      render(<JsonTree data={testObject} />);
      
      const openingBrace = screen.getByText('{');
      const closingBrace = screen.getByText('}');
      
      expect(openingBrace.getBoundingClientRect().left)
        .toBe(closingBrace.getBoundingClientRect().left);
    });
  });

  describe('Expander Positioning', () => {
    it('should position expanders consistently regardless of nesting level', () => {
      const multiLevel = {
        level1: { level2: { level3: 'value' } },
        array: [{ nested: 'item' }]
      };
      
      render(<JsonTree data={multiLevel} />);
      
      const expanders = screen.getAllByRole('button', { name: /expand|collapse/i });
      
      // All expanders should be at same relative position within their indentation
      expanders.forEach((expander, index) => {
        const parentNode = expander.closest('[data-testid^="node-level-"]');
        const nodeLevel = parseInt(parentNode.dataset.testid.match(/level-(\d+)/)[1]);
        const expectedLeft = nodeLevel * 20 + 8; // 20px per level + 8px offset
        
        expect(expander.getBoundingClientRect().left - parentNode.getBoundingClientRect().left)
          .toBe(expectedLeft);
      });
    });
  });
});
```

### **Test Category 2: Diff Visualization** 🎨

```typescript
describe('Diff Highlighting', () => {
  it('should highlight differences without affecting alignment', () => {
    const json1 = { unchanged: 'value', changed: 'old', removed: 'gone' };
    const json2 = { unchanged: 'value', changed: 'new', added: 'here' };
    
    render(<JsonDiffViewer json1={json1} json2={json2} />);
    
    // Test: Diff highlighting should not change indentation
    const unchangedNode1 = screen.getByTestId('json1-node-unchanged');
    const unchangedNode2 = screen.getByTestId('json2-node-unchanged');
    const changedNode1 = screen.getByTestId('json1-node-changed');
    const changedNode2 = screen.getByTestId('json2-node-changed');
    
    expect(unchangedNode1.getBoundingClientRect().left)
      .toBe(changedNode1.getBoundingClientRect().left);
    expect(unchangedNode2.getBoundingClientRect().left)
      .toBe(changedNode2.getBoundingClientRect().left);
  });

  it('should show diff markers in consistent positions', () => {
    const json1 = { key: 'old' };
    const json2 = { key: 'new' };
    
    render(<JsonDiffViewer json1={json1} json2={json2} />);
    
    const diffMarkers = screen.getAllByTestId('diff-marker');
    
    diffMarkers.forEach(marker => {
      const parentNode = marker.closest('[data-testid^="node-"]');
      // Diff markers should always be at left edge of indentation
      expect(marker.getBoundingClientRect().left - parentNode.getBoundingClientRect().left)
        .toBe(4); // 4px from left edge
    });
  });
});
```

### **Test Category 3: Synchronization** 🔄

```typescript
describe('Viewer Synchronization', () => {
  it('should expand/collapse same nodes in both viewers', async () => {
    const testData = { 
      parent: { 
        child1: 'value1', 
        child2: { grandchild: 'value2' } 
      } 
    };
    
    render(<SyncedJsonViewers json1={testData} json2={testData} />);
    
    const viewer1Expander = screen.getByTestId('viewer1-node-parent-expander');
    const viewer2Node = screen.getByTestId('viewer2-node-parent');
    
    await userEvent.click(viewer1Expander);
    
    // Both viewers should show expanded state
    expect(viewer2Node).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByTestId('viewer1-node-parent-child1')).toBeVisible();
    expect(screen.getByTestId('viewer2-node-parent-child1')).toBeVisible();
  });

  it('should maintain scroll synchronization', async () => {
    // Large JSON data for scrolling
    const largeData = Array.from({ length: 100 }, (_, i) => ({ [`item${i}`]: `value${i}` }));
    
    render(<SyncedJsonViewers json1={largeData} json2={largeData} />);
    
    const viewer1 = screen.getByTestId('json-viewer-1');
    const viewer2 = screen.getByTestId('json-viewer-2');
    
    fireEvent.scroll(viewer1, { target: { scrollTop: 500 } });
    
    await waitFor(() => {
      expect(viewer2.scrollTop).toBe(500);
    });
  });
});
```

### **Test Category 4: Navigation & Performance** ⚡

```typescript
describe('Diff Navigation', () => {
  it('should navigate to specific diff location with visual feedback', async () => {
    const json1 = { section1: { item: 'old' }, section2: { item: 'unchanged' } };
    const json2 = { section1: { item: 'new' }, section2: { item: 'unchanged' } };
    
    render(<JsonComparisonTool json1={json1} json2={json2} />);
    
    const gotoButton = screen.getByTestId('diff-goto-section1.item');
    await userEvent.click(gotoButton);
    
    // Should highlight the target node
    const targetNode = screen.getByTestId('node-section1.item');
    expect(targetNode).toHaveClass('highlighted-node');
    
    // Should scroll to target
    expect(targetNode.getBoundingClientRect().top).toBeGreaterThan(0);
    expect(targetNode.getBoundingClientRect().top).toBeLessThan(window.innerHeight);
  });

  it('should handle large JSON files without performance degradation', async () => {
    const largeJson = generateLargeJson(10000); // 10k nodes
    
    const startTime = performance.now();
    render(<JsonTree data={largeJson} />);
    const renderTime = performance.now() - startTime;
    
    // Should render large JSON in reasonable time
    expect(renderTime).toBeLessThan(1000); // Less than 1 second
    
    // Should handle interactions smoothly
    const expander = screen.getByTestId('root-expander');
    const interactionStart = performance.now();
    await userEvent.click(expander);
    const interactionTime = performance.now() - interactionStart;
    
    expect(interactionTime).toBeLessThan(100); // Less than 100ms
  });
});
```

### **Test Category 5: Cross-Browser Compatibility** 🌐

```typescript
describe('Cross-Browser Alignment', () => {
  const testBrowsers = ['chrome', 'firefox', 'safari', 'edge'];
  
  testBrowsers.forEach(browser => {
    it(`should maintain consistent indentation in ${browser}`, () => {
      // Mock different browser font rendering
      mockBrowserFontMetrics(browser);
      
      const testData = { level1: { level2: { level3: 'value' } } };
      render(<JsonTree data={testData} />);
      
      const nodes = screen.getAllByTestId(/node-level-/);
      
      nodes.forEach((node, index) => {
        const expectedIndent = (index + 1) * 20; // 20px per level
        expect(parseInt(getComputedStyle(node).paddingLeft)).toBe(expectedIndent);
      });
    });
  });
});
```

---

## 📊 **AUTOMATED REGRESSION TESTING STRATEGY**

### **CI/CD Integration**
```yaml
# .github/workflows/regression-tests.yml
name: JSON Tool Regression Tests

on: [push, pull_request]

jobs:
  alignment-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:alignment
      - run: npm run test:visual-regression

  cross-browser-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chrome, firefox, safari]
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:browser --browser=${{ matrix.browser }}
```

### **Visual Regression Testing**
```typescript
// tests/visual-regression/alignment.spec.ts
import { test, expect } from '@playwright/test';

test('JSON tree maintains perfect alignment across different screen sizes', async ({ page }) => {
  await page.goto('/');
  await page.setContent(largeJsonSample);
  
  // Test desktop view
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.locator('.json-tree')).toHaveScreenshot('alignment-desktop.png');
  
  // Test tablet view
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator('.json-tree')).toHaveScreenshot('alignment-tablet.png');
  
  // Test mobile view
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('.json-tree')).toHaveScreenshot('alignment-mobile.png');
});
```

---

This comprehensive testing strategy ensures that the new JSON tool will never experience the alignment issues that plagued the current implementation. Each feature is tested both functionally and visually across different browsers and screen sizes.
