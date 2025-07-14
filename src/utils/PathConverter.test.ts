import { 
  convertIdPathToIndexPath, 
  convertIdPathToViewerPath,
  convertIndexPathToIdPath, 
  viewerPathToIdBasedPath,
  stripAllPrefixes,
  arePathsEquivalent,
  extractViewerPrefix,
  removeViewerPrefix,
  addViewerPrefix,
  matchesWildcardPattern,
  getExpansionPaths,
  getParentPath,
  validateConversionRequirements,
  type PathConversionContext 
} from './PathConverter';
import type { NumericPath, IdBasedPath, AnyPath } from './PathTypes';
import { createNumericPath, createIdBasedPath, unsafeIdBasedPath, unsafeNumericPath } from './PathTypes';
import { generateCombinedIdKeys } from './idKeyUtils';
import type { IdKeyInfo } from './jsonCompare';
import fs from 'fs';
import path from 'path';

/**
 * Load test data from external JSON files
 */
function loadTestData(): { sampleData: any, sampleDataRight: any } {
  const leftPath = path.resolve(__dirname, '../../public/simple1.json');
  const rightPath = path.resolve(__dirname, '../../public/simple2.json');
  
  const sampleData = JSON.parse(fs.readFileSync(leftPath, 'utf8'));
  const sampleDataRight = JSON.parse(fs.readFileSync(rightPath, 'utf8'));
  
  return { sampleData, sampleDataRight };
}

const { sampleData, sampleDataRight } = loadTestData();

// Expected ID keys based on simple1.json and simple2.json structure
const expectedIdKeys = [
  {
    arrayPath: "boomerForecastV3Requests[].parameters.accountParams[]",
    idKey: "id",
    isComposite: false,
    arraySize1: 2,
    arraySize2: 2
  },
  {
    arrayPath: "boomerForecastV3Requests[].parameters.accountParams[].contributions[]",
    idKey: "id",
    isComposite: false,
    arraySize1: 3,
    arraySize2: 3
  },
  {
    arrayPath: "zzCustomDataSets[]",
    idKey: "name",
    isComposite: false,
    arraySize1: 2,
    arraySize2: 2
  },
  {
    arrayPath: "zzCustomDataSets[].metrics[]",
    idKey: "metricCode",
    isComposite: false,
    arraySize1: 2,
    arraySize2: 3
  },
  {
    arrayPath: "zzUserProfiles[]",
    idKey: "lastLogin",
    isComposite: false,
    arraySize1: 2,
    arraySize2: 3
  }
];

// Use real ID key detection for tests to ensure consistency with actual application behavior
const idKeysUsed = generateCombinedIdKeys(sampleData, sampleDataRight);

describe('PathConverter', () => {
  const contextLeft: PathConversionContext = {
    jsonData: sampleData,
    idKeysUsed: idKeysUsed
  };
  
  const contextRight: PathConversionContext = {
    jsonData: sampleDataRight,
    idKeysUsed: idKeysUsed
  };

  describe('convertIdPathToIndexPath', () => {
    test('converts account params ID path to index path', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('converts nested contribution ID path to index path (left panel)', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2]');
    });

    test('converts nested contribution ID path to index path (right panel)', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0]');
      const indexPath = convertIdPathToIndexPath(idPath, contextRight);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1]');
    });

    test('converts contributionType property path', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributionType');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2].contributionType');
    });

    test('converts array element within contributions', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions[0]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0].contributions[0]');
    });

    test('preserves root prefix during conversion', () => {
      const idPath: IdBasedPath = createIdBasedPath('root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('root.boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('preserves viewer prefix during conversion', () => {
      const idPath: IdBasedPath = createIdBasedPath('root_left_boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('root_left_boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('preserves complex prefix during conversion', () => {
      const idPath: IdBasedPath = createIdBasedPath('root_right_root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('root_right_root.boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('no prefix in, no prefix out', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('changes viewer prefix when targetViewer specified', () => {
      const idPath: IdBasedPath = createIdBasedPath('root_left_boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft, { targetViewer: 'right' });
      expect(indexPath).toBe('root_right_boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('removes all prefixes when specified', () => {
      const idPath: IdBasedPath = createIdBasedPath('root_left_root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft, { removeAllPrefixes: true });
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('adds root prefix when specified', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft, { addRoot: true });
      expect(indexPath).toBe('root.boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('returns null for non-existent ID', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=NONEXISTENT]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBeNull();
    });
  });

  describe('convertIndexPathToIdPath', () => {
    test('converts account params index path to ID path', () => {
      const indexPath: NumericPath = createNumericPath('boomerForecastV3Requests[0].parameters.accountParams[1]');
      const idPath = convertIndexPathToIdPath(indexPath, contextLeft);
      expect(idPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]');
    });

    test('converts nested contribution index path to ID path', () => {
      const indexPath: NumericPath = createNumericPath('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0]');
      const idPath = convertIndexPathToIdPath(indexPath, contextLeft);
      expect(idPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0]');
    });

    test('preserves property names after arrays', () => {
      const indexPath: NumericPath = createNumericPath('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2].contributionType');
      const idPath = convertIndexPathToIdPath(indexPath, contextLeft);
      expect(idPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributionType');
    });

    test('handles arrays without ID keys', () => {
      const indexPath: NumericPath = createNumericPath('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0].contributions[0]');
      const idPath = convertIndexPathToIdPath(indexPath, contextLeft);
      // The inner contributions array doesn't have ID keys, so it stays as index
      expect(idPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions[0]');
    });
  });


  describe('stripAllPrefixes', () => {
    test('removes root prefix', () => {
      const path: AnyPath = createIdBasedPath('root.users[0].name');
      expect(stripAllPrefixes(path)).toBe('users[0].name');
    });

    test('removes viewer prefix', () => {
      const path: AnyPath = createIdBasedPath('left_users[0].name');
      expect(stripAllPrefixes(path)).toBe('users[0].name');
    });

    test('removes both prefixes', () => {
      const path: AnyPath = createIdBasedPath('right_root.users[0].name');
      expect(stripAllPrefixes(path)).toBe('users[0].name');
    });

    test('handles root as complete path', () => {
      const path: AnyPath = createIdBasedPath('root');
      expect(stripAllPrefixes(path)).toBe('');
    });

    test('leaves unprefixed paths unchanged', () => {
      const path: AnyPath = createIdBasedPath('users[0].name');
      expect(stripAllPrefixes(path)).toBe('users[0].name');
    });
  });

  describe('arePathsEquivalent', () => {
    test('recognizes identical paths', () => {
      const path1: AnyPath = createIdBasedPath('users[0].name');
      const path2: AnyPath = createIdBasedPath('users[0].name');
      expect(arePathsEquivalent(path1, path2)).toBe(true);
    });

    test('recognizes paths with different prefixes as equivalent', () => {
      const path1: AnyPath = createIdBasedPath('root.users[0].name');
      const path2: AnyPath = createIdBasedPath('users[0].name');
      expect(arePathsEquivalent(path1, path2)).toBe(true);
    });

    test('recognizes ID and index paths as equivalent with context', () => {
      const path1: AnyPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]');
      const path2: AnyPath = createNumericPath('boomerForecastV3Requests[0].parameters.accountParams[1]');
      expect(arePathsEquivalent(path1, path2, contextLeft)).toBe(true);
    });

    test('recognizes non-equivalent paths', () => {
      const path1: AnyPath = createIdBasedPath('users[0].name');
      const path2: AnyPath = createIdBasedPath('users[1].name');
      expect(arePathsEquivalent(path1, path2)).toBe(false);
    });

    test('handles complex nested paths', () => {
      const path1: AnyPath = createIdBasedPath('root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0]');
      const path2: AnyPath = createNumericPath('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0]');
      expect(arePathsEquivalent(path1, path2, contextLeft)).toBe(true);
    });
  });

  describe('Simple1/Simple2 data tests', () => {
    test('removed extra contribution (left panel only)', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-extra_0]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1]');
    });

    test('removed extra contribution (right panel - should not exist)', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-extra_0]');
      const indexPath = convertIdPathToIndexPath(idPath, contextRight);
      expect(indexPath).toBeNull(); // Should not exist in right panel
    });

    test('contributionType change (left: CATCH_UP_50_SEPARATE_PRE_TAX)', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributionType');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2].contributionType');
    });

    test('contributionType change (right: CATCH_UP_50_SEPARATE_AFTER_TAX)', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributionType');
      const indexPath = convertIdPathToIndexPath(idPath, contextRight);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1].contributionType');
    });

    test('added object (right panel only)', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-after_0]');
      const indexPath = convertIdPathToIndexPath(idPath, contextRight);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2]');
    });

    test('added object (left panel - should not exist)', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-after_0]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBeNull(); // Should not exist in left panel
    });

    test('zzCustomDataSets array with name ID', () => {
      const idPath: IdBasedPath = createIdBasedPath('zzCustomDataSets[name=Financial Metrics]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('zzCustomDataSets[0]');
    });

    test('zzUserProfiles array with lastLogin ID', () => {
      const idPath: IdBasedPath = createIdBasedPath('zzUserProfiles[lastLogin=2025-01-15]');
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('zzUserProfiles[0]');
    });

    test('bidirectional conversion test', () => {
      const originalIdPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributionType');
      const expectedIndexPath: NumericPath = createNumericPath('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0].contributionType');
      
      // ID -> Index conversion
      const convertedIndexPath = convertIdPathToIndexPath(originalIdPath, contextLeft);
      
      // Index -> ID conversion  
      const convertedBackToId = convertIndexPathToIdPath(expectedIndexPath, contextLeft);
      
      expect(convertedIndexPath).toBe(expectedIndexPath);
      expect(convertedBackToId).toBe(originalIdPath);
    });
  });

  describe('ID Key Detection Verification', () => {
    test('real ID key detection should match expected static list', () => {
      // Generate actual ID keys using the shared utility
      const actualIdKeys = generateCombinedIdKeys(sampleData, sampleDataRight, { enableLogging: true });
      console.log('✅ Combined actual ID keys:', actualIdKeys);
      console.log('📝 Expected ID keys:', expectedIdKeys);
      
      // Verify the real detection matches our expected list
      expect(actualIdKeys.length).toBe(5);
      expect(actualIdKeys).toEqual(expectedIdKeys);
      
      console.log('✅ Real ID key detection matches expected static list');
    });
    
    test('test data matches expected ID keys', () => {
      // Verify that our test data (idKeysUsed) matches the expected static list
      expect(idKeysUsed).toEqual(expectedIdKeys);
      console.log('✅ Test data matches expected ID keys');
    });
  });

  describe('convertIdPathToViewerPath', () => {
    test('converts ID path to left ViewerPath', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0]');
      const viewerPath = convertIdPathToViewerPath(idPath, contextLeft, 'left');
      expect(viewerPath).toBe('left_root.boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0]');
    });

    test('converts ID path to right ViewerPath', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0]');
      const viewerPath = convertIdPathToViewerPath(idPath, contextLeft, 'right');
      expect(viewerPath).toBe('right_root.boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0]');
    });

    test('handles missing ID values', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=NONEXISTENT]');
      const viewerPath = convertIdPathToViewerPath(idPath, contextLeft, 'left');
      expect(viewerPath).toBeNull();
    });

    test('works with different viewer contexts', () => {
      const idPath: IdBasedPath = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0]');
      
      const leftViewerPath = convertIdPathToViewerPath(idPath, contextLeft, 'left');
      const rightViewerPath = convertIdPathToViewerPath(idPath, contextRight, 'right');
      
      // Same ID should resolve to different indices in left vs right contexts
      expect(leftViewerPath).toBe('left_root.boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2]');
      expect(rightViewerPath).toBe('right_root.boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1]');
    });
  });

  describe('viewerPathToIdBasedPath', () => {
    test('converts left ViewerPath to IdBasedPath', () => {
      const viewerPath = 'left_root.boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0]';
      const idBasedPath = viewerPathToIdBasedPath(viewerPath, { left: sampleData, right: sampleDataRight }, idKeysUsed);
      expect(idBasedPath).toBe('root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0]');
    });

    test('converts right ViewerPath to IdBasedPath', () => {
      const viewerPath = 'right_root.boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1]';
      const idBasedPath = viewerPathToIdBasedPath(viewerPath, { left: sampleData, right: sampleDataRight }, idKeysUsed);
      expect(idBasedPath).toBe('root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0]');
    });

    test('handles ViewerPath without arrays', () => {
      const viewerPath = 'left_root.boomerForecastV3Requests[0].parameters';
      const idBasedPath = viewerPathToIdBasedPath(viewerPath, { left: sampleData, right: sampleDataRight }, idKeysUsed);
      expect(idBasedPath).toBe('root.boomerForecastV3Requests[0].parameters');
    });

    test('handles arrays without ID keys', () => {
      const viewerPath = 'left_root.boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0].contributions[0]';
      const idBasedPath = viewerPathToIdBasedPath(viewerPath, { left: sampleData, right: sampleDataRight }, idKeysUsed);
      // The inner contributions array doesn't have ID keys, so it stays as index
      expect(idBasedPath).toBe('root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions[0]');
    });

    test('bidirectional conversion with ViewerPath', () => {
      const originalViewerPath = 'left_root.boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2]';
      
      // ViewerPath -> IdBasedPath
      const idBasedPath = viewerPathToIdBasedPath(originalViewerPath, { left: sampleData, right: sampleDataRight }, idKeysUsed);
      expect(idBasedPath).toBe('root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0]');
      
      // IdBasedPath -> ViewerPath
      const convertedViewerPath = convertIdPathToViewerPath(createIdBasedPath(idBasedPath!), contextLeft, 'left');
      expect(convertedViewerPath).toBe(originalViewerPath);
    });
  });

  describe('New Utility Functions', () => {
    describe('extractViewerPrefix', () => {
      test('extracts left viewer prefix', () => {
        const path = createIdBasedPath('left_root.accounts[0].name');
        expect(extractViewerPrefix(path)).toBe('left');
      });

      test('extracts right viewer prefix', () => {
        const path = createIdBasedPath('right_root.accounts[0].name');
        expect(extractViewerPrefix(path)).toBe('right');
      });

      test('returns null for path without viewer prefix', () => {
        const path = createIdBasedPath('root.accounts[0].name');
        expect(extractViewerPrefix(path)).toBeNull();
      });

      test('returns null for invalid viewer prefix', () => {
        const path = createIdBasedPath('center_root.accounts[0].name');
        expect(extractViewerPrefix(path)).toBeNull();
      });
    });

    describe('removeViewerPrefix', () => {
      test('removes left viewer prefix', () => {
        const path = createIdBasedPath('left_root.accounts[0].name');
        const result = removeViewerPrefix(path);
        expect(result).toBe('root.accounts[0].name');
      });

      test('removes right viewer prefix', () => {
        const path = createIdBasedPath('right_root.accounts[0].name');
        const result = removeViewerPrefix(path);
        expect(result).toBe('root.accounts[0].name');
      });

      test('leaves path unchanged if no viewer prefix', () => {
        const path = createIdBasedPath('root.accounts[0].name');
        const result = removeViewerPrefix(path);
        expect(result).toBe('root.accounts[0].name');
      });

      test('handles complex viewer prefixes', () => {
        const path = createIdBasedPath('left_boomerForecastV3Requests[0].parameters');
        const result = removeViewerPrefix(path);
        expect(result).toBe('boomerForecastV3Requests[0].parameters');
      });
    });

    describe('addViewerPrefix', () => {
      test('adds left viewer prefix', () => {
        const path = createIdBasedPath('root.accounts[0].name');
        const result = addViewerPrefix(path, 'left');
        expect(result).toBe('left_root.accounts[0].name');
      });

      test('adds right viewer prefix', () => {
        const path = createIdBasedPath('root.accounts[0].name');
        const result = addViewerPrefix(path, 'right');
        expect(result).toBe('right_root.accounts[0].name');
      });

      test('replaces existing viewer prefix', () => {
        const path = createIdBasedPath('left_root.accounts[0].name');
        const result = addViewerPrefix(path, 'right');
        expect(result).toBe('right_root.accounts[0].name');
      });

      test('handles path without root prefix', () => {
        const path = createIdBasedPath('accounts[0].name');
        const result = addViewerPrefix(path, 'left');
        expect(result).toBe('left_accounts[0].name');
      });
    });

    describe('matchesWildcardPattern', () => {
      test('matches exact paths', () => {
        const path = createIdBasedPath('accounts[0].name');
        expect(matchesWildcardPattern(path, 'accounts[0].name')).toBe(true);
      });

      test('matches wildcard array indices', () => {
        const path = createIdBasedPath('accounts[0].name');
        expect(matchesWildcardPattern(path, 'accounts[*].name')).toBe(true);
      });

      test('matches empty array patterns', () => {
        const path = createIdBasedPath('accounts[0].name');
        expect(matchesWildcardPattern(path, 'accounts[].name')).toBe(true);
      });

      test('matches property wildcards', () => {
        const path = createIdBasedPath('accounts[0].name');
        expect(matchesWildcardPattern(path, 'accounts[0].*')).toBe(true);
      });

      test('matches complex patterns', () => {
        const path = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2]');
        expect(matchesWildcardPattern(path, 'boomerForecastV3Requests[*].parameters.accountParams[*].contributions[*]')).toBe(true);
      });

      test('matches ID-based array segments', () => {
        const path = createIdBasedPath('accounts[id=123].name');
        expect(matchesWildcardPattern(path, 'accounts[*].name')).toBe(true);
      });

      test('does not match different patterns', () => {
        const path = createIdBasedPath('accounts[0].name');
        expect(matchesWildcardPattern(path, 'users[0].name')).toBe(false);
      });

      test('ignores viewer prefixes in matching', () => {
        const path = createIdBasedPath('left_root.accounts[0].name');
        // First check what stripAllPrefixes returns
        const stripped = stripAllPrefixes(path);
        console.log('Stripped path:', stripped);
        expect(matchesWildcardPattern(path, 'accounts[*].name')).toBe(true);
      });
    });

    describe('getExpansionPaths', () => {
      test('generates expansion paths for simple path', () => {
        const path = createNumericPath('root.accounts[0].name');
        const result = getExpansionPaths(path);
        expect(result).toEqual([
          'root.accounts',
          'root.accounts[0]',
          'root.accounts[0].name'
        ]);
      });

      test('generates expansion paths with viewer prefix', () => {
        const path = createNumericPath('root.accounts[0].name');
        const result = getExpansionPaths(path, 'left');
        expect(result).toEqual([
          'left_root.accounts',
          'left_root.accounts[0]',
          'left_root.accounts[0].name'
        ]);
      });

      test('handles complex nested paths', () => {
        const path = createNumericPath('root.boomerForecastV3Requests[0].parameters.accountParams[1]');
        const result = getExpansionPaths(path);
        expect(result).toEqual([
          'root.boomerForecastV3Requests',
          'root.boomerForecastV3Requests[0]',
          'root.boomerForecastV3Requests[0].parameters',
          'root.boomerForecastV3Requests[0].parameters.accountParams',
          'root.boomerForecastV3Requests[0].parameters.accountParams[1]'
        ]);
      });

      test('handles path without root prefix', () => {
        const path = createNumericPath('accounts[0].name');
        const result = getExpansionPaths(path);
        expect(result).toEqual([
          'root.accounts',
          'root.accounts[0]',
          'root.accounts[0].name'
        ]);
      });

      test('returns empty array for root-only path', () => {
        const path = createNumericPath('root');
        const result = getExpansionPaths(path);
        expect(result).toEqual([]);
      });

      test('handles multiple array indices', () => {
        const path = createNumericPath('root.data[0].items[1].value');
        const result = getExpansionPaths(path);
        expect(result).toEqual([
          'root.data',
          'root.data[0]',
          'root.data[0].items',
          'root.data[0].items[1]',
          'root.data[0].items[1].value'
        ]);
      });
    });

    describe('getParentPath', () => {
      test('extracts parent from property path', () => {
        const path = createIdBasedPath('root.accounts[0].name');
        const result = getParentPath(path);
        expect(result).toBe('root.accounts[0]');
      });

      test('extracts parent from array element path', () => {
        const path = createIdBasedPath('root.accounts[0]');
        const result = getParentPath(path);
        expect(result).toBe('root.accounts');
      });

      test('extracts parent from nested array path', () => {
        const path = createIdBasedPath('root.data[0].items[1]');
        const result = getParentPath(path);
        expect(result).toBe('root.data[0].items');
      });

      test('extracts parent from ID-based array path', () => {
        const path = createIdBasedPath('root.accounts[id=123].name');
        const result = getParentPath(path);
        expect(result).toBe('root.accounts[id=123]');
      });

      test('returns null for root path', () => {
        const path = createIdBasedPath('root');
        const result = getParentPath(path);
        expect(result).toBeNull();
      });

      test('returns null for single property', () => {
        const path = createIdBasedPath('accounts');
        const result = getParentPath(path);
        expect(result).toBeNull();
      });

      test('handles viewer prefix paths', () => {
        const path = createIdBasedPath('left_root.accounts[0].name');
        const result = getParentPath(path);
        expect(result).toBe('left_root.accounts[0]');
      });

      test('handles complex nested paths', () => {
        const path = createIdBasedPath('boomerForecastV3Requests[0].parameters.accountParams[id=123].contributions[id=456].value');
        const result = getParentPath(path);
        expect(result).toBe('boomerForecastV3Requests[0].parameters.accountParams[id=123].contributions[id=456]');
      });
    });

    describe('validateConversionRequirements', () => {
      test('allows numeric path conversion without context', () => {
        const path = createIdBasedPath('root.accounts[0].name');
        expect(validateConversionRequirements(path, 'numeric')).toBe(true);
      });

      test('requires context for ID-based path conversion', () => {
        const path = createIdBasedPath('root.accounts[id=123].name');
        expect(validateConversionRequirements(path, 'numeric')).toBe(false);
      });

      test('allows ID-based conversion with proper context', () => {
        const path = createIdBasedPath('root.accounts[id=123].name');
        const context = { jsonData: { accounts: [{ id: '123', name: 'test' }] } };
        expect(validateConversionRequirements(path, 'numeric', context)).toBe(true);
      });

      test('requires context for viewer path conversion of ID paths', () => {
        const path = createIdBasedPath('root.accounts[id=123].name');
        expect(validateConversionRequirements(path, 'viewer')).toBe(false);
      });

      test('allows viewer path conversion with context', () => {
        const path = createIdBasedPath('root.accounts[id=123].name');
        const context = { jsonData: { accounts: [{ id: '123', name: 'test' }] } };
        expect(validateConversionRequirements(path, 'viewer', context)).toBe(true);
      });

      test('allows viewer conversion for numeric paths without context', () => {
        const path = createIdBasedPath('root.accounts[0].name');
        expect(validateConversionRequirements(path, 'viewer')).toBe(true);
      });
    });
  });
});