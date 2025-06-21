import '@testing-library/jest-dom'

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

// Mock closest method
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
