/**
 * Strict Path Type System
 * 
 * Hierarchy:
 * - NumericPath ⊆ IdBasedPath (numeric paths are valid ID-based paths)
 * - IdBasedPath is a superset that includes both [0] and [id=value] formats
 */

// Core branded types - representing the actual format difference
export type NumericPath = string & { __brand: 'NumericPath' };
export type IdBasedPath = string & { __brand: 'IdBasedPath' };

/**
 * ArrayPatternPath - Represents the structural pattern of nested arrays
 * Format: "boomerForecastV3Requests[].parameters.accountParams[].contributions[].contributions[]"
 * - Uses [] to denote array positions (no specific indices or IDs)
 * - Describes the "shape" of nested arrays in JSON data  
 * - The final [] indicates the target array where ID-based comparison occurs
 * - Used as a key for DiffResult grouping and ID key association
 */
export type ArrayPatternPath = string & { __brand: 'ArrayPatternPath' };

// Union type for functions that can accept either
export type AnyPath = NumericPath | IdBasedPath;

// Helper functions to create branded types
export const createNumericPath = (path: string): NumericPath => path as NumericPath;
export const createIdBasedPath = (path: string): IdBasedPath => path as IdBasedPath;
export const createArrayPatternPath = (path: string): ArrayPatternPath => path as ArrayPatternPath;

// Type guards and utility functions
export function hasIdBasedSegments(path: IdBasedPath): boolean {
  // Check if path contains properly formatted ID-based array segments [key=value]
  return /\[[^=\]]+=[^\]]+\]/.test(path);
}

export function isPureNumeric(path: IdBasedPath): boolean {
  // Check if path only contains numeric array indices [0], [1], [2]
  const arraySegments = path.match(/\[[^\]]+\]/g) || [];
  return arraySegments.every(segment => /^\[\d+\]$/.test(segment));
}

export function isNumericPath(path: string): path is NumericPath {
  // Type guard: check if a string is a valid NumericPath
  return isPureNumeric(path as IdBasedPath);
}

export function isIdBasedPath(_path: string): _path is IdBasedPath {
  // Type guard: all strings are potentially IdBasedPath (superset)
  return true;
}

// ArrayPatternPath type guards and utility functions
export function isArrayPatternPath(path: string): path is ArrayPatternPath {
  // Must contain at least one [] and should not contain specific indices or IDs
  return /\[\]/.test(path) && 
         !/\[\d+\]/.test(path) && 
         !/\[[^=\]]+=[^\]]+\]/.test(path);
}

export function isValidArrayPattern(path: string): boolean {
  // Check if path represents a valid array pattern
  // - Must contain at least one []
  // - Should end with [] (target array)
  // - No numeric indices [0] or ID selectors [id=value]
  return /\[\]/.test(path) && 
         path.endsWith('[]') &&
         !/\[\d+\]/.test(path) && 
         !/\[[^=\]]+=[^\]]+\]/.test(path);
}

// Convert between types (these functions validate the conversion)
export function toNumericPath(path: string): NumericPath {
  if (!isNumericPath(path)) {
    throw new Error(`Path "${path}" is not a valid NumericPath (contains non-numeric segments)`);
  }
  return path as NumericPath;
}

export function toIdBasedPath(path: string): IdBasedPath {
  return path as IdBasedPath;
}

export function toArrayPatternPath(path: string): ArrayPatternPath {
  if (!isArrayPatternPath(path)) {
    throw new Error(`Path "${path}" is not a valid ArrayPatternPath (must contain [] and not have specific indices)`);
  }
  return path as ArrayPatternPath;
}

// Safe conversions between the branded types
export function numericToIdBased(path: NumericPath): IdBasedPath {
  // NumericPath is a subset of IdBasedPath, so this is always safe
  return path as unknown as IdBasedPath;
}

export function anyPathToIdBased(path: AnyPath): IdBasedPath {
  // Convert any path to IdBasedPath (safe because NumericPath ⊆ IdBasedPath)
  return path as unknown as IdBasedPath;
}

export function anyPathToNumeric(path: AnyPath): NumericPath {
  // This is only safe if the path is actually numeric
  if (typeof path === 'string' && isNumericPath(path)) {
    return path as unknown as NumericPath;
  }
  throw new Error(`Cannot convert path "${path}" to NumericPath - contains non-numeric segments`);
}

// Unsafe conversions (use with caution)
export function unsafeNumericPath(path: string): NumericPath {
  return path as NumericPath;
}

export function unsafeIdBasedPath(path: string): IdBasedPath {
  return path as IdBasedPath;
}

export function unsafeAnyToNumeric(path: AnyPath): NumericPath {
  return path as unknown as NumericPath;
}

export function unsafeAnyToIdBased(path: AnyPath): IdBasedPath {
  return path as unknown as IdBasedPath;
}

// ============================================================================
// ARRAY PATTERN PATH CONVERSIONS
// ============================================================================

/**
 * Convert a NumericPath to ArrayPatternPath by replacing indices with []
 * Example: "root.boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2]"
 *       -> "boomerForecastV3Requests[].parameters.accountParams[].contributions[]"
 */
export function numericToArrayPattern(path: NumericPath): ArrayPatternPath {
  let patternPath = path as string;
  
  // Remove "root." prefix if present
  if (patternPath.startsWith('root.')) {
    patternPath = patternPath.substring(5);
  }
  
  // Replace all numeric indices [0], [1], [123] with []
  patternPath = patternPath.replace(/\[\d+\]/g, '[]');
  
  return createArrayPatternPath(patternPath);
}

/**
 * Convert an IdBasedPath to ArrayPatternPath by replacing indices and IDs with []
 * Example: "root.boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0]"
 *       -> "boomerForecastV3Requests[].parameters.accountParams[].contributions[]"
 */
export function idBasedToArrayPattern(path: IdBasedPath): ArrayPatternPath {
  let patternPath = path as string;
  
  // Remove "root." prefix if present
  if (patternPath.startsWith('root.')) {
    patternPath = patternPath.substring(5);
  }
  
  // Replace all indices (both numeric [0] and ID-based [id=value]) with []
  patternPath = patternPath.replace(/\[[^\]]+\]/g, '[]');
  
  return createArrayPatternPath(patternPath);
}

/**
 * Convert any path type to ArrayPatternPath
 */
export function anyPathToArrayPattern(path: AnyPath): ArrayPatternPath {
  // Convert to string and check the format
  const pathStr = path as string;
  
  if (hasIdBasedSegments(createIdBasedPath(pathStr))) {
    return idBasedToArrayPattern(createIdBasedPath(pathStr));
  } else {
    return numericToArrayPattern(createNumericPath(pathStr));
  }
}

// ============================================================================
// RUNTIME VALIDATION FUNCTIONS
// ============================================================================

/**
 * Runtime validation for incoming string data that should be numeric paths
 * Use this when receiving paths from external sources (JSON, DOM, APIs)
 */
export function validateAndCreateNumericPath(path: string, source: string = 'unknown'): NumericPath {
  if (!path || typeof path !== 'string') {
    throw new Error(`Invalid path from ${source}: expected non-empty string, got ${typeof path}`);
  }
  
  // Check for obvious invalid patterns
  if (path.includes('=') && !isNumericPath(path)) {
    console.warn(`[PathTypes] Warning: Path from ${source} contains ID-based segments but was expected to be numeric: "${path}"`);
  }
  
  return createNumericPath(path);
}

/**
 * Runtime validation for incoming string data that should be ID-based paths  
 * Use this when receiving paths from UI components or user interactions
 */
export function validateAndCreateIdBasedPath(path: string, source: string = 'unknown'): IdBasedPath {
  if (!path || typeof path !== 'string') {
    throw new Error(`Invalid path from ${source}: expected non-empty string, got ${typeof path}`);
  }
  
  return createIdBasedPath(path);
}

/**
 * Runtime validation for ArrayPatternPath
 * Use this when creating array patterns from DiffResult keys or structural analysis
 */
export function validateAndCreateArrayPatternPath(path: string, source: string = 'unknown'): ArrayPatternPath {
  if (!path || typeof path !== 'string') {
    throw new Error(`Invalid array pattern path from ${source}: expected non-empty string, got ${typeof path}`);
  }
  
  if (!isValidArrayPattern(path)) {
    throw new Error(`Invalid array pattern path from ${source}: must contain [] and end with [], got "${path}"`);
  }
  
  return createArrayPatternPath(path);
}

// ============================================================================
// ARRAY PATTERN PATH UTILITIES
// ============================================================================

/**
 * Count the number of array levels in a pattern
 * Example: "boomerForecastV3Requests[].parameters.accountParams[].contributions[]" -> 3
 */
export function getArrayDepth(pattern: ArrayPatternPath): number {
  const matches = (pattern as string).match(/\[\]/g);
  return matches ? matches.length : 0;
}

/**
 * Get the target array property name (the final property before the last [])
 * Example: "boomerForecastV3Requests[].parameters.accountParams[].contributions[]" -> "contributions"
 */
export function getTargetArrayProperty(pattern: ArrayPatternPath): string | null {
  const match = (pattern as string).match(/\.([^.\[\]]+)\[\]$/);
  return match ? match[1] : null;
}

/**
 * Get the full path to the parent container of the target array
 * Example: "boomerForecastV3Requests[].parameters.accountParams[].contributions[]" 
 *       -> "boomerForecastV3Requests[].parameters.accountParams[]"
 */
export function getParentArrayPattern(pattern: ArrayPatternPath): ArrayPatternPath | null {
  const patternStr = pattern as string;
  const lastArrayIndex = patternStr.lastIndexOf('[]');
  if (lastArrayIndex === -1) return null;
  
  const beforeLastArray = patternStr.substring(0, lastArrayIndex);
  const lastDotIndex = beforeLastArray.lastIndexOf('.');
  if (lastDotIndex === -1) return null;
  
  const parentPattern = beforeLastArray.substring(0, lastDotIndex) + '[]';
  return isValidArrayPattern(parentPattern) ? createArrayPatternPath(parentPattern) : null;
}

/**
 * Check if two array patterns represent the same structural hierarchy
 * This is useful for grouping DiffResults that share the same comparison logic
 */
export function arePatternsSimilar(pattern1: ArrayPatternPath, pattern2: ArrayPatternPath): boolean {
  return pattern1 === pattern2;
}

/**
 * Safe conversion from unknown string data to the appropriate path type
 * Attempts to detect the path format and create the right type
 */
export function smartPathConversion(path: string, source: string = 'unknown'): AnyPath {
  if (!path || typeof path !== 'string') {
    throw new Error(`Invalid path from ${source}: expected non-empty string, got ${typeof path}`);
  }
  
  // If it contains ID-based segments, treat as IdBasedPath
  if (hasIdBasedSegments(createIdBasedPath(path))) {
    return createIdBasedPath(path);
  }
  
  // If it's purely numeric, treat as NumericPath
  if (isNumericPath(path)) {
    return createNumericPath(path);
  }
  
  // Default to IdBasedPath (superset)
  return createIdBasedPath(path);
}

// ============================================================================
// VIEWER-SPECIFIC PATH TYPES
// ============================================================================

/**
 * Viewer identifiers - only these two are allowed
 */
export type ViewerId = 'left' | 'right';

/**
 * Viewer-specific path type that MUST include viewer association
 * Only used for numeric paths since ID-based paths are viewer-agnostic
 * Format: "left_root.path.to.element" or "right_root.array[0].property"
 */
export type ViewerPath = string & { 
  __brand: 'ViewerPath';
  __viewer: ViewerId;
};

/**
 * Extract viewer ID from a viewer path string
 */
export function extractViewerId(viewerPath: string): ViewerId | null {
  const match = viewerPath.match(/^(left|right)_/);
  return match ? (match[1] as ViewerId) : null;
}

/**
 * Extract the generic path part (without viewer prefix)
 */
export function extractGenericPath(viewerPath: string): string {
  return viewerPath.replace(/^(left|right)_/, '');
}

/**
 * Type guard: check if a string is a valid viewer path
 */
export function isViewerPath(path: string): path is ViewerPath {
  return /^(left|right)_/.test(path);
}

/**
 * Create a viewer-specific path (safe constructor)
 */
export function createViewerPath(viewerId: ViewerId, genericPath: NumericPath): ViewerPath;
export function createViewerPath(viewerId: ViewerId, genericPath: string): ViewerPath {
  if (!isNumericPath(genericPath)) {
    throw new Error(`createViewerPath: Cannot create viewer path for non-numeric path "${genericPath}". ID-based paths should remain viewer-agnostic.`);
  }
  const viewerPath = `${viewerId}_${genericPath}`;
  return viewerPath as ViewerPath;
}


/**
 * Safe conversion: viewer path to generic path with type preservation
 * Since ViewerPath is only used for numeric paths, this always returns NumericPath
 */
export function viewerPathToGeneric(viewerPath: ViewerPath): NumericPath {
  const genericPathString = extractGenericPath(viewerPath);
  return createNumericPath(genericPathString);
}

/**
 * Validate and create viewer path from potentially unsafe string
 */
export function validateViewerPath(path: string, source: string = 'unknown'): ViewerPath {
  if (!path || typeof path !== 'string') {
    throw new Error(`Invalid viewer path from ${source}: expected non-empty string, got ${typeof path}`);
  }
  
  const viewerId = extractViewerId(path);
  if (!viewerId) {
    throw new Error(`Invalid viewer path from ${source}: must start with "left_" or "right_", got "${path}"`);
  }
  
  const genericPath = extractGenericPath(path);
  if (!genericPath) {
    throw new Error(`Invalid viewer path from ${source}: no generic path after viewer prefix, got "${path}"`);
  }
  
  return createViewerPath(viewerId, validateAndCreateNumericPath(genericPath, source));
}

/**
 * Unsafe conversion for legacy code (use sparingly)
 */
export function unsafeViewerPath(path: string): ViewerPath {
  return path as ViewerPath;
}

// ============================================================================
// DOM QUERY HELPERS FOR VIEWERPATH
// ============================================================================

/**
 * Extract ViewerPath from DOM element's data-path attribute
 */
export function getViewerPathFromElement(element: Element): ViewerPath | null {
  const dataPath = element.getAttribute('data-path');
  if (!dataPath || !isViewerPath(dataPath)) return null;
  return dataPath as ViewerPath;
}

/**
 * Query DOM element by ViewerPath
 */
export function queryElementByViewerPath(viewerPath: ViewerPath): Element | null {
  return document.querySelector(`[data-path="${viewerPath}"]`);
}

/**
 * Get numeric path from ViewerPath for cross-viewer operations
 */
export function getNumericPathFromViewerPath(viewerPath: ViewerPath): NumericPath {
  const withoutPrefix = viewerPath.replace(/^(left|right)_/, '');
  return validateAndCreateNumericPath(withoutPrefix);
}

/**
 * Get all elements for a specific viewer
 */
export function getAllElementsForViewer(viewerId: ViewerId): NodeListOf<Element> {
  const prefix = `${viewerId}_`;
  return document.querySelectorAll(`[data-path^="${prefix}"]`);
}