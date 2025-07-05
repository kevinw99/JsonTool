import '@testing-library/jest-dom'
import { vi } from 'vitest'

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