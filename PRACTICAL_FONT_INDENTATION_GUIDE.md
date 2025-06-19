# Practical Font & Indentation Implementation Guide

*Quick reference for implementing the optimal font and indentation system*

---

## 🎯 **THE SOLUTION (TL;DR)**

### **Font Choice: Monaco First**
```css
.json-tree-view {
  font-family: 'Monaco', 'SF Mono', 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.4;
}
```
**Why:** Monaco provides the smoothest visual experience on Apple systems.

### **Indentation: Character-Based (2ch)**
```css
:root {
  --json-indent-size: 2ch; /* 2 characters per level - matches editors */
}

.json-node {
  padding-left: calc(var(--level) * var(--json-indent-size));
}
```
**Why:** `ch` units mean "character width" - just like VSCode uses. 1ch = width of '0' character.

---

## 🔧 **IMPLEMENTATION STEPS**

### **Step 1: Font Setup**
```css
/* Base font for the entire JSON tree */
.json-tree-view {
  font-family: 'Monaco', 'SF Mono', 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.4;
  
  /* Smooth font rendering */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  
  /* Consistent character width */
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```

### **Step 2: Character-Based Indentation**
```css
:root {
  --json-indent-size: 2ch; /* 2 characters = 1 indent level */
  --json-expander-offset: 0.25ch; /* Small space for +/- buttons */
}

/* ONLY this rule controls indentation - no cumulative spacing! */
.json-node {
  padding-left: calc(var(--level) * var(--json-indent-size));
  box-sizing: border-box;
  margin: 0;
  position: relative;
}

/* Everything else uses absolute positioning or NO additional spacing */
.json-key,
.json-value,
.json-bracket {
  margin-left: 0 !important;
  padding-left: 0 !important;
}

.json-expander {
  position: absolute;
  left: calc(var(--level) * var(--json-indent-size) + var(--json-expander-offset));
}
```

### **Step 3: Zero-Cumulative-Spacing Rule**
**KEY PRINCIPLE:** Only ONE element controls indentation per line.

❌ **Wrong (causes misalignment):**
```css
.json-node { padding-left: calc(var(--level) * 2ch); }
.json-key { margin-left: 1ch; } /* CUMULATIVE - BAD! */
.json-expander { margin-left: 0.5ch; } /* MORE CUMULATIVE - BAD! */
```

✅ **Correct (perfect alignment):**
```css
.json-node { padding-left: calc(var(--level) * 2ch); } /* ONLY source */
.json-key { margin-left: 0; } /* No additional spacing */
.json-expander { 
  position: absolute; 
  left: calc(var(--level) * 2ch + 0.25ch); /* Positioned within indent space */
}
```

---

## 🧪 **TESTING APPROACH**

### **Cross-Browser Test**
```typescript
// Test this exact structure in Chrome, Firefox, Safari:
const testJson = {
  "level1": {
    "level2": {
      "level3": {
        "array": [
          { "nested": "value" },
          { "another": ["deep", "array"] }
        ]
      }
    }
  }
};
```

**Expected:** Perfect vertical alignment of brackets, expanders, and content across all browsers.

### **Font Loading Test**
```css
/* Test font cascade */
.test-font-monaco { font-family: 'Monaco', monospace; }
.test-font-fallback { font-family: 'NoSuchFont', 'Monaco', monospace; }
```

**Expected:** Both should render identically with Monaco.

---

## 🎨 **VISUAL VERIFICATION**

When implemented correctly, you should see:

```
{
  "users": [
┊┊{
┊┊┊┊"id": 1,
┊┊┊┊"profile": {
┊┊┊┊┊┊"name": "John",
┊┊┊┊┊┊"settings": {
┊┊┊┊┊┊┊┊"theme": "dark"
┊┊┊┊┊┊}
┊┊┊┊}
┊┊},
┊┊{
┊┊┊┊"id": 2
┊┊}
┊]
}
```

**Key Points:**
- ┊ represents the visual indent guide (2ch per level)
- Perfect vertical alignment at each level
- Brackets align under their opening counterparts
- No jagged or misaligned content

---

## 🚨 **COMMON MISTAKES TO AVOID**

### **1. Mixed Font Stacks**
❌ Don't use: `font-family: system-ui, -apple-system, BlinkMacSystemFont, monospace`
✅ Use: `font-family: 'Monaco', 'SF Mono', 'JetBrains Mono', monospace`

### **2. Cumulative Spacing**
❌ Don't add margins/padding to multiple elements on the same line
✅ Use absolute positioning or single-source indentation

### **3. Pixel-Based Fallback**
❌ Don't mix: `padding-left: 20px` with `margin-left: 1ch`
✅ Stay consistent: Either all `ch` or all `px`

### **4. Font Size Dependencies**
❌ Don't hardcode: `left: 24px` (breaks when font size changes)
✅ Use relative: `left: calc(var(--level) * 2ch + 0.25ch)`

---

## 🎯 **SUCCESS CRITERIA**

✅ **Monaco font loads first on Apple systems**  
✅ **2ch indentation matches editor behavior**  
✅ **Perfect alignment across Chrome/Firefox/Safari**  
✅ **No cumulative spacing issues**  
✅ **Responsive to font size changes**  
✅ **Smooth, editor-like visual experience**

---

*This guide implements the optimal solution: Monaco for smoothness + character-based indentation for editor consistency.*
