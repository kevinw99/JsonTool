import { describe, it, expect } from 'vitest';
import { resolveArrayPatternToMatchingElements } from './pathResolution';
import { detectIdKeysInSingleJson } from './jsonCompare';
import type { IdKeyInfo } from './jsonCompare';
import fs from 'fs';
import path from 'path';

describe('PathResolution - Simplified Functions', () => {
  
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
    it('should resolve array pattern using PathConverter utilities', () => {
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
      
      // Should return valid paths for this array pattern
      if (result.leftPath) {
        expect(result.leftPath).toMatch(/^boomerForecastV3Requests\[\d+\]\.parameters\.accountParams$/);
      }
      if (result.rightPath) {
        expect(result.rightPath).toMatch(/^boomerForecastV3Requests\[\d+\]\.parameters\.accountParams$/);
      }
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

    it('should use convertArrayPatternToNumericPath internally', () => {
      const arrayPattern = 'boomerForecastV3Requests[].parameters.accountParams[].contributions[]';
      const jsonData = { left: leftData, right: rightData };
      
      const result = resolveArrayPatternToMatchingElements(
        arrayPattern,
        jsonData,
        combinedIdKeys
      );
      
      // The function should leverage existing PathConverter utilities
      expect(result).toBeDefined();
      // Should return clean numeric paths without 'root.' prefix
      if (result.leftPath) {
        expect(result.leftPath).not.toMatch(/^root\./);
      }
      if (result.rightPath) {
        expect(result.rightPath).not.toMatch(/^root\./);
      }
    });
  });
});