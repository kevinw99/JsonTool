import { jsonCompare } from './jsonCompare';
import type { IdKeyInfo } from './jsonCompare';

/**
 * Generate combined ID keys from two JSON data objects
 * This utility function uses the real jsonCompare function to ensure test data 
 * matches exactly what the real application would generate.
 * 
 * Used by test suites to ensure consistent ID key detection behavior.
 * 
 * @param leftData - JSON data for the left panel
 * @param rightData - JSON data for the right panel
 * @param options - Optional configuration for logging
 * @returns Combined array of IdKeyInfo objects from jsonCompare
 */
export function generateCombinedIdKeys(
  leftData: any, 
  rightData: any,
  options: {
    enableLogging?: boolean;
  } = {}
): IdKeyInfo[] {
  const { enableLogging = false } = options;
  
  if (enableLogging) {
    console.log('🔍 Generating ID keys using real jsonCompare logic...');
  }
  
  // Use the real jsonCompare to get the exact same ID keys that would be generated
  // during actual comparison. We ignore the diffs and just use the idKeysUsed.
  const compareResult = jsonCompare(leftData, rightData);
  
  if (enableLogging) {
    console.log('✅ ID keys from jsonCompare:', compareResult.idKeysUsed);
    console.log(`📊 Total ID keys detected: ${compareResult.idKeysUsed.length}`);
  }
  
  return compareResult.idKeysUsed;
}

// Note: Removed legacy generateIdKeys function
// Only generateCombinedIdKeys is needed - it's more flexible and explicit.