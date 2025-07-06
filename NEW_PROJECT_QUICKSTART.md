# New JSON Tool Project - Quick Start Guide

## 🚀 **Recommended Approach for Clean Implementation**

### **Step 1: Project Setup**
```bash
# Create new Vite + React + TypeScript project
npm create vite@latest json-tool-v2 -- --template react-ts
cd json-tool-v2
npm install

# Add recommended dependencies
npm install @tailwindcss/typography tailwindcss autoprefixer postcss
npm install zustand react-use-gesture framer-motion
npm install @testing-library/react @testing-library/jest-dom vitest --save-dev
```

### **Step 2: Core Architecture Setup**
```
src/
├── components/
│   ├── ui/           # Basic UI components (Button, Input, etc.)
│   ├── json/         # JSON-specific components
│   │   ├── JsonViewer.tsx
│   │   ├── JsonTree.tsx
│   │   └── JsonNode.tsx
│   ├── diff/         # Diff-related components
│   │   ├── DiffViewer.tsx
│   │   ├── DiffList.tsx
│   │   └── DiffMarker.tsx
│   └── layout/       # Layout components
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── ResizablePanel.tsx
├── hooks/            # Custom React hooks
├── stores/           # Zustand state stores
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
└── styles/           # Global styles and Tailwind config
```

### **Step 3: Start with Indentation System**
```css
/* Use CSS custom properties for consistent spacing */
:root {
  --json-indent-size: 20px;
  --json-node-height: 24px;
  --json-expander-size: 16px;
}

/* Grid-based layout for perfect alignment */
.json-node {
  display: grid;
  grid-template-columns: var(--json-expander-size) 1fr;
  align-items: center;
  height: var(--json-node-height);
  padding-left: calc(var(--level) * var(--json-indent-size));
}
```

### **Step 4: TypeScript Types First**
```typescript
// Define all types before implementation
export interface JsonNode {
  key?: string;
  value: JsonValue;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  level: number;
  path: string;
  isExpanded?: boolean;
  children?: JsonNode[];
}

export interface DiffResult {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: any;
  newValue?: any;
  isIgnored?: boolean;
}
```

### **Step 5: Component Development Order**
1. **JsonNode** (single node with perfect indentation)
2. **JsonTree** (tree container with nodes)
3. **JsonViewer** (viewer with tree + controls)
4. **DiffMarker** (visual diff indicators)
5. **DiffViewer** (side-by-side comparison)
6. **DiffList** (diff management panel)

### **Step 6: Testing Strategy**
```typescript
// Test indentation first
describe('JsonNode Indentation', () => {
  it('should have consistent pixel-based indentation', () => {
    // Test component with different levels
  });
  
  it('should align expanders correctly', () => {
    // Test expander positioning
  });
});
```

## 🎯 **Key Success Principles**

### **1. Pixel-Perfect from Day One**
- Use `px` measurements only
- No `ch`, `em`, or percentage units for indentation
- Test across different browsers/fonts immediately

### **2. Component-First Development**
- Build each component in isolation
- Use Storybook or similar for component development
- Test edge cases (deeply nested, empty objects, etc.)

### **3. State Management Strategy**
```typescript
// Example Zustand store structure
interface JsonStore {
  json1: JsonValue | null;
  json2: JsonValue | null;
  diffs: DiffResult[];
  expandedPaths: Set<string>;
  ignoredDiffs: Set<string>;
  highlightedPath: string | null;
  
  // Actions
  setJson: (side: 1 | 2, json: JsonValue) => void;
  toggleExpanded: (path: string) => void;
  ignoreDiff: (path: string) => void;
  highlightPath: (path: string) => void;
}
```

### **4. CSS Architecture**
```css
/* Use BEM methodology */
.json-viewer { }
.json-viewer__tree { }
.json-viewer__node { }
.json-viewer__node--expanded { }
.json-viewer__node--has-diff { }

/* Or use Tailwind with custom components */
.json-node {
  @apply flex items-center h-6 font-mono text-sm;
  padding-left: calc(theme('spacing.5') * var(--level));
}
```

## 📋 **Implementation Checklist**

### **Phase 1: Foundation** ✅
- [ ] Project setup with Vite + React + TypeScript
- [ ] Tailwind CSS configuration
- [ ] Basic component structure
- [ ] TypeScript types definition
- [ ] Testing framework setup

### **Phase 2: Core JSON Display** ✅
- [ ] JsonNode component with pixel-perfect indentation
- [ ] JsonTree container component
- [ ] Expand/collapse functionality
- [ ] JSON value type handling
- [ ] Error handling for invalid JSON

### **Phase 3: Comparison Engine** ✅
- [ ] JSON diff algorithm
- [ ] Diff highlighting system
- [ ] Side-by-side viewer
- [ ] Diff filtering and management

### **Phase 4: User Experience** ✅
- [ ] Drag & drop file loading
- [ ] Responsive design
- [ ] Smooth animations
- [ ] Keyboard navigation
- [ ] Accessibility features

## 🔧 **Debugging Tools**

### **Visual Debugging**
```css
/* Add temporarily for indentation debugging */
.json-node {
  border-left: 1px solid rgba(255, 0, 0, 0.2);
  background: linear-gradient(
    90deg, 
    transparent calc(var(--level) * 20px - 1px),
    rgba(0, 255, 0, 0.1) calc(var(--level) * 20px),
    rgba(0, 255, 0, 0.1) calc(var(--level) * 20px + 1px),
    transparent calc(var(--level) * 20px + 2px)
  );
}
```

### **Component Dev Tools**
```typescript
// Add to components during development
const DebugInfo = ({ level, path }: { level: number; path: string }) => (
  process.env.NODE_ENV === 'development' ? (
    <div style={{ fontSize: '10px', opacity: 0.5 }}>
      L{level}: {path}
    </div>
  ) : null
);
```

---

*This guide provides a battle-tested approach for rebuilding the JSON tool with modern best practices and avoiding the pitfalls encountered in the current implementation.*
