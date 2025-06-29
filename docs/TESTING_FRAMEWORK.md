// vitest.config.ts - Testing Configuration for JSON Tool V2
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
});

// src/test/setup.ts - Test Environment Setup
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock ResizeObserver for tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock getBoundingClientRect for layout tests
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  bottom: 0,
  height: 24,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON: vi.fn(),
}));

// Custom matcher for indentation testing
expect.extend({
  toHaveConsistentIndentation(received, expectedLevel) {
    const indentSize = 20; // 20px per level
    const expectedIndent = expectedLevel * indentSize;
    const actualIndent = parseInt(getComputedStyle(received).paddingLeft);
    
    const pass = actualIndent === expectedIndent;
    
    return {
      message: () => 
        pass 
          ? `Expected element NOT to have ${expectedIndent}px indentation`
          : `Expected element to have ${expectedIndent}px indentation, but got ${actualIndent}px`,
      pass,
    };
  },
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// src/test/utils/test-data.ts - Test Data Generators
export const generateLargeJson = (nodeCount: number) => {
  const result: any = {};
  
  for (let i = 0; i < nodeCount; i++) {
    const depth = Math.floor(i / 1000);
    let current = result;
    
    // Create nested structure
    for (let d = 0; d < depth; d++) {
      const key = `level${d}`;
      if (!current[key]) current[key] = {};
      current = current[key];
    }
    
    current[`item${i}`] = {
      id: i,
      value: `Test value ${i}`,
      type: i % 2 === 0 ? 'even' : 'odd',
      nested: i % 10 === 0 ? { deep: `deep${i}` } : null,
      array: i % 5 === 0 ? [`elem${i}`, `elem${i + 1}`] : undefined,
    };
  }
  
  return result;
};

export const createTestJson = (levels: number): any => {
  if (levels === 0) return 'leaf value';
  
  return {
    [`level${levels}`]: {
      object: createTestJson(levels - 1),
      array: [
        createTestJson(levels - 1),
        `array item ${levels}`,
        { nested: createTestJson(levels - 1) }
      ],
      primitive: `value at level ${levels}`,
      number: levels * 10,
      boolean: levels % 2 === 0,
      null: null,
    }
  };
};

export const mockBrowserFontMetrics = (browser: string) => {
  const fontMetrics = {
    chrome: { charWidth: 8.5, lineHeight: 20 },
    firefox: { charWidth: 8.2, lineHeight: 21 },
    safari: { charWidth: 8.7, lineHeight: 19 },
    edge: { charWidth: 8.4, lineHeight: 20 },
  };
  
  const metrics = fontMetrics[browser] || fontMetrics.chrome;
  
  // Mock font measurement methods
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    get: function() { return this.textContent?.length * metrics.charWidth || 0; }
  });
  
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    get: function() { return metrics.lineHeight; }
  });
};

// src/test/utils/render-helpers.tsx - Custom Render Utilities
import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { JsonViewerProvider } from '../../components/JsonViewerContext';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: {
    json1?: any;
    json2?: any;
    expandedPaths?: Set<string>;
    highlightedPath?: string | null;
  };
}

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialState, ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <JsonViewerProvider initialState={initialState}>
      {children}
    </JsonViewerProvider>
  );

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
};

export * from '@testing-library/react';
export { customRender as render };

// src/test/specs/alignment.test.tsx - Core Alignment Tests
import { describe, it, expect } from 'vitest';
import { render, screen } from '../utils/render-helpers';
import { JsonNode } from '../../components/JsonNode';
import { createTestJson } from '../utils/test-data';

describe('JsonNode Alignment', () => {
  describe('Indentation Consistency', () => {
    it('maintains pixel-perfect indentation at all levels', () => {
      const testData = createTestJson(5);
      
      render(<JsonNode data={testData} level={0} path="root" />);
      
      // Check each level has correct indentation
      for (let level = 1; level <= 5; level++) {
        const node = screen.getByTestId(`node-level-${level}`);
        expect(node).toHaveConsistentIndentation(level);
      }
    });

    it('aligns array brackets correctly', () => {
      const arrayData = [
        'item1',
        ['nested1', 'nested2'],
        { key: 'value' },
        'item4'
      ];
      
      render(<JsonNode data={arrayData} level={0} path="root" />);
      
      const openBracket = screen.getByTestId('opening-bracket-root');
      const closeBracket = screen.getByTestId('closing-bracket-root');
      
      expect(openBracket.getBoundingClientRect().left)
        .toBe(closeBracket.getBoundingClientRect().left);
    });

    it('aligns object braces correctly', () => {
      const objectData = {
        key1: 'value1',
        nested: {
          key2: 'value2',
          deeper: { key3: 'value3' }
        },
        key4: 'value4'
      };
      
      render(<JsonNode data={objectData} level={0} path="root" />);
      
      const openBrace = screen.getByTestId('opening-brace-root');
      const closeBrace = screen.getByTestId('closing-brace-root');
      
      expect(openBrace.getBoundingClientRect().left)
        .toBe(closeBrace.getBoundingClientRect().left);
    });
  });

  describe('Expander Positioning', () => {
    it('positions expanders consistently across levels', () => {
      const nestedData = createTestJson(4);
      
      render(<JsonNode data={nestedData} level={0} path="root" />);
      
      // Find all expander buttons
      const expanders = screen.getAllByRole('button', { name: /toggle/i });
      
      expanders.forEach((expander) => {
        const node = expander.closest('[data-testid^="node-level-"]');
        const level = parseInt(node.dataset.testid.match(/level-(\d+)/)[1]);
        
        // Expander should be 8px from start of node's indentation
        const expectedLeft = level * 20 + 8;
        const actualLeft = expander.getBoundingClientRect().left - 
                          node.getBoundingClientRect().left;
        
        expect(actualLeft).toBe(expectedLeft);
      });
    });

    it('handles nodes without expanders correctly', () => {
      const mixedData = {
        hasChildren: { nested: 'value' },
        primitive: 'no expander',
        array: ['item1', 'item2'],
        anotherPrimitive: 42
      };
      
      render(<JsonNode data={mixedData} level={0} path="root" />);
      
      // Nodes without expanders should still align keys properly
      const primitiveKey = screen.getByTestId('key-primitive');
      const numberKey = screen.getByTestId('key-anotherPrimitive');
      
      expect(primitiveKey.getBoundingClientRect().left)
        .toBe(numberKey.getBoundingClientRect().left);
    });
  });
});
