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

// Note: Removed unused conversion functions (toNumericPath, toIdBasedPath, toArrayPatternPath, etc.)
// These were only used in tests and added unnecessary complexity.

// Note: Removed unused array pattern conversion functions
// (numericToArrayPattern, idBasedToArrayPattern, anyPathToArrayPattern)
// These were only used in tests and provided no value in the actual application.

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

// Note: Removed unused array pattern utility functions
// (getArrayDepth, getTargetArrayProperty, getParentArrayPattern, arePatternsSimilar, smartPathConversion)
// These were only used in tests and added unnecessary complexity.

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
 * Returns clean path without 'root.' prefix
 */
export function extractGenericPath(viewerPath: string): string {
  // Handle standard ViewerPath format: ${viewerId}_root.${path}
  if (viewerPath.match(/^(left|right)_root\./)) {
    return viewerPath.replace(/^(left|right)_root\./, '');
  }
  
  // Handle legacy or non-standard formats: ${viewerId}_${path}
  if (viewerPath.match(/^(left|right)_/)) {
    return viewerPath.replace(/^(left|right)_/, '');
  }
  
  // No viewer prefix found, return as-is
  return viewerPath;
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
  // Remove any legacy 'root.' prefix from the generic path before creating ViewerPath
  const cleanPath = genericPath.startsWith('root.') ? genericPath.substring(5) : genericPath;
  const viewerPath = `${viewerId}_root.${cleanPath}`;
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
 * Extract generic path without root prefix from ViewerPath
 * Example: "left_root.boomerForecastV3Requests[0]..." → "boomerForecastV3Requests[0]..."
 */
export function viewerPathToGenericWithoutRoot(viewerPath: ViewerPath): string {
  // Since extractGenericPath now returns clean paths, we can return it directly
  return extractGenericPath(viewerPath);
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
  const cleanPath = extractGenericPath(viewerPath);
  return validateAndCreateNumericPath(cleanPath);
}

/**
 * Get all elements for a specific viewer
 */
export function getAllElementsForViewer(viewerId: ViewerId): NodeListOf<Element> {
  const prefix = `${viewerId}_`;
  return document.querySelectorAll(`[data-path^="${prefix}"]`);
}

