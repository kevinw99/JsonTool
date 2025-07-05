import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock sample data for fetch calls
const mockSampleData = {
  simple1: { name: "Test Object 1", value: 100 },
  simple2: { name: "Test Object 2", value: 200 }
};

// Mock fetch for test environment to prevent initial file loading errors
global.fetch = vi.fn((url) => {
  if (typeof url === 'string') {
    if (url.includes('simple1.json') || url.includes('/simple1.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSampleData.simple1)
      } as Response);
    }
    if (url.includes('simple2.json') || url.includes('/simple2.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSampleData.simple2)
      } as Response);
    }
  }
  
  // Default response for unhandled URLs
  return Promise.reject(new Error(`Unhandled URL in tests: ${url}`));
}) as any;

// Mock scroll functions
Object.defineProperty(Element.prototype, 'scrollTo', {
  value: function(options: any) {
    if (typeof options === 'object') {
      this.scrollTop = options.top || 0;
      this.scrollLeft = options.left || 0;
    }
  },
  writable: true
});

Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: function() {
    // Mock implementation
  },
  writable: true
});

// Mock getBoundingClientRect
Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  value: function() {
    return {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 400,
      height: 100,
      x: 0,
      y: 0,
      toJSON: function() {}
    };
  },
  writable: true
});

// Mock closest method for scroll containers
Object.defineProperty(Element.prototype, 'closest', {
  value: function(selector: string) {
    if (selector === '.json-viewer-scroll-container') {
      const mockContainer = document.createElement('div');
      mockContainer.className = 'json-viewer-scroll-container';
      
      // Define properties properly
      Object.defineProperties(mockContainer, {
        scrollTop: { value: 0, writable: true },
        scrollHeight: { value: 1000, writable: true },
        clientHeight: { value: 400, writable: true }
      });
      
      // Mock getBoundingClientRect for container
      mockContainer.getBoundingClientRect = () => ({
        top: 0,
        left: 0,
        right: 400,
        bottom: 400,
        width: 400,
        height: 400,
        x: 0,
        y: 0,
        toJSON: function() {}
      });
      
      return mockContainer;
    }
    return null;
  },
  writable: true
});