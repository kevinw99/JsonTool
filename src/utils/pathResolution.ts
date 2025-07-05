import { convertIdPathToIndexPath, type PathConversionContext } from './PathConverter';
import { createIdBasedPath } from './PathTypes';
import type { IdKeyInfo } from './jsonCompare';

/**
 * Resolves an ID-based path to numeric paths for both left and right JSON data.
 * Uses the PathConverter utility for consistent path conversion logic.
 * 
 * @param idBasedPath - The ID-based path to resolve (e.g., "accountParams[id=123].contributions[id=456]")
 * @param jsonData - Object containing left and right JSON data
 * @param idKeysUsed - Array of ID key information for path conversion
 * @returns Object with leftPath and rightPath as numeric paths, or null if conversion fails
 */
export function resolveIdBasedPathToNumeric(
  idBasedPath: string,
  jsonData: { left: any; right: any },
  idKeysUsed: IdKeyInfo[]
): { leftPath: string | null; rightPath: string | null } {
  
  // Create path conversion contexts for each side
  const leftContext: PathConversionContext = {
    jsonData: jsonData.left,
    idKeysUsed: idKeysUsed
  };
  
  const rightContext: PathConversionContext = {
    jsonData: jsonData.right,
    idKeysUsed: idKeysUsed
  };
  
  // Ensure the path has proper format for PathConverter
  const formattedPath = idBasedPath.startsWith('root.') ? idBasedPath : `root.${idBasedPath}`;
  
  try {
    // Convert ID-based path to numeric path for left side
    const leftPath = convertIdPathToIndexPath(
      createIdBasedPath(formattedPath),
      leftContext,
      { 
        removeAllPrefixes: true  // Return clean numeric path without prefixes
      }
    );
    
    // Convert ID-based path to numeric path for right side
    const rightPath = convertIdPathToIndexPath(
      createIdBasedPath(formattedPath),
      rightContext,
      {
        removeAllPrefixes: true  // Return clean numeric path without prefixes
      }
    );
    
    return { leftPath, rightPath };
    
  } catch (error) {
    console.error('[pathResolution] ❌ Error during path conversion:', error);
    return { leftPath: null, rightPath: null };
  }
}

/**
 * Helper function to resolve a single ID-based path for one side.
 * Useful for cases where you only need one side's conversion.
 */
export function resolveIdBasedPathForSingleSide(
  idBasedPath: string,
  jsonData: any,
  idKeysUsed: IdKeyInfo[]
): string | null {
  const context: PathConversionContext = {
    jsonData: jsonData,
    idKeysUsed: idKeysUsed
  };
  
  const formattedPath = idBasedPath.startsWith('root.') ? idBasedPath : `root.${idBasedPath}`;
  
  try {
    const numericPath = convertIdPathToIndexPath(
      createIdBasedPath(formattedPath),
      context,
      {
        removeAllPrefixes: true
      }
    );
    
    return numericPath;
  } catch (error) {
    console.error('[pathResolution] ❌ Single side conversion error:', error);
    return null;
  }
}