import { describe, it, expect } from 'vitest';
import { resolveIdBasedPathToNumeric, resolveIdBasedPathForSingleSide } from './pathResolution';
import { detectIdKeysInSingleJson, jsonCompare } from './jsonCompare';
import type { IdKeyInfo } from './jsonCompare';
import fs from 'fs';
import path from 'path';

describe('PathResolution - GoTo Navigation Logic', () => {
  
  /**
   * Load test data from external JSON files
   */
  function loadTestData(): { leftData: any, rightData: any } {
    const leftPath = path.resolve(__dirname, '../../public/highlighting-test-left-panel.json');
    const rightPath = path.resolve(__dirname, '../../public/highlighting-test-right-panel.json');
    
    const leftData = JSON.parse(fs.readFileSync(leftPath, 'utf8'));
    const rightData = JSON.parse(fs.readFileSync(rightPath, 'utf8'));
    
    return { leftData, rightData };
  }

  const { leftData, rightData } = loadTestData();

  // Generate real ID keys and diffs
  const leftIdKeys = detectIdKeysInSingleJson(leftData);
  const rightIdKeys = detectIdKeysInSingleJson(rightData);
  const combinedIdKeys: IdKeyInfo[] = [...leftIdKeys, ...rightIdKeys];
  const compareResult = jsonCompare(leftData, rightData, combinedIdKeys);

  describe('Diffs #1-5 - Pre Contribution Array Changes Resolution', () => {
    
    it('should resolve Diffs #1-5 pre contribution array changes to correct array indices', () => {
      console.log('🧪 Testing Diffs #1-5 path resolution with real PathConverter logic');
      
      // Find the real Diffs #1-5 - pre contribution array changes
      const diff1 = compareResult.diffs.find(diff => 
        diff.idBasedPath.includes('contributions[0]') &&
        diff.idBasedPath.includes('45626988::2_prtcpnt-pre_0') &&
        diff.type === 'changed'
      );
      
      expect(diff1).toBeTruthy();
      expect(diff1!.value1).toBe(7000);
      expect(diff1!.value2).toBe(3500);
      
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
      
      // Both panels: pre contribution is at index 0 in the new data structure
      expect(result.leftPath).toContain('contributions[0].contributions[0]');
      expect(result.rightPath).toContain('contributions[0].contributions[0]');
      
      // Verify the paths are well-formed
      expect(result.leftPath).toMatch(/^boomerForecastV3Requests\[0\]\.parameters\.accountParams\[1\]\.contributions\[0\]\.contributions\[0\]$/);
      expect(result.rightPath).toMatch(/^boomerForecastV3Requests\[0\]\.parameters\.accountParams\[1\]\.contributions\[0\]\.contributions\[0\]$/);
      
      console.log('✅ PathResolution correctly resolved array indices for Diffs #1-5');
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

  describe('Diff #6 - Extra Contribution Removal', () => {
    
    it('should resolve Diff #6 extra contribution removal to correct location', () => {
      console.log('🧪 Testing Diff #6 path resolution for removed extra contribution');
      
      // Find the real Diff #6 - extra contribution removal
      const diff6 = compareResult.diffs.find(diff => 
        diff.idBasedPath.includes('45626988::2_prtcpnt-extra_0') &&
        diff.type === 'removed'
      );
      
      expect(diff6).toBeTruthy();
      expect(diff6!.type).toBe('removed');
      
      console.log('✅ Found real Diff #6:', diff6!.idBasedPath);

      // Test the core path resolution logic
      const result = resolveIdBasedPathToNumeric(
        diff6!.idBasedPath,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      console.log('📍 Diff #6 PathResolution results:');
      console.log(`  Left path: ${result.leftPath}`);
      console.log(`  Right path: ${result.rightPath}`);
      
      // CRITICAL ASSERTIONS: For removed items
      
      // Left panel: Should resolve to the correct index where the extra contribution exists
      expect(result.leftPath).toContain('contributions[1]');
      expect(result.leftPath).toMatch(/^boomerForecastV3Requests\[0\]\.parameters\.accountParams\[1\]\.contributions\[1\]$/);
      
      // Right panel: Should be null or not found (item doesn't exist)
      expect(result.rightPath).toBeNull();
      
      console.log('✅ PathResolution correctly handled removed object for Diff #6');
    });

    it('should handle array element access for GoToDiff navigation', () => {
      // Test accessing specific array element (e.g., contributions[0])
      const arrayElementPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions[0]';
      
      const result = resolveIdBasedPathToNumeric(
        arrayElementPath,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      // Should resolve to specific array indices
      expect(result.leftPath).toContain('contributions[1].contributions[0]');
      expect(result.rightPath).toContain('contributions[2].contributions[0]');
      
      console.log('✅ Array element access resolved correctly');
    });
  });

  describe('Diff #7 - Catchup ContributionType Change', () => {
    
    it('should resolve Diff #7 catchup contributionType change to correct location', () => {
      console.log('🧪 Testing Diff #7 path resolution for catchup contributionType change');
      
      // Find the real Diff #7 - catchup contributionType change
      const diff7 = compareResult.diffs.find(diff => 
        diff.idBasedPath.includes('45626988::2_prtcpnt-catchup-50-separate_0') &&
        diff.idBasedPath.includes('contributionType') &&
        diff.type === 'changed'
      );
      
      expect(diff7).toBeTruthy();
      expect(diff7!.type).toBe('changed');
      expect(diff7!.value1).toBe('CATCH_UP_50_SEPARATE_PRE_TAX');
      expect(diff7!.value2).toBe('CATCH_UP_50_SEPARATE_AFTER_TAX');
      
      console.log('✅ Found real Diff #7:', diff7!.idBasedPath);

      // Test the core path resolution logic
      const result = resolveIdBasedPathToNumeric(
        diff7!.idBasedPath,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      console.log('📍 Diff #7 PathResolution results:');
      console.log(`  Left path: ${result.leftPath}`);
      console.log(`  Right path: ${result.rightPath}`);
      
      // CRITICAL ASSERTIONS: For contributionType change
      
      // Left panel: catchup contribution is at index 2 in new data structure
      expect(result.leftPath).toContain('contributions[2].contributionType');
      expect(result.leftPath).toMatch(/^boomerForecastV3Requests\[0\]\.parameters\.accountParams\[1\]\.contributions\[2\]\.contributionType$/);
      
      // Right panel: catchup contribution is at index 1 in new data structure
      expect(result.rightPath).toContain('contributions[1].contributionType');
      expect(result.rightPath).toMatch(/^boomerForecastV3Requests\[0\]\.parameters\.accountParams\[1\]\.contributions\[1\]\.contributionType$/);
      
      console.log('✅ PathResolution correctly handled contributionType change for Diff #7');
    });
    
    it('should resolve Diff #8 added contribution object to correct location', () => {
      console.log('🧪 Testing Diff #8 path resolution for added contribution object');
      
      // Find the real Diff #8 - added contribution object
      const diff8 = compareResult.diffs.find(diff => 
        diff.idBasedPath.includes('45626988::2_prtcpnt-after_0') &&
        diff.type === 'added'
      );
      
      expect(diff8).toBeTruthy();
      expect(diff8!.type).toBe('added');
      
      console.log('✅ Found real Diff #8:', diff8!.idBasedPath);

      // Test the core path resolution logic
      const result = resolveIdBasedPathToNumeric(
        diff8!.idBasedPath,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      console.log('📍 Diff #8 PathResolution results:');
      console.log(`  Left path: ${result.leftPath}`);
      console.log(`  Right path: ${result.rightPath}`);
      
      // CRITICAL ASSERTIONS: For added items
      
      // Left panel: Should be null or not found (item doesn't exist)
      expect(result.leftPath).toBeNull();
      
      // Right panel: Added contribution should be at index 2 in new data structure  
      expect(result.rightPath).toContain('contributions[2]');
      expect(result.rightPath).toMatch(/^boomerForecastV3Requests\[0\]\.parameters\.accountParams\[1\]\.contributions\[2\]$/);
      
      console.log('✅ PathResolution correctly handled added object for Diff #8');
    });

    it('should handle deep nested path resolution for added objects', () => {
      // Test accessing property of added object
      const deepPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-after_0].contributionType';
      
      const result = resolveIdBasedPathToNumeric(
        deepPath,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      // Left should be null (object doesn't exist)
      expect(result.leftPath).toBeNull();
      
      // Right should resolve to property of added object
      expect(result.rightPath).toContain('contributions[0].contributionType');
      
      console.log('✅ Deep nested path for added object resolved correctly');
    });
  });

  describe('syncToCounterpart Functionality Tests', () => {
    
    it('should test syncToCounterpart logic for Diff #1 from left panel', () => {
      console.log('🧪 Testing syncToCounterpart logic for Diff #1');
      
      // Simulate left panel node path for contributionType
      const leftNodePath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributionType';
      
      // This should resolve to the counterpart in right panel
      const result = resolveIdBasedPathToNumeric(
        leftNodePath,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      console.log('📍 syncToCounterpart Diff #1 results:');
      console.log(`  Left (source): ${result.leftPath}`);
      console.log(`  Right (target): ${result.rightPath}`);
      
      // Verify syncToCounterpart would find correct counterpart
      expect(result.leftPath).toContain('contributions[0].contributionType');
      expect(result.rightPath).toContain('contributions[1].contributionType');
      
      // Both should be well-formed paths
      expect(result.leftPath).toMatch(/contributionType$/);
      expect(result.rightPath).toMatch(/contributionType$/);
      
      console.log('✅ syncToCounterpart logic works for Diff #1');
    });

    it('should test syncToCounterpart logic for Diff #2 from left panel', () => {
      console.log('🧪 Testing syncToCounterpart logic for Diff #2');
      
      // Simulate left panel node path for contributions array
      const leftNodePath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions';
      
      const result = resolveIdBasedPathToNumeric(
        leftNodePath,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      console.log('📍 syncToCounterpart Diff #2 results:');
      console.log(`  Left (source): ${result.leftPath}`);
      console.log(`  Right (target): ${result.rightPath}`);
      
      // Verify array correlation works
      expect(result.leftPath).toContain('contributions[1].contributions');
      expect(result.rightPath).toContain('contributions[2].contributions');
      
      console.log('✅ syncToCounterpart logic works for Diff #2');
    });

    it('should test syncToCounterpart logic for Diff #7 from left panel', () => {
      console.log('🧪 Testing syncToCounterpart logic for Diff #7 (missing counterpart)');
      
      // Simulate left panel trying to sync to right-only object
      const rightOnlyPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-after_0]';
      
      const result = resolveIdBasedPathToNumeric(
        rightOnlyPath,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      console.log('📍 syncToCounterpart Diff #7 results:');
      console.log(`  Left (source): ${result.leftPath}`);
      console.log(`  Right (target): ${result.rightPath}`);
      
      // Left should be null (doesn't exist)
      expect(result.leftPath).toBeNull();
      // Right should resolve correctly
      expect(result.rightPath).toContain('contributions[0]');
      
      console.log('✅ syncToCounterpart gracefully handles missing counterpart');
    });

    it('should handle syncToCounterpart for array elements', () => {
      // Test syncing specific array element
      const arrayElementPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions[2]';
      
      const result = resolveIdBasedPathToNumeric(
        arrayElementPath,
        { left: leftData, right: rightData },
        combinedIdKeys
      );
      
      // Should resolve array element indices correctly
      expect(result.leftPath).toContain('contributions[1].contributions[2]');
      expect(result.rightPath).toContain('contributions[2].contributions[2]');
      
      console.log('✅ syncToCounterpart works for array elements');
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