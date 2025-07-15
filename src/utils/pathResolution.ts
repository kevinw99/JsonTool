import { convertArrayPatternToNumericPath, type PathConversionContext } from './PathConverter';
import { createArrayPatternPath } from './PathTypes';
import type { IdKeyInfo } from './jsonCompare';


/**
 * Simplified correlation function using existing PathConverter utilities.
 * Finds matching array elements between left and right sides using convertArrayPatternToNumericPath.
 * 
 * @param arrayPatternPath - Array pattern path like "boomerForecastV3Requests[].parameters.accountParams[]"
 * @param jsonData - Object containing left and right JSON data
 * @param idKeysUsed - Array of ID key information
 * @returns Object with leftPath and rightPath, or null if conversion fails
 */
export function resolveArrayPatternToMatchingElements(
  arrayPatternPath: string,
  jsonData: { left: any; right: any },
  idKeysUsed: IdKeyInfo[]
): { leftPath: string | null; rightPath: string | null; matchingId?: string } {
  
  try {
    // Create contexts for both viewers
    const leftContext: PathConversionContext = {
      jsonData: jsonData.left,
      idKeysUsed: idKeysUsed
    };
    
    const rightContext: PathConversionContext = {
      jsonData: jsonData.right,
      idKeysUsed: idKeysUsed
    };
    
    // Use existing PathConverter utility to resolve array patterns
    const leftPath = convertArrayPatternToNumericPath(
      createArrayPatternPath(arrayPatternPath),
      leftContext
    );
    
    const rightPath = convertArrayPatternToNumericPath(
      createArrayPatternPath(arrayPatternPath),
      rightContext
    );
    
    return { 
      leftPath: leftPath || null, 
      rightPath: rightPath || null 
    };
    
  } catch (error) {
    console.error('[pathResolution] ❌ Error during array pattern correlation:', error);
    return { leftPath: null, rightPath: null };
  }
}





