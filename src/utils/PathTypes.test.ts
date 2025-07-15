import { describe, it, expect } from 'vitest';
import {
  // Core branded types
  createNumericPath,
  createIdBasedPath,
  createArrayPatternPath,
  
  // Type guards
  hasIdBasedSegments,
  isPureNumeric,
  isNumericPath,
  isIdBasedPath,
  isArrayPatternPath,
  isValidArrayPattern,
  isViewerPath,
  
  // Validation functions (keeping only what we still use)
  validateAndCreateNumericPath,
  validateAndCreateIdBasedPath,
  validateAndCreateArrayPatternPath,
  
  // Viewer path functions
  extractViewerId,
  extractGenericPath,
  createViewerPath,
  viewerPathToGeneric,
  viewerPathToGenericWithoutRoot,
  validateViewerPath,
  
  // DOM helpers
  getViewerPathFromElement,
  queryElementByViewerPath,
  getNumericPathFromViewerPath,
  getAllElementsForViewer,
  
  // Types for testing
  type NumericPath,
  type IdBasedPath,
  type ArrayPatternPath,
  type ViewerPath,
  type ViewerId
} from './PathTypes';

describe('PathTypes', () => {
  describe('Core Type Creation', () => {
    it('should create branded types', () => {
      const numericPath = createNumericPath('array[0].property');
      const idBasedPath = createIdBasedPath('array[id=123].property');
      const arrayPattern = createArrayPatternPath('array[].property[]');
      
      expect(typeof numericPath).toBe('string');
      expect(typeof idBasedPath).toBe('string');
      expect(typeof arrayPattern).toBe('string');
    });
  });

  describe('Type Guards', () => {
    describe('hasIdBasedSegments', () => {
      it('should detect ID-based segments', () => {
        expect(hasIdBasedSegments(createIdBasedPath('array[id=123].property'))).toBe(true);
        expect(hasIdBasedSegments(createIdBasedPath('array[key=value].nested[name=test]'))).toBe(true);
        expect(hasIdBasedSegments(createIdBasedPath('array[0].property'))).toBe(false);
        expect(hasIdBasedSegments(createIdBasedPath('simple.property'))).toBe(false);
        expect(hasIdBasedSegments(createIdBasedPath('array[malformed'))).toBe(false);
      });
    });

    describe('isPureNumeric', () => {
      it('should detect purely numeric paths', () => {
        expect(isPureNumeric(createIdBasedPath('array[0].nested[1].property'))).toBe(true);
        expect(isPureNumeric(createIdBasedPath('array[123].property'))).toBe(true);
        expect(isPureNumeric(createIdBasedPath('simple.property'))).toBe(true);
        expect(isPureNumeric(createIdBasedPath('array[id=123].property'))).toBe(false);
        expect(isPureNumeric(createIdBasedPath('array[0].nested[key=value]'))).toBe(false);
      });
    });

    describe('isNumericPath', () => {
      it('should validate numeric path strings', () => {
        expect(isNumericPath('array[0].property')).toBe(true);
        expect(isNumericPath('array[123].nested[456]')).toBe(true);
        expect(isNumericPath('simple.property')).toBe(true);
        expect(isNumericPath('array[id=123].property')).toBe(false);
      });
    });

    describe('isArrayPatternPath', () => {
      it('should validate array pattern format', () => {
        expect(isArrayPatternPath('array[].property')).toBe(true);
        expect(isArrayPatternPath('nested[].array[].property[]')).toBe(true);
        expect(isArrayPatternPath('array[0].property')).toBe(false);
        expect(isArrayPatternPath('array[id=123].property')).toBe(false);
        expect(isArrayPatternPath('simple.property')).toBe(false);
      });
    });

    describe('isValidArrayPattern', () => {
      it('should validate complete array patterns', () => {
        expect(isValidArrayPattern('array[]')).toBe(true);
        expect(isValidArrayPattern('nested[].array[]')).toBe(true);
        expect(isValidArrayPattern('array[].property[]')).toBe(true);
        expect(isValidArrayPattern('array[].property')).toBe(false); // doesn't end with []
        expect(isValidArrayPattern('array[0]')).toBe(false); // numeric index
        expect(isValidArrayPattern('simple.property')).toBe(false); // no arrays
      });
    });

    describe('isViewerPath', () => {
      it('should detect viewer path format', () => {
        expect(isViewerPath('left_root.property')).toBe(true);
        expect(isViewerPath('right_root.array[0]')).toBe(true);
        expect(isViewerPath('property')).toBe(false);
        expect(isViewerPath('middle_root.property')).toBe(false);
        expect(isViewerPath('leftroot.property')).toBe(false);
      });
    });
  });

  // Note: Removed tests for eliminated conversion functions

  // Note: Removed tests for eliminated array pattern conversion functions

  describe('Validation Functions', () => {
    describe('validateAndCreateNumericPath', () => {
      it('should create valid numeric paths', () => {
        const result = validateAndCreateNumericPath('array[0].property', 'test');
        expect(result).toBe('array[0].property');
      });

      it('should throw for invalid inputs', () => {
        expect(() => validateAndCreateNumericPath('', 'test')).toThrow();
        expect(() => validateAndCreateNumericPath(null as any, 'test')).toThrow();
        expect(() => validateAndCreateNumericPath(undefined as any, 'test')).toThrow();
      });

      it('should warn for ID-based segments', () => {
        // Should still create the path but warn
        const originalWarn = console.warn;
        let warnCalled = false;
        console.warn = () => { warnCalled = true; };
        
        const result = validateAndCreateNumericPath('array[id=123].property', 'test');
        expect(result).toBe('array[id=123].property');
        expect(warnCalled).toBe(true);
        
        console.warn = originalWarn;
      });
    });

    describe('validateAndCreateIdBasedPath', () => {
      it('should create valid ID-based paths', () => {
        const result = validateAndCreateIdBasedPath('array[id=123].property', 'test');
        expect(result).toBe('array[id=123].property');
      });

      it('should throw for invalid inputs', () => {
        expect(() => validateAndCreateIdBasedPath('', 'test')).toThrow();
        expect(() => validateAndCreateIdBasedPath(null as any, 'test')).toThrow();
      });
    });

    describe('validateAndCreateArrayPatternPath', () => {
      it('should create valid array patterns', () => {
        const result = validateAndCreateArrayPatternPath('array[].property[]', 'test');
        expect(result).toBe('array[].property[]');
      });

      it('should throw for invalid patterns', () => {
        expect(() => validateAndCreateArrayPatternPath('array[0].property', 'test')).toThrow();
        expect(() => validateAndCreateArrayPatternPath('simple.property', 'test')).toThrow();
      });
    });
  });

  // Note: Removed tests for eliminated array pattern utility functions and smart conversion

  describe('Viewer Path Functions', () => {
    describe('extractViewerId', () => {
      it('should extract viewer IDs', () => {
        expect(extractViewerId('left_root.property')).toBe('left');
        expect(extractViewerId('right_root.array[0]')).toBe('right');
        expect(extractViewerId('property')).toBe(null);
        expect(extractViewerId('invalid_root.property')).toBe(null);
      });
    });

    describe('extractGenericPath', () => {
      it('should extract generic paths', () => {
        expect(extractGenericPath('left_root.property')).toBe('property');
        expect(extractGenericPath('right_root.array[0].nested')).toBe('array[0].nested');
        expect(extractGenericPath('property')).toBe('property'); // no prefix to remove
      });
    });

    describe('createViewerPath', () => {
      it('should create viewer paths for numeric paths', () => {
        const numeric = createNumericPath('array[0].property');
        const viewerPath = createViewerPath('left', numeric);
        expect(viewerPath).toBe('left_root.array[0].property');
      });

      it('should throw for non-numeric paths', () => {
        expect(() => createViewerPath('left', 'array[id=123].property')).toThrow();
      });
    });

    describe('viewerPathToGeneric', () => {
      it('should convert viewer path to generic numeric path', () => {
        const viewerPath = 'left_root.array[0].property' as ViewerPath;
        const generic = viewerPathToGeneric(viewerPath);
        expect(generic).toBe('array[0].property');
      });
    });

    describe('viewerPathToGenericWithoutRoot', () => {
      it('should extract path without root prefix', () => {
        const viewerPath = 'left_root.boomerForecastV3Requests[0].parameters' as ViewerPath;
        const result = viewerPathToGenericWithoutRoot(viewerPath);
        expect(result).toBe('boomerForecastV3Requests[0].parameters');
      });

      it('should handle paths without root prefix', () => {
        const viewerPath = 'left_simple.property' as ViewerPath;
        const result = viewerPathToGenericWithoutRoot(viewerPath);
        expect(result).toBe('simple.property');
      });

      it('should handle edge cases', () => {
        const viewerPath = 'right_root' as ViewerPath;
        const result = viewerPathToGenericWithoutRoot(viewerPath);
        expect(result).toBe('root'); // extractGenericPath gives 'root', no 'root.' prefix to remove
      });
    });

    describe('validateViewerPath', () => {
      it('should validate and create viewer paths', () => {
        const result = validateViewerPath('left_root.array[0].property', 'test');
        expect(result).toBe('left_root.array[0].property');
      });

      it('should throw for invalid viewer IDs', () => {
        expect(() => validateViewerPath('invalid_property', 'test')).toThrow();
        expect(() => validateViewerPath('property', 'test')).toThrow();
      });

      it('should throw for missing generic path', () => {
        expect(() => validateViewerPath('left_', 'test')).toThrow();
      });

      it('should throw for invalid inputs', () => {
        expect(() => validateViewerPath('', 'test')).toThrow();
        expect(() => validateViewerPath(null as any, 'test')).toThrow();
      });
    });

    describe('getNumericPathFromViewerPath', () => {
      it('should extract numeric path from viewer path', () => {
        const viewerPath = 'left_root.array[0].property' as ViewerPath;
        const numeric = getNumericPathFromViewerPath(viewerPath);
        expect(numeric).toBe('array[0].property');
      });
    });
  });

  describe('DOM Helper Functions', () => {
    // Note: These tests would require DOM setup, so we'll test the basic functionality
    describe('getViewerPathFromElement', () => {
      it('should return null for elements without data-path', () => {
        const element = document.createElement('div');
        const result = getViewerPathFromElement(element);
        expect(result).toBe(null);
      });

      it('should return null for invalid viewer paths', () => {
        const element = document.createElement('div');
        element.setAttribute('data-path', 'invalid.path');
        const result = getViewerPathFromElement(element);
        expect(result).toBe(null);
      });

      it('should extract valid viewer paths', () => {
        const element = document.createElement('div');
        element.setAttribute('data-path', 'left_root.array[0]');
        const result = getViewerPathFromElement(element);
        expect(result).toBe('left_root.array[0]');
      });
    });

    describe('queryElementByViewerPath', () => {
      it('should query by viewer path', () => {
        // Create and append element
        const element = document.createElement('div');
        element.setAttribute('data-path', 'left_root.test');
        document.body.appendChild(element);
        
        try {
          const viewerPath = 'left_root.test' as ViewerPath;
          const found = queryElementByViewerPath(viewerPath);
          expect(found).toBe(element);
        } finally {
          document.body.removeChild(element);
        }
      });
    });

    describe('getAllElementsForViewer', () => {
      it('should get all elements for a viewer', () => {
        // Create test elements
        const leftElement1 = document.createElement('div');
        leftElement1.setAttribute('data-path', 'left_root.test1');
        const leftElement2 = document.createElement('div');
        leftElement2.setAttribute('data-path', 'left_root.test2');
        const rightElement = document.createElement('div');
        rightElement.setAttribute('data-path', 'right_root.test');
        
        document.body.appendChild(leftElement1);
        document.body.appendChild(leftElement2);
        document.body.appendChild(rightElement);
        
        try {
          const leftElements = getAllElementsForViewer('left');
          expect(leftElements.length).toBe(2);
          
          const rightElements = getAllElementsForViewer('right');
          expect(rightElements.length).toBe(1);
        } finally {
          document.body.removeChild(leftElement1);
          document.body.removeChild(leftElement2);
          document.body.removeChild(rightElement);
        }
      });
    });
  });

  describe('Real-world Path Examples', () => {
    it('should handle complex real-world paths', () => {
      const complexPath = 'boomerForecastV3Requests[0].aggregateData.responses[0].responseData.boomerForecast.status';
      
      // Should be recognized as numeric
      expect(isNumericPath(complexPath)).toBe(true);
      
      // Should create viewer path
      const viewerPath = createViewerPath('left', createNumericPath(complexPath));
      expect(viewerPath).toBe('left_root.boomerForecastV3Requests[0].aggregateData.responses[0].responseData.boomerForecast.status');
      
      // Should extract without root
      expect(viewerPathToGenericWithoutRoot(viewerPath)).toBe('boomerForecastV3Requests[0].aggregateData.responses[0].responseData.boomerForecast.status');
    });

    // Note: Removed test that used eliminated array pattern functions
  });
});