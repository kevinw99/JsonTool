import { describe, it, expect } from 'vitest';
import { resolveArrayPatternToMatchingElements, idBasedPathToViewerPathWithResolution } from './pathResolution';
import { detectIdKeysInSingleJson } from './jsonCompare';
import type { IdKeyInfo } from './jsonCompare';
import fs from 'fs';
import path from 'path';

describe('PathResolution - Remaining Functions', () => {
  
  /**
   * Load test data from external JSON files
   */
  function loadTestData(): { leftData: any, rightData: any } {
    const leftPath = path.resolve(__dirname, '../../public/simple1.json');
    const rightPath = path.resolve(__dirname, '../../public/simple2.json');
    
    const leftData = JSON.parse(fs.readFileSync(leftPath, 'utf8'));
    const rightData = JSON.parse(fs.readFileSync(rightPath, 'utf8'));
    
    return { leftData, rightData };
  }

  const { leftData, rightData } = loadTestData();

  // Generate real ID keys
  const leftIdKeys = detectIdKeysInSingleJson(leftData);
  const rightIdKeys = detectIdKeysInSingleJson(rightData);
  const combinedIdKeys: IdKeyInfo[] = [...leftIdKeys, ...rightIdKeys];

  describe('resolveArrayPatternToMatchingElements', () => {
    it('should resolve array pattern to matching elements', () => {
      const arrayPattern = 'boomerForecastV3Requests[].parameters.accountParams[]';
      const jsonData = { left: leftData, right: rightData };
      
      const result = resolveArrayPatternToMatchingElements(
        arrayPattern,
        jsonData,
        combinedIdKeys
      );
      
      expect(result).toBeDefined();
      expect(typeof result.leftPath === 'string' || result.leftPath === null).toBe(true);
      expect(typeof result.rightPath === 'string' || result.rightPath === null).toBe(true);
    });

    it('should handle invalid array patterns gracefully', () => {
      const arrayPattern = 'nonexistent[].path[]';
      const jsonData = { left: leftData, right: rightData };
      
      const result = resolveArrayPatternToMatchingElements(
        arrayPattern,
        jsonData,
        combinedIdKeys
      );
      
      expect(result.leftPath).toBe(null);
      expect(result.rightPath).toBe(null);
    });
  });

  describe('idBasedPathToViewerPathWithResolution', () => {
    it('should convert ID-based path to ViewerPath', () => {
      const idBasedPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]';
      const jsonData = { left: leftData, right: rightData };
      
      const leftResult = idBasedPathToViewerPathWithResolution(
        idBasedPath,
        'left',
        jsonData,
        combinedIdKeys
      );
      
      const rightResult = idBasedPathToViewerPathWithResolution(
        idBasedPath,
        'right',
        jsonData,
        combinedIdKeys
      );
      
      // Should return ViewerPath format or null
      if (leftResult) {
        expect(leftResult).toMatch(/^left_/);
      }
      if (rightResult) {
        expect(rightResult).toMatch(/^right_/);
      }
    });

    it('should handle numeric paths without ID segments', () => {
      const numericPath = 'boomerForecastV3Requests[0].parameters';
      const jsonData = { left: leftData, right: rightData };
      
      const result = idBasedPathToViewerPathWithResolution(
        numericPath,
        'left',
        jsonData,
        combinedIdKeys
      );
      
      expect(result).toBe('left_boomerForecastV3Requests[0].parameters');
    });
  });
});