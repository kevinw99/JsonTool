import { convertIdPathToIndexPath, convertIdPathToViewerPath, type PathConversionContext } from './PathConverter';
import { createIdBasedPath } from './PathTypes';
import type { IdKeyInfo } from './jsonCompare';


/**
 * Enhanced correlation function that finds matching ID values between left and right sides.
 * For array pattern paths like "accounts[]", finds the first ID value that exists on both sides.
 * 
 * @param arrayPatternPath - Array pattern path like "boomerForecastV3Requests[].household.accounts[]"
 * @param jsonData - Object containing left and right JSON data
 * @param idKeysUsed - Array of ID key information
 * @returns Object with leftPath and rightPath pointing to matching ID values, or null if no matches
 */
export function resolveArrayPatternToMatchingElements(
  arrayPatternPath: string,
  jsonData: { left: any; right: any },
  idKeysUsed: IdKeyInfo[]
): { leftPath: string | null; rightPath: string | null; matchingId?: string } {
  
  try {
    // Find the ID key for this array pattern
    const cleanPath = arrayPatternPath.replace(/^root\./, '');
    const arrayIdKey = idKeysUsed?.find(info => info.arrayPath === cleanPath)?.idKey;
    
    if (!arrayIdKey) {
      console.log('[pathResolution] ⚠️ No ID key found for array pattern:', arrayPatternPath);
      // Fall back to basic resolution - return simple fallback paths
      return { leftPath: null, rightPath: null };
    }
    
    console.log('[pathResolution] 🔍 Found ID key for correlation:', arrayIdKey);
    
    // Get arrays from both sides
    const leftArray = getArrayFromPattern(arrayPatternPath, jsonData.left);
    const rightArray = getArrayFromPattern(arrayPatternPath, jsonData.right);
    
    if (!leftArray || !rightArray) {
      console.log('[pathResolution] ⚠️ Could not find arrays on both sides');
      return { leftPath: null, rightPath: null };
    }
    
    // Extract ID values from both arrays
    const leftIds = leftArray.map((item: any, index: number) => ({ 
      id: item?.[arrayIdKey], 
      index 
    })).filter(item => item.id !== undefined);
    
    const rightIds = rightArray.map((item: any, index: number) => ({ 
      id: item?.[arrayIdKey], 
      index 
    })).filter(item => item.id !== undefined);
    
    console.log('[pathResolution] 📊 Left IDs:', leftIds.map(item => item.id));
    console.log('[pathResolution] 📊 Right IDs:', rightIds.map(item => item.id));
    
    // Find first matching ID value
    for (const leftItem of leftIds) {
      const rightItem = rightIds.find(r => r.id === leftItem.id);
      if (rightItem) {
        // Found matching ID - build paths to these specific elements
        // Convert pattern like "boomerForecastV3Requests[].household.accounts[]" 
        // to "boomerForecastV3Requests[0].household.accounts[X]" where X is the specific index
        
        // Replace all [] except the last one with [0], then remove the last []
        const parts = arrayPatternPath.split('[]');
        let basePath = '';
        for (let i = 0; i < parts.length - 1; i++) {
          basePath += parts[i];
          if (i < parts.length - 2) {
            basePath += '[0]'; // Replace intermediate [] with [0]
          }
          // Don't add anything for the last [] - we'll add the specific index
        }
        
        const leftPath = `${basePath}[${leftItem.index}]`;
        const rightPath = `${basePath}[${rightItem.index}]`;
        
        console.log('[pathResolution] ✅ Found matching ID:', leftItem.id);
        console.log('[pathResolution] ✅ Left path:', leftPath);
        console.log('[pathResolution] ✅ Right path:', rightPath);
        
        return { 
          leftPath, 
          rightPath, 
          matchingId: String(leftItem.id) 
        };
      }
    }
    
    console.log('[pathResolution] ⚠️ No matching ID values found between sides');
    // Fall back to first elements if no matches
    const parts = arrayPatternPath.split('[]');
    let basePath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      basePath += parts[i];
      if (i < parts.length - 2) {
        basePath += '[0]'; // Replace intermediate [] with [0]
      }
    }
    
    return {
      leftPath: leftArray.length > 0 ? `${basePath}[0]` : null,
      rightPath: rightArray.length > 0 ? `${basePath}[0]` : null
    };
    
  } catch (error) {
    console.error('[pathResolution] ❌ Error during array pattern correlation:', error);
    return { leftPath: null, rightPath: null };
  }
}

/**
 * Helper function to get array from pattern path
 */
function getArrayFromPattern(arrayPatternPath: string, jsonData: any): any[] | null {
  try {
    // Convert pattern like "boomerForecastV3Requests[].household.accounts[]" to path
    const pathSegments = arrayPatternPath.replace(/^root\./, '').replace(/\[\]$/, '').split('.');
    
    let current = jsonData;
    for (const segment of pathSegments) {
      if (segment.includes('[]')) {
        // Handle array segment like "boomerForecastV3Requests[]"
        const arrayName = segment.replace('[]', '');
        current = current?.[arrayName];
        if (Array.isArray(current) && current.length > 0) {
          current = current[0]; // Navigate to first element for nested arrays
        } else {
          return null;
        }
      } else {
        current = current?.[segment];
      }
    }
    
    return Array.isArray(current) ? current : null;
  } catch (error) {
    console.error('[pathResolution] ❌ Error getting array from pattern:', error);
    return null;
  }
}



/**
 * Convert IdBasedPath to ViewerPath with full ID resolution support
 * This function handles ID-based paths that contain [id=value] segments by resolving them to numeric paths.
 * 
 * @param idBasedPath - The viewer-agnostic IdBasedPath to convert
 * @param viewerId - The target viewer ID ('left' or 'right')  
 * @param jsonData - Object containing left and right JSON data for ID resolution
 * @param idKeysUsed - Array of ID key information for path conversion
 * @returns ViewerPath string for the specified viewer, or null if conversion fails
 */
export function idBasedPathToViewerPathWithResolution(
  idBasedPath: string,
  viewerId: 'left' | 'right',
  jsonData: { left: any; right: any },
  idKeysUsed: IdKeyInfo[]
): string | null {
  
  try {
    // Check if path has ID-based segments like [id=value]
    const hasIdSegments = /\[[^=\]]+=[^\]]+\]/.test(idBasedPath);
    
    // If the path is purely numeric, convert directly
    if (!hasIdSegments) {
      return `${viewerId}_${idBasedPath}`;
    }
    
    // If the path has ID-based segments, resolve using convertIdPathToViewerPath
    if (hasIdSegments) {
      const context: PathConversionContext = {
        jsonData: jsonData[viewerId],
        idKeysUsed: idKeysUsed
      };
      
      const viewerPath = convertIdPathToViewerPath(
        createIdBasedPath(idBasedPath),
        context,
        viewerId
      );
      
      if (viewerPath) {
        return viewerPath;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error(`[pathResolution] ❌ Failed to convert IdBasedPath to ViewerPath for ${viewerId}:`, error);
    return null;
  }
}

