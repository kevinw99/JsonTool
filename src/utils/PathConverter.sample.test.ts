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
import { createNumericPath, createIdBasedPath } from './PathTypes';
import { generateCombinedIdKeys } from './idKeyUtils';
import type { IdKeyInfo } from './jsonCompare';
import fs from 'fs';
import path from 'path';

/**
 * Load test data from sample1.json and sample2.json files
 */
function loadSampleData(): { sampleData: any, sampleDataRight: any } {
  const leftPath = path.resolve(__dirname, '../../public/sample1.json');
  const rightPath = path.resolve(__dirname, '../../public/sample2.json');
  
  const sampleData = JSON.parse(fs.readFileSync(leftPath, 'utf8'));
  const sampleDataRight = JSON.parse(fs.readFileSync(rightPath, 'utf8'));
  
  return { sampleData, sampleDataRight };
}

const { sampleData, sampleDataRight } = loadSampleData();

// Expected ID keys based on sample1.json and sample2.json structure
const expectedIdKeys: IdKeyInfo[] = [
  {
    arrayPath: "legacySavingsSlidersResponse.savingsSliders[]",
    idKey: "accountId",
    isComposite: false,
    arraySize1: 3,
    arraySize2: 3
  },
  {
    arrayPath: "legacySavingsSlidersResponse.savingsSliders[].savingsNotches[]",
    idKey: "takeHomePayChange",
    isComposite: false,
    arraySize1: 1,
    arraySize2: 1
  }
];

describe('PathConverter with Sample Data', () => {
  let leftContext: PathConversionContext;
  let rightContext: PathConversionContext;

  beforeEach(() => {
    leftContext = {
      jsonData: sampleData,
      idKeysUsed: expectedIdKeys
    };
    rightContext = {
      jsonData: sampleDataRight,
      idKeysUsed: expectedIdKeys
    };
  });

  describe('Dual-key ID path conversion', () => {
    it('should handle path with two ID-based segments', () => {
      const idPath = createIdBasedPath('legacySavingsSlidersResponse.savingsSliders[accountId=45626988::1].savingsNotches[takeHomePayChange=0].externalId');
      
      console.log('Testing dual-key path:', idPath);
      console.log('Left context has data:', !!leftContext.jsonData);
      console.log('Right context has data:', !!rightContext.jsonData);
      
      // Test left conversion
      const leftResult = convertIdPathToViewerPath(idPath, leftContext, 'left');
      console.log('Left conversion result:', leftResult);
      
      // Test right conversion  
      const rightResult = convertIdPathToViewerPath(idPath, rightContext, 'right');
      console.log('Right conversion result:', rightResult);
      
      // Both should succeed if the IDs exist in both datasets
      expect(leftResult).not.toBeNull();
      expect(rightResult).not.toBeNull();
      
      if (leftResult) {
        expect(leftResult).toMatch(/^left_/);
        expect(leftResult).toContain('legacySavingsSlidersResponse.savingsSliders');
        expect(leftResult).toContain('savingsNotches');
        expect(leftResult).toContain('externalId');
      }
      
      if (rightResult) {
        expect(rightResult).toMatch(/^right_/);
        expect(rightResult).toContain('legacySavingsSlidersResponse.savingsSliders');
        expect(rightResult).toContain('savingsNotches');
        expect(rightResult).toContain('externalId');
      }
    });

    it('should convert ID path to index path for dual-key segments', () => {
      const idPath = createIdBasedPath('legacySavingsSlidersResponse.savingsSliders[accountId=45626988::1].savingsNotches[takeHomePayChange=0].externalId');
      
      // Test left conversion
      const leftResult = convertIdPathToIndexPath(idPath, leftContext);
      console.log('Left ID to index conversion:', leftResult);
      
      // Test right conversion
      const rightResult = convertIdPathToIndexPath(idPath, rightContext);
      console.log('Right ID to index conversion:', rightResult);
      
      // Should produce numeric indices
      expect(leftResult).not.toBeNull();
      expect(rightResult).not.toBeNull();
      
      if (leftResult) {
        expect(leftResult).toMatch(/legacySavingsSlidersResponse\.savingsSliders\[\d+\]\.savingsNotches\[\d+\]\.externalId/);
      }
      
      if (rightResult) {
        expect(rightResult).toMatch(/legacySavingsSlidersResponse\.savingsSliders\[\d+\]\.savingsNotches\[\d+\]\.externalId/);
      }
    });

    it('should handle first level ID conversion', () => {
      const idPath = createIdBasedPath('legacySavingsSlidersResponse.savingsSliders[accountId=45626988::1]');
      
      const leftResult = convertIdPathToIndexPath(idPath, leftContext);
      const rightResult = convertIdPathToIndexPath(idPath, rightContext);
      
      console.log('First level conversion - Left:', leftResult);
      console.log('First level conversion - Right:', rightResult);
      
      expect(leftResult).not.toBeNull();
      expect(rightResult).not.toBeNull();
    });

    it('should handle second level ID conversion', () => {
      const idPath = createIdBasedPath('legacySavingsSlidersResponse.savingsSliders[accountId=45626988::1].savingsNotches[takeHomePayChange=0]');
      
      const leftResult = convertIdPathToIndexPath(idPath, leftContext);
      const rightResult = convertIdPathToIndexPath(idPath, rightContext);
      
      console.log('Second level conversion - Left:', leftResult);
      console.log('Second level conversion - Right:', rightResult);
      
      expect(leftResult).not.toBeNull();
      expect(rightResult).not.toBeNull();
    });

    it('should fail gracefully with non-existent IDs', () => {
      const idPath = createIdBasedPath('legacySavingsSlidersResponse.savingsSliders[accountId=NONEXISTENT].savingsNotches[takeHomePayChange=0].externalId');
      
      const leftResult = convertIdPathToViewerPath(idPath, leftContext, 'left');
      const rightResult = convertIdPathToViewerPath(idPath, rightContext, 'right');
      
      console.log('Non-existent ID conversion - Left:', leftResult);
      console.log('Non-existent ID conversion - Right:', rightResult);
      
      // Should return null for non-existent IDs
      expect(leftResult).toBeNull();
      expect(rightResult).toBeNull();
    });
  });

  describe('Data exploration', () => {
    it('should explore the structure of sample data', () => {
      console.log('=== LEFT DATA STRUCTURE ===');
      console.log('Keys:', Object.keys(sampleData));
      console.log('legacySavingsSlidersResponse keys:', Object.keys(sampleData.legacySavingsSlidersResponse || {}));
      
      if (sampleData.legacySavingsSlidersResponse?.savingsSliders) {
        console.log('savingsSliders length:', sampleData.legacySavingsSlidersResponse.savingsSliders.length);
        console.log('First savingsSlider keys:', Object.keys(sampleData.legacySavingsSlidersResponse.savingsSliders[0] || {}));
        console.log('First savingsSlider accountId:', sampleData.legacySavingsSlidersResponse.savingsSliders[0]?.accountId);
        
        if (sampleData.legacySavingsSlidersResponse.savingsSliders[0]?.savingsNotches) {
          console.log('First savingsNotches length:', sampleData.legacySavingsSlidersResponse.savingsSliders[0].savingsNotches.length);
          console.log('First savingsNotch keys:', Object.keys(sampleData.legacySavingsSlidersResponse.savingsSliders[0].savingsNotches[0] || {}));
          console.log('First savingsNotch takeHomePayChange:', sampleData.legacySavingsSlidersResponse.savingsSliders[0].savingsNotches[0]?.takeHomePayChange);
        }
      }
      
      console.log('=== RIGHT DATA STRUCTURE ===');
      console.log('Keys:', Object.keys(sampleDataRight));
      console.log('legacySavingsSlidersResponse keys:', Object.keys(sampleDataRight.legacySavingsSlidersResponse || {}));
      
      if (sampleDataRight.legacySavingsSlidersResponse?.savingsSliders) {
        console.log('savingsSliders length:', sampleDataRight.legacySavingsSlidersResponse.savingsSliders.length);
        console.log('First savingsSlider keys:', Object.keys(sampleDataRight.legacySavingsSlidersResponse.savingsSliders[0] || {}));
        console.log('First savingsSlider accountId:', sampleDataRight.legacySavingsSlidersResponse.savingsSliders[0]?.accountId);
      }
    });
  });
});