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

// Union type for functions that can accept either
export type AnyPath = NumericPath | IdBasedPath;

// Helper functions to create branded types
export const createNumericPath = (path: string): NumericPath => path as NumericPath;
export const createIdBasedPath = (path: string): IdBasedPath => path as IdBasedPath;

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