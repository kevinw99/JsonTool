import { 
  convertIdPathToIndexPath, 
  convertIndexPathToIdPath, 
  stripAllPrefixes,
  arePathsEquivalent,
  type PathConversionContext 
} from './PathConverter';

// Sample data matching the screenshots
const sampleData = {
  boomerForecastV3Requests: [{
    parameters: {
      accountParams: [
        {
          id: "45626988::1",
          managementFee: 0.007212962962963
        },
        {
          id: "45626988::2",
          managementFee: 0.007212962962963,
          contributions: [
            {
              id: "45626988::2_prtcpnt-catchup-50-separate_0",
              contributionType: "CATCH_UP_50_SEPARATE_PRE_TAX", // Left panel
              contributions: [1000, 1000, 1000, 1000, 1000]
            },
            {
              id: "45626988::2_prtcpnt-pre_0",
              contributionType: "PARTICIPANT_PRE_TAX",
              contributions: [7000, 7000, 7000, 7000, 7000] // Left panel values
            }
          ]
        }
      ]
    }
  }]
};

const sampleDataRight = {
  boomerForecastV3Requests: [{
    parameters: {
      accountParams: [
        {
          id: "45626988::1",
          managementFee: 0.007212962962963
        },
        {
          id: "45626988::2",
          managementFee: 0.007212962962963,
          contributions: [
            {
              id: "45626988::2_prtcpnt-after_0",
              contributionType: "PARTICIPANT_AFTER_TAX", // Right panel - ADDED
              contributions: [3500, 3500, 3500, 3500, 3500]
            },
            {
              id: "45626988::2_prtcpnt-catchup-50-separate_0",
              contributionType: "CATCH_UP_50_SEPARATE_AFTER_TAX", // Right panel - CHANGED
              contributions: [1000, 1000, 1000, 1000, 1000]
            },
            {
              id: "45626988::2_prtcpnt-pre_0",
              contributionType: "PARTICIPANT_PRE_TAX",
              contributions: [3500, 3500, 3500, 3500, 3500] // Right panel - CHANGED values
            }
          ]
        }
      ]
    }
  }]
};

const idKeysUsed = [
  {
    arrayPath: "boomerForecastV3Requests[0].parameters.accountParams",
    idKey: "id",
    isComposite: false,
    arraySize1: 2,
    arraySize2: 2
  },
  {
    arrayPath: "boomerForecastV3Requests[0].parameters.accountParams[1].contributions",
    idKey: "id",
    isComposite: false,
    arraySize1: 2,
    arraySize2: 3
  }
];

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
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('converts nested contribution ID path to index path (left panel)', () => {
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0]';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0]');
    });

    test('converts nested contribution ID path to index path (right panel)', () => {
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-after_0]';
      const indexPath = convertIdPathToIndexPath(idPath, contextRight);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0]');
    });

    test('converts contributionType property path', () => {
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributionType';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0].contributionType');
    });

    test('converts array element within contributions', () => {
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions[0]';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1].contributions[0]');
    });

    test('preserves root prefix during conversion', () => {
      const idPath = 'root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('root.boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('preserves viewer prefix during conversion', () => {
      const idPath = 'root_viewer1_boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('root_viewer1_boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('preserves complex prefix during conversion', () => {
      const idPath = 'root_viewer2_root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('root_viewer2_root.boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('no prefix in, no prefix out', () => {
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('changes viewer prefix when targetViewer specified', () => {
      const idPath = 'root_viewer1_boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft, { targetViewer: 'viewer2' });
      expect(indexPath).toBe('root_viewer2_boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('removes all prefixes when specified', () => {
      const idPath = 'root_viewer1_root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft, { removeAllPrefixes: true });
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('adds root prefix when specified', () => {
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft, { addRoot: true });
      expect(indexPath).toBe('root.boomerForecastV3Requests[0].parameters.accountParams[1]');
    });

    test('returns null for non-existent ID', () => {
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=NONEXISTENT]';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBeNull();
    });
  });

  describe('convertIndexPathToIdPath', () => {
    test('converts account params index path to ID path', () => {
      const indexPath = 'boomerForecastV3Requests[0].parameters.accountParams[1]';
      const idPath = convertIndexPathToIdPath(indexPath, contextLeft);
      expect(idPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]');
    });

    test('converts nested contribution index path to ID path', () => {
      const indexPath = 'boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0]';
      const idPath = convertIndexPathToIdPath(indexPath, contextLeft);
      expect(idPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0]');
    });

    test('preserves property names after arrays', () => {
      const indexPath = 'boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0].contributionType';
      const idPath = convertIndexPathToIdPath(indexPath, contextLeft);
      expect(idPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributionType');
    });

    test('handles arrays without ID keys', () => {
      const indexPath = 'boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1].contributions[0]';
      const idPath = convertIndexPathToIdPath(indexPath, contextLeft);
      // The inner contributions array doesn't have ID keys, so it stays as index
      expect(idPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions[0]');
    });
  });


  describe('stripAllPrefixes', () => {
    test('removes root prefix', () => {
      expect(stripAllPrefixes('root.users[0].name')).toBe('users[0].name');
    });

    test('removes viewer prefix', () => {
      expect(stripAllPrefixes('root_viewer1_users[0].name')).toBe('users[0].name');
    });

    test('removes both prefixes', () => {
      expect(stripAllPrefixes('root_viewer2_root.users[0].name')).toBe('users[0].name');
    });

    test('handles root as complete path', () => {
      expect(stripAllPrefixes('root')).toBe('');
    });

    test('leaves unprefixed paths unchanged', () => {
      expect(stripAllPrefixes('users[0].name')).toBe('users[0].name');
    });
  });

  describe('arePathsEquivalent', () => {
    test('recognizes identical paths', () => {
      const path1 = 'users[0].name';
      const path2 = 'users[0].name';
      expect(arePathsEquivalent(path1, path2)).toBe(true);
    });

    test('recognizes paths with different prefixes as equivalent', () => {
      const path1 = 'root.users[0].name';
      const path2 = 'users[0].name';
      expect(arePathsEquivalent(path1, path2)).toBe(true);
    });

    test('recognizes ID and index paths as equivalent with context', () => {
      const path1 = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2]';
      const path2 = 'boomerForecastV3Requests[0].parameters.accountParams[1]';
      expect(arePathsEquivalent(path1, path2, contextLeft)).toBe(true);
    });

    test('recognizes non-equivalent paths', () => {
      const path1 = 'users[0].name';
      const path2 = 'users[1].name';
      expect(arePathsEquivalent(path1, path2)).toBe(false);
    });

    test('handles complex nested paths', () => {
      const path1 = 'root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0]';
      const path2 = 'boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1]';
      expect(arePathsEquivalent(path1, path2, contextLeft)).toBe(true);
    });
  });

  describe('Real highlighting scenarios from screenshots', () => {
    test('Diff #7: contributionType change (left panel)', () => {
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributionType';
      const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0].contributionType');
      
      // This path should be highlighted as "changed"
      expect(indexPath).toBeDefined();
    });

    test('Diff #7: contributionType change (right panel)', () => {
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributionType';
      const indexPath = convertIdPathToIndexPath(idPath, contextRight);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1].contributionType');
      
      // Right panel has different structure - catchup item is at index 1
      expect(indexPath).toBeDefined();
    });

    test('Diffs #8-12: array element changes (left panel)', () => {
      for (let i = 0; i < 5; i++) {
        const idPath = `boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions[${i}]`;
        const indexPath = convertIdPathToIndexPath(idPath, contextLeft);
        expect(indexPath).toBe(`boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1].contributions[${i}]`);
      }
    });

    test('Diffs #8-12: array element changes (right panel)', () => {
      for (let i = 0; i < 5; i++) {
        const idPath = `boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions[${i}]`;
        const indexPath = convertIdPathToIndexPath(idPath, contextRight);
        expect(indexPath).toBe(`boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2].contributions[${i}]`);
      }
    });

    test('Diff #13: added object (right panel only)', () => {
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-after_0]';
      const indexPath = convertIdPathToIndexPath(idPath, contextRight);
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0]');
      
      // This path should be highlighted as "added" in right panel
    });

    test('Added object contributionType (right panel)', () => {
      const idPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-after_0].contributionType';
      const indexPath = convertIdPathToIndexPath(idPath, contextRight);
      
      console.log('🔍 ID-to-Index Conversion Test:');
      console.log('  Input (ID path)  :', idPath);
      console.log('  Output (Index)   :', indexPath);
      console.log('  Expected (Index) :', 'boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0].contributionType');
      
      expect(indexPath).toBe('boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0].contributionType');
    });

    test('Added object array elements (right panel)', () => {
      for (let i = 0; i < 5; i++) {
        const idPath = `boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-after_0].contributions[${i}]`;
        const indexPath = convertIdPathToIndexPath(idPath, contextRight);
        expect(indexPath).toBe(`boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0].contributions[${i}]`);
      }
    });

    test('Bidirectional conversion test (right panel)', () => {
      // Test both directions to show deterministic behavior
      const originalIdPath = 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-after_0].contributionType';
      const expectedIndexPath = 'boomerForecastV3Requests[0].parameters.accountParams[1].contributions[0].contributionType';
      
      // ID -> Index conversion
      const convertedIndexPath = convertIdPathToIndexPath(originalIdPath, contextRight);
      
      // Index -> ID conversion  
      const convertedBackToId = convertIndexPathToIdPath(expectedIndexPath, contextRight);
      
      console.log('🔄 Bidirectional Conversion Test:');
      console.log('  Original ID path     :', originalIdPath);
      console.log('  Converted to Index   :', convertedIndexPath);
      console.log('  Expected Index path  :', expectedIndexPath);
      console.log('  Converted back to ID :', convertedBackToId);
      console.log('  Expected ID path     :', originalIdPath);
      
      expect(convertedIndexPath).toBe(expectedIndexPath);
      expect(convertedBackToId).toBe(originalIdPath);
    });
  });
});