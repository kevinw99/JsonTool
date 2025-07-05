import { describe, it, expect } from 'vitest';
import { resolveIdBasedPathToNumeric, resolveIdBasedPathForSingleSide } from './pathResolution';
import { detectIdKeysInSingleJson, jsonCompare } from './jsonCompare';
import type { IdKeyInfo } from './jsonCompare';

describe('PathResolution - GoTo Navigation Logic', () => {
  
  // Real sample data matching the actual application structure
  const leftData = {
    boomerForecastV3Requests: [{
      parameters: {
        accountParams: [
          { id: "45626988::1", managementFee: 0.007212962962963 },
          {
            id: "45626988::2",
            managementFee: 0.007212962962963,
            contributions: [
              {
                id: "45626988::2_prtcpnt-catchup-50-separate_0",
                contributionType: "CATCH_UP_50_SEPARATE_PRE_TAX", // Will change
                contributions: [1000, 1000, 1000, 1000, 1000]
              },
              {
                id: "45626988::2_prtcpnt-pre_0",
                contributionType: "PARTICIPANT_PRE_TAX",
                contributions: [7000, 7000, 7000, 7000, 7000]
              }
            ]
          }
        ]
      }
    }]
  };

  const rightData = {
    boomerForecastV3Requests: [{
      parameters: {
        accountParams: [
          { id: "45626988::1", managementFee: 0.007212962962963 },
          {
            id: "45626988::2", 
            managementFee: 0.007212962962963,
            contributions: [
              {
                id: "45626988::2_prtcpnt-after_0", // ADDED - new contribution
                contributionType: "PARTICIPANT_AFTER_TAX",
                contributions: [3500, 3500, 3500, 3500, 3500]
              },
              {
                id: "45626988::2_prtcpnt-catchup-50-separate_0",
                contributionType: "CATCH_UP_50_SEPARATE_AFTER_TAX", // CHANGED
                contributions: [1000, 1000, 1000, 1000, 1000]
              },
              {
                id: "45626988::2_prtcpnt-pre_0",
                contributionType: "PARTICIPANT_PRE_TAX",
                contributions: [3500, 3500, 3500, 3500, 3500] // CHANGED values
              }
            ]
          }
        ]
      }
    }]
  };

  // Generate real ID keys and diffs
  const leftIdKeys = detectIdKeysInSingleJson(leftData);
  const rightIdKeys = detectIdKeysInSingleJson(rightData);
  const combinedIdKeys: IdKeyInfo[] = [...leftIdKeys, ...rightIdKeys];
  const compareResult = jsonCompare(leftData, rightData, combinedIdKeys);

  describe('Diff #1 - ContributionType Change Resolution', () => {
    
    it('should resolve Diff #1 contributionType change to correct array indices', () => {
      console.log('🧪 Testing Diff #1 path resolution with real PathConverter logic');
      
      // Find the real Diff #1 - contributionType change
      const diff1 = compareResult.diffs.find(diff => 
        diff.idBasedPath.includes('contributionType') &&
        diff.idBasedPath.includes('45626988::2_prtcpnt-catchup-50-separate_0') &&
        diff.type === 'changed'
      );
      
      expect(diff1).toBeTruthy();
      expect(diff1!.value1).toBe('CATCH_UP_50_SEPARATE_PRE_TAX');
      expect(diff1!.value2).toBe('CATCH_UP_50_SEPARATE_AFTER_TAX');
      
      console.log('✅ Found real Diff #1:', diff1!.idBasedPath);

      // Test the core path resolution logic
      const result = resolveIdBasedPathToNumeric(
        diff1!.idBasedPath,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      console.log('📍 PathResolution results:');
      console.log(`  Left path: ${result.leftPath}`);
      console.log(`  Right path: ${result.rightPath}`);
      
      // CRITICAL ASSERTIONS: Verify correct array indices
      
      // Left panel: catchup contribution is at index 0
      expect(result.leftPath).toContain('contributions[0].contributionType');
      
      // Right panel: catchup contribution is at index 1 (due to added item at index 0)
      expect(result.rightPath).toContain('contributions[1].contributionType');
      
      // Verify the paths are well-formed
      expect(result.leftPath).toMatch(/^boomerForecastV3Requests\[0\]\.parameters\.accountParams\[1\]\.contributions\[0\]\.contributionType$/);
      expect(result.rightPath).toMatch(/^boomerForecastV3Requests\[0\]\.parameters\.accountParams\[1\]\.contributions\[1\]\.contributionType$/);
      
      console.log('✅ PathResolution correctly resolved array indices for Diff #1');
    });
    
    it('should handle error cases gracefully', () => {
      // Test with invalid ID-based path that doesn't exist in the data
      const result = resolveIdBasedPathToNumeric(
        'boomerForecastV3Requests[0].parameters.accountParams[id=nonexistent].invalidProperty',
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      // PathConverter may return the original path or null for invalid conversions
      // The important thing is that it doesn't throw an error
      expect(typeof result.leftPath === 'string' || result.leftPath === null).toBe(true);
      expect(typeof result.rightPath === 'string' || result.rightPath === null).toBe(true);
    });
    
    it('should handle missing JSON data gracefully', () => {
      const diff1 = compareResult.diffs.find(diff => 
        diff.idBasedPath.includes('contributionType') &&
        diff.type === 'changed'
      );
      
      // Test with null left data
      const resultMissingLeft = resolveIdBasedPathToNumeric(
        diff1!.idBasedPath,
        { left: null, right: rightData },
        combinedIdKeys
      );
      
      expect(resultMissingLeft.leftPath).toBeNull();
      expect(resultMissingLeft.rightPath).toBeTruthy(); // Right should still work
      
      // Test with null right data
      const resultMissingRight = resolveIdBasedPathToNumeric(
        diff1!.idBasedPath,
        { left: leftData, right: null },
        combinedIdKeys
      );
      
      expect(resultMissingRight.leftPath).toBeTruthy(); // Left should still work
      expect(resultMissingRight.rightPath).toBeNull();
    });
  });

  describe('Single Side Resolution', () => {
    
    it('should resolve single side paths correctly', () => {
      const diff1 = compareResult.diffs.find(diff => 
        diff.idBasedPath.includes('contributionType') &&
        diff.type === 'changed'
      );
      
      const leftPath = resolveIdBasedPathForSingleSide(
        diff1!.idBasedPath,
        leftData,
        combinedIdKeys
      );
      
      const rightPath = resolveIdBasedPathForSingleSide(
        diff1!.idBasedPath,
        rightData,
        combinedIdKeys
      );
      
      expect(leftPath).toContain('contributions[0].contributionType');
      expect(rightPath).toContain('contributions[1].contributionType');
    });
  });

  describe('Integration with Real Diff Results', () => {
    
    it('should work with all generated diffs', () => {
      console.log(`🔄 Testing path resolution with all ${compareResult.diffs.length} generated diffs`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const diff of compareResult.diffs) {
        try {
          const result = resolveIdBasedPathToNumeric(
            diff.idBasedPath,
            { left: leftData, right: rightData },
            combinedIdKeys
          );
          
          if (result.leftPath || result.rightPath) {
            successCount++;
          } else {
            console.warn(`⚠️ No paths resolved for: ${diff.idBasedPath}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error resolving: ${diff.idBasedPath}`, error);
        }
      }
      
      console.log(`📊 Resolution results: ${successCount} successful, ${errorCount} errors`);
      
      // Most diffs should resolve successfully
      expect(successCount).toBeGreaterThan(compareResult.diffs.length * 0.8);
      expect(errorCount).toBeLessThan(compareResult.diffs.length * 0.2);
    });
  });

  describe('Path Format Validation', () => {
    
    it('should handle paths with and without root prefix', () => {
      const diff1 = compareResult.diffs.find(diff => 
        diff.idBasedPath.includes('contributionType') &&
        diff.type === 'changed'
      );
      
      // Test with root prefix
      const resultWithRoot = resolveIdBasedPathToNumeric(
        `root.${diff1!.idBasedPath}`,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      // Test without root prefix
      const resultWithoutRoot = resolveIdBasedPathToNumeric(
        diff1!.idBasedPath,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      // Results should be the same regardless of root prefix
      expect(resultWithRoot.leftPath).toEqual(resultWithoutRoot.leftPath);
      expect(resultWithRoot.rightPath).toEqual(resultWithoutRoot.rightPath);
    });
  });
});