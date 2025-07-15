import type { IdKeyInfo } from './jsonCompare';
import type { NumericPath, IdBasedPath, AnyPath, ArrayPatternPath, ViewerPath, ViewerId } from './PathTypes';
import { unsafeAnyToIdBased, unsafeAnyToNumeric, validateAndCreateNumericPath, createViewerPath, hasIdBasedSegments, createIdBasedPath } from './PathTypes';

/**
 * Path Converter Utility
 * Provides bidirectional conversion between ID-based and index-based paths
 */

export interface PathConversionContext {
  jsonData?: any;
  idKeysUsed?: IdKeyInfo[];
}

export interface PathPrefix {
  viewer?: string;    // e.g., "left", "right"
  hasRoot?: boolean;  // whether path starts with "root."
}

/**
 * Conversion options for different usage scenarios
 */
export interface ConversionOptions {
  preservePrefix?: boolean;      // Keep original prefix (default: true)
  targetViewer?: string;         // Change to specific viewer prefix
  addRoot?: boolean;             // Force add "root." prefix
  removeAllPrefixes?: boolean;   // Strip all prefixes
}

/**
 * Extracts prefix information from a path
 * Example: "root_left_root.users[0]" -> { viewer: "left", hasRoot: true }
 */
function extractPrefix(path: string): { prefix: PathPrefix; corePath: string } {
  let corePath = path;
  const prefix: PathPrefix = {};
  
  // Extract viewer prefix
  const viewerMatch = corePath.match(/^root_(left|right)_/);
  if (viewerMatch) {
    prefix.viewer = viewerMatch[1];
    corePath = corePath.substring(viewerMatch[0].length);
  }
  
  // Extract root prefix
  if (corePath.startsWith('root.')) {
    prefix.hasRoot = true;
    corePath = corePath.substring(5);
  } else if (corePath === 'root') {
    prefix.hasRoot = true;
    corePath = '';
  }
  
  return { prefix, corePath };
}

/**
 * Rebuilds a path with the specified prefix
 */
function buildPathWithPrefix(corePath: string, prefix: PathPrefix): string {
  let result = corePath;
  
  // Add root prefix if needed
  if (prefix.hasRoot) {
    result = result ? `root.${result}` : 'root';
  }
  
  // Add viewer prefix if needed
  if (prefix.viewer) {
    result = `root_${prefix.viewer}_${result}`;
  }
  
  return result;
}

/**
 * Parses a path string into segments (without prefix)
 * Example: "users[0].profile.name" -> ["users", "[0]", "profile", "name"]
 */
function parsePathSegments(path: string): string[] {
  // Handle array indices and property names
  const segments: string[] = [];
  let current = '';
  let inBracket = false;
  
  for (let i = 0; i < path.length; i++) {
    const char = path[i];
    
    if (char === '[') {
      if (current) {
        segments.push(current);
        current = '';
      }
      inBracket = true;
      current = '[';
    } else if (char === ']') {
      current += ']';
      segments.push(current);
      current = '';
      inBracket = false;
    } else if (char === '.' && !inBracket) {
      if (current) {
        segments.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    segments.push(current);
  }
  
  return segments;
}

/**
 * Extracts ID key and value from an ID-based array segment
 * Example: "[id=45626988::2]" -> { key: "id", value: "45626988::2" }
 */
function extractIdKeyValue(segment: string): { key: string; value: string } | null {
  const match = segment.match(/^\[([^=]+)=([^\]]+)\]$/);
  if (match) {
    return { key: match[1], value: match[2] };
  }
  return null;
}


/**
 * Converts an ID-based path to an index-based path with proper prefix handling
 * Example: "root.accountParams[id=45626988::2]" -> "root.accountParams[1]"
 */
export function convertIdPathToIndexPath(
  idPath: IdBasedPath,
  context: PathConversionContext,
  options: ConversionOptions = {}
): NumericPath | null {
  if (!context.jsonData) {
    return null;
  }
  
  // Extract prefix and core path
  const { prefix: originalPrefix, corePath } = extractPrefix(idPath);
  
  const segments = parsePathSegments(corePath);
  const convertedSegments: string[] = [];
  let currentData = context.jsonData;
  
  for (const segment of segments) {
    const idKeyValue = extractIdKeyValue(segment);
    
    if (idKeyValue && Array.isArray(currentData)) {
      // This is an ID-based array reference - find the actual index
      const index = currentData.findIndex(item => {
        if (typeof item === 'object' && item !== null) {
          return item[idKeyValue.key] === idKeyValue.value;
        }
        return false;
      });
      
      if (index === -1) {
        // ID not found in array
        return null;
      }
      
      convertedSegments.push(`[${index}]`);
      currentData = currentData[index];
    } else if (segment.startsWith('[') && segment.endsWith(']')) {
      // Already an index-based reference
      convertedSegments.push(segment);
      const index = parseInt(segment.slice(1, -1), 10);
      currentData = Array.isArray(currentData) ? currentData[index] : undefined;
    } else {
      // Property name
      convertedSegments.push(segment);
      currentData = currentData?.[segment];
    }
  }
  
  // Join segments properly - don't add dots before array indices
  let convertedCorePath = '';
  for (let i = 0; i < convertedSegments.length; i++) {
    const segment = convertedSegments[i];
    if (i === 0) {
      convertedCorePath = segment;
    } else if (segment.startsWith('[')) {
      // Array index - no dot needed
      convertedCorePath += segment;
    } else {
      // Property name - add dot
      convertedCorePath += '.' + segment;
    }
  }
  
  // Apply prefix options
  const targetPrefix = applyPrefixOptions(originalPrefix, options);
  
  const resultPath = buildPathWithPrefix(convertedCorePath, targetPrefix);
  return resultPath as NumericPath;
}

/**
 * Converts an ID-based path to a ViewerPath with proper viewer context
 * Example: "root.accountParams[id=45626988::2]" -> "left_root.accountParams[1]"
 */
export function convertIdPathToViewerPath(
  idPath: IdBasedPath,
  context: PathConversionContext,
  viewerId: ViewerId,
  options: ConversionOptions = {}
): ViewerPath | null {
  // Use the existing function to get the numeric path
  const numericPath = convertIdPathToIndexPath(idPath, context, options);
  
  if (!numericPath) {
    return null;
  }
  
  // Use path directly without adding root prefix
  let pathWithRoot = numericPath;
  
  // Create ViewerPath with the specified viewer
  try {
    const validatedNumericPath = validateAndCreateNumericPath(pathWithRoot, 'convertIdPathToViewerPath');
    return createViewerPath(viewerId, validatedNumericPath);
  } catch (error) {
    console.error('[PathConverter] Failed to create ViewerPath:', error);
    return null;
  }
}

/**
 * Applies conversion options to determine the target prefix
 */
function applyPrefixOptions(originalPrefix: PathPrefix, options: ConversionOptions): PathPrefix {
  if (options.removeAllPrefixes) {
    return {};
  }
  
  const targetPrefix: PathPrefix = {};
  
  // Handle viewer prefix
  if (options.targetViewer) {
    targetPrefix.viewer = options.targetViewer;
  } else if (options.preservePrefix !== false) {
    targetPrefix.viewer = originalPrefix.viewer;
  }
  
  // Handle root prefix
  if (options.addRoot) {
    targetPrefix.hasRoot = true;
  } else if (options.preservePrefix !== false) {
    targetPrefix.hasRoot = originalPrefix.hasRoot;
  }
  
  return targetPrefix;
}

/**
 * Converts ViewerPath to IdBasedPath with proper ID value lookup
 * Example: "left_root.accounts[0]" -> "root.accounts[id=123]"
 */
export function viewerPathToIdBasedPath(
  viewerPath: string,
  jsonData: { left: any; right: any },
  idKeysUsed: IdKeyInfo[]
): string | null {
  try {
    // Extract viewer ID and generic path
    const viewerId = viewerPath.startsWith('left_') ? 'left' : 'right';
    const genericPath = viewerPath.replace(/^(left|right)_/, '');
    
    // Use path directly without adding root prefix
    let pathWithRoot = genericPath;
    
    // Create context for the specific viewer
    const context: PathConversionContext = {
      jsonData: jsonData[viewerId],
      idKeysUsed: idKeysUsed
    };
    
    // Use convertIndexPathToIdPath to do the actual conversion
    const numericPath = validateAndCreateNumericPath(pathWithRoot, 'viewerPathToIdBasedPath');
    const idBasedPath = convertIndexPathToIdPath(numericPath, context, { removeAllPrefixes: true });
    
    return idBasedPath;
    
  } catch (error) {
    console.error('[PathConverter] Failed to convert ViewerPath to IdBasedPath:', error);
    return null;
  }
}

/**
 * Converts an index-based path to an ID-based path with proper prefix handling
 * Example: "root.accountParams[1]" -> "root.accountParams[id=45626988::2]"
 */
export function convertIndexPathToIdPath(
  indexPath: NumericPath,
  context: PathConversionContext,
  options: ConversionOptions = {}
): IdBasedPath | null {
  if (!context.jsonData || !context.idKeysUsed) {
    return null;
  }
  
  // Extract prefix and core path
  const { prefix: originalPrefix, corePath } = extractPrefix(indexPath);
  
  const segments = parsePathSegments(corePath);
  const convertedSegments: string[] = [];
  let currentPath = '';
  let currentData = context.jsonData;
  
  for (const segment of segments) {
    if (segment.startsWith('[') && segment.endsWith(']')) {
      // This is an array index
      const index = parseInt(segment.slice(1, -1), 10);
      
      // Update currentPath to include this array index for arrayPath matching
      currentPath = currentPath ? `${currentPath}${segment}` : segment;
      
      if (Array.isArray(currentData) && currentData[index]) {
        // Check if this array path has an ID key defined
        // We need to look for the path to the array WITHOUT the current index
        // currentPath includes the current index, but arrayPath should be to the array itself
        const pathToArray = currentPath.substring(0, currentPath.lastIndexOf('['));
        
        // Convert pathToArray to pattern format for matching
        // e.g., "boomerForecastV3Requests[0].parameters.accountParams" -> "boomerForecastV3Requests[].parameters.accountParams[]"
        const pathPattern = pathToArray.replace(/\[\d+\]/g, '[]') + '[]';
        
        const idKeyInfo = context.idKeysUsed.find(info => 
          info.arrayPath === pathPattern
        );
        
        if (idKeyInfo && typeof currentData[index] === 'object') {
          const idValue = currentData[index][idKeyInfo.idKey];
          if (idValue !== undefined) {
            convertedSegments.push(`[${idKeyInfo.idKey}=${idValue}]`);
          } else {
            // No ID value found, keep as index
            convertedSegments.push(segment);
          }
        } else {
          // No ID key for this array, keep as index
          convertedSegments.push(segment);
        }
        
        currentData = currentData[index];
      } else {
        // Invalid index
        return null;
      }
    } else {
      // Property name
      convertedSegments.push(segment);
      currentPath = currentPath ? `${currentPath}.${segment}` : segment;
      currentData = currentData?.[segment];
    }
  }
  
  // Join segments properly - don't add dots before array indices
  let convertedCorePath = '';
  for (let i = 0; i < convertedSegments.length; i++) {
    const segment = convertedSegments[i];
    if (i === 0) {
      convertedCorePath = segment;
    } else if (segment.startsWith('[')) {
      // Array index - no dot needed
      convertedCorePath += segment;
    } else {
      // Property name - add dot
      convertedCorePath += '.' + segment;
    }
  }
  
  // Apply prefix options
  const targetPrefix = applyPrefixOptions(originalPrefix, options);
  
  return buildPathWithPrefix(convertedCorePath, targetPrefix) as IdBasedPath;
}


/**
 * Removes all prefixes (root, viewer) from a path
 */
export function stripAllPrefixes(path: AnyPath): AnyPath {
  let stripped: string = path;
  
  // Remove viewer prefix
  stripped = stripped.replace(/^(left|right)_/, '');
  
  // Remove root prefix
  if (stripped.startsWith('root.')) {
    stripped = stripped.substring(5);
  } else if (stripped === 'root') {
    stripped = '';
  }
  
  return stripped as AnyPath;
}

/**
 * Checks if two paths refer to the same location, accounting for ID/index variations
 */
export function arePathsEquivalent(
  path1: AnyPath,
  path2: AnyPath,
  context?: PathConversionContext
): boolean {
  // Quick check - if they're already equal
  if (path1 === path2) return true;
  
  // Normalize both paths
  const normalized1 = stripAllPrefixes(path1);
  const normalized2 = stripAllPrefixes(path2);
  
  if (normalized1 === normalized2) return true;
  
  // If we have context, try converting between ID and index formats
  if (context && context.jsonData) {
    // Try converting path1 to match path2's format
    if (normalized1.includes('=') && normalized2.match(/\[\d+\]/)) {
      // path1 is ID-based, path2 is index-based
      const converted1 = convertIdPathToIndexPath(unsafeAnyToIdBased(normalized1), context);
      if (converted1 === normalized2) return true;
    }
    
    if (normalized2.includes('=') && normalized1.match(/\[\d+\]/)) {
      // path2 is ID-based, path1 is index-based  
      const converted2 = convertIdPathToIndexPath(unsafeAnyToIdBased(normalized2), context);
      if (converted2 === normalized1) return true;
    }
    
    // Try converting index paths to ID paths
    if (normalized1.match(/\[\d+\]/) && !normalized2.includes('=')) {
      const converted1 = convertIndexPathToIdPath(unsafeAnyToNumeric(normalized1), context);
      if (converted1 === normalized2) return true;
    }
    
    if (normalized2.match(/\[\d+\]/) && !normalized1.includes('=')) {
      const converted2 = convertIndexPathToIdPath(unsafeAnyToNumeric(normalized2), context);
      if (converted2 === normalized1) return true;
    }
  }
  
  return false;
}

// ============================================================================
// SCENARIO-SPECIFIC UTILITY FUNCTIONS
// ============================================================================

/**
 * For highlighting: Convert paths and try all variations for matching
 * Use case: Finding diffs that match a node's path regardless of format
 * This is an alias for normalizePathForComparison for backward compatibility
 */
export function getPathVariationsForHighlighting(
  path: AnyPath,
  context?: PathConversionContext
): AnyPath[] {
  return normalizePathForComparison(path, context) as AnyPath[];
}

/**
 * For navigation within same viewer: Preserve all prefixes
 * Use case: Navigating within the same JSON tree view
 */
export function convertPathForSameViewer(
  path: AnyPath,
  context: PathConversionContext,
  targetFormat: 'id' | 'index'
): AnyPath | null {
  if (targetFormat === 'id') {
    return convertIndexPathToIdPath(unsafeAnyToNumeric(path), context, { preservePrefix: true });
  } else {
    return convertIdPathToIndexPath(unsafeAnyToIdBased(path), context, { preservePrefix: true });
  }
}

/**
 * For cross-viewer sync: Change viewer prefix while converting
 * Use case: Syncing from left viewer to right viewer
 */
export function convertPathForCrossViewerSync(
  path: AnyPath,
  context: PathConversionContext,
  _fromViewer: string,
  toViewer: string,
  targetFormat: 'id' | 'index'
): AnyPath | null {
  if (targetFormat === 'id') {
    return convertIndexPathToIdPath(unsafeAnyToNumeric(path), context, { 
      targetViewer: toViewer 
    });
  } else {
    return convertIdPathToIndexPath(unsafeAnyToIdBased(path), context, { 
      targetViewer: toViewer 
    });
  }
}

/**
 * For diff comparison: Remove all prefixes for clean comparison
 * Use case: Comparing paths from JsonCompare with UI paths
 */
export function normalizePathForComparison(
  path: AnyPath,
  context?: PathConversionContext
): AnyPath[] {
  const variations = new Set<string>();
  
  // Add stripped version
  variations.add(stripAllPrefixes(path));
  
  if (context) {
    // Try both conversions and strip prefixes
    const { corePath } = extractPrefix(path);
    
    if (corePath.includes('=')) {
      const indexPath = convertIdPathToIndexPath(unsafeAnyToIdBased(path), context, { removeAllPrefixes: true });
      if (indexPath) variations.add(indexPath);
    }
    
    if (corePath.match(/\[\d+\]/)) {
      const idPath = convertIndexPathToIdPath(unsafeAnyToNumeric(path), context, { removeAllPrefixes: true });
      if (idPath) variations.add(idPath);
    }
  }
  
  return Array.from(variations) as AnyPath[];
}

/**
 * For debug/display: Convert to human-readable ID-based format
 * Use case: Showing paths in debug menus and error messages
 */
export function convertPathForDisplay(
  path: NumericPath,
  context: PathConversionContext
): IdBasedPath {
  // Try to convert to ID-based format for readability
  const idPath = convertIndexPathToIdPath(path, context, { 
    addRoot: true,
    preservePrefix: false 
  });
  
  return idPath || (path as unknown as IdBasedPath);
}

/**
 * Converts ArrayPatternPath to NumericPath by intelligently finding array elements that contain the nested structure
 * Example: "requests[].params[].items[]" -> "root.requests[0].params[1].items" (if params[1] has items but params[0] doesn't)
 * Use case: Converting IdKeys panel array patterns to navigable paths
 */
export function convertArrayPatternToNumericPath(
  arrayPattern: ArrayPatternPath,
  context: PathConversionContext
): NumericPath {
//   console.log(`[PathConverter] 🔍 Converting ArrayPattern: "${arrayPattern}"`);
  
  if (!context.jsonData) {
    throw new Error('JSON data is required for ArrayPattern conversion');
  }
  
  let targetPath = arrayPattern as string;
  
  // Parse the path to identify array patterns and their positions
  const segments = parsePathSegments(targetPath);
  const resolvedSegments: string[] = [];
  let currentData = context.jsonData;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    if (segment === '[]') {
      // This is an array pattern - find the first array element that contains the remaining path
      if (!Array.isArray(currentData)) {
        throw new Error(`Expected array at path segment but found: ${typeof currentData}`);
      }
      
      const remainingSegments = segments.slice(i + 1);
      const foundIndex = findValidArrayIndex(currentData, remainingSegments);
      
      if (foundIndex === -1) {
        // If no valid path found, fall back to [0]
        console.log(`[PathConverter] ⚠️  No valid array element found, falling back to [0]`);
        resolvedSegments.push('[0]');
        currentData = currentData[0];
      } else {
        console.log(`[PathConverter] ✅ Found valid array element at index ${foundIndex}`);
        resolvedSegments.push(`[${foundIndex}]`);
        currentData = currentData[foundIndex];
      }
    } else if (segment.startsWith('[') && segment.endsWith(']')) {
      // Already resolved array index
      resolvedSegments.push(segment);
      const index = parseInt(segment.slice(1, -1), 10);
      currentData = Array.isArray(currentData) ? currentData[index] : undefined;
    } else {
      // Property name
      resolvedSegments.push(segment);
      currentData = currentData?.[segment];
    }
  }
  
  // Join segments back into a path
  let resolvedPath = '';
  for (let i = 0; i < resolvedSegments.length; i++) {
    const segment = resolvedSegments[i];
    if (i === 0) {
      resolvedPath = segment;
    } else if (segment.startsWith('[')) {
      resolvedPath += segment;
    } else {
      resolvedPath += '.' + segment;
    }
  }
  
  // For ArrayPatternPath ending with [], we want to navigate to the array container itself
  // So we remove the final array index to get the path to the array property
  if (arrayPattern.endsWith('[]') && resolvedPath.match(/\[\d+\]$/)) {
    resolvedPath = resolvedPath.replace(/\[\d+\]$/, '');
  }
  
  // Use path directly without adding root prefix
  const fullPath = resolvedPath;
  
//   console.log(`[PathConverter] 🔍 ArrayPattern "${arrayPattern}" -> navigable path: "${fullPath}"`);
//   console.log(`[PathConverter] 🔍 resolvedPath before root prefix: "${resolvedPath}"`);
  
  return validateAndCreateNumericPath(fullPath, 'PathConverter.convertArrayPatternToNumericPath');
}

/**
 * Finds the first array element that contains a valid path for the remaining segments
 */
function findValidArrayIndex(array: any[], remainingSegments: string[]): number {
  if (remainingSegments.length === 0) {
    return array.length > 0 ? 0 : -1;
  }
  
  for (let i = 0; i < array.length; i++) {
    const element = array[i];
    if (element && typeof element === 'object') {
      if (validateRemainingPath(element, remainingSegments)) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Validates that the remaining path segments exist in the current data
 */
function validateRemainingPath(data: any, segments: string[]): boolean {
  let current = data;
  
  for (const segment of segments) {
    if (segment === '[]') {
      // For array patterns, just check if current is an array
      if (!Array.isArray(current)) {
        return false;
      }
      // For validation purposes, we don't need to go deeper into arrays
      return true;
    } else if (segment.startsWith('[') && segment.endsWith(']')) {
      // Array index
      const index = parseInt(segment.slice(1, -1), 10);
      if (!Array.isArray(current) || index >= current.length) {
        return false;
      }
      current = current[index];
    } else {
      // Property name
      if (!current || typeof current !== 'object' || !(segment in current)) {
        return false;
      }
      current = current[segment];
    }
  }
  
  return true;
}

// ============================================================================
// ADDITIONAL UTILITY FUNCTIONS FOR CENTRALIZED PATH OPERATIONS
// ============================================================================

/**
 * Safely extracts viewer prefix from a path
 * Example: "left_root.accounts[0]" -> "left"
 */
export function extractViewerPrefix(path: AnyPath): ViewerId | null {
  const match = (path as string).match(/^(left|right)_/);
  return match ? (match[1] as ViewerId) : null;
}

/**
 * Removes viewer prefix from a path
 * Example: "left_root.accounts[0]" -> "root.accounts[0]"
 */
export function removeViewerPrefix(path: AnyPath): AnyPath {
  return (path as string).replace(/^(left|right)_/, '') as AnyPath;
}

/**
 * Adds viewer prefix to a path
 * Example: ("root.accounts[0]", "left") -> "left_root.accounts[0]"
 */
export function addViewerPrefix(path: AnyPath, viewerId: ViewerId): ViewerPath {
  const pathWithoutPrefix = removeViewerPrefix(path);
  return `${viewerId}_${pathWithoutPrefix}` as ViewerPath;
}

/**
 * Matches a path against a wildcard pattern
 * Example: ("accounts[0].name", "accounts[*].name") -> true
 */
export function matchesWildcardPattern(path: AnyPath, pattern: string): boolean {
  // Convert pattern to regex, handling wildcards and array patterns
  const regexPattern = pattern
    .replace(/\./g, '\\.')  // Escape dots
    .replace(/\[/g, '\\[')  // Escape opening brackets
    .replace(/\]/g, '\\]')  // Escape closing brackets
    .replace(/\\\[\\\*\\\]/g, '\\[[^\\]]*\\]')  // Convert [*] to match any array index
    .replace(/\\\[\\\]/g, '\\[[^\\]]*\\]')      // Convert [] to match any array index
    .replace(/\*/g, '[^.\\[]*');  // Convert remaining * to match any non-delimiter chars
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(stripAllPrefixes(path));
}

/**
 * Gets all expansion paths for a given path (for tree expansion)
 * Example: "root.accounts[0].transactions[1]" -> ["root", "root.accounts", "root.accounts[0]", ...]
 */
export function getExpansionPaths(path: NumericPath, viewerPrefix?: ViewerId): ViewerPath[] {
  const pathWithoutRoot = (path as string).replace(/^root\.?/, '');
  if (!pathWithoutRoot) return [];
  
  const segments = pathWithoutRoot.split(/(?=\[)|\./).filter(Boolean);
  const expansionPaths: ViewerPath[] = [];
  let currentPath = '';
  
  for (const segment of segments) {
    if (segment.startsWith('[')) {
      currentPath += segment;
    } else {
      currentPath = currentPath === '' ? segment : `${currentPath}.${segment}`;
    }
    
    const finalPath = viewerPrefix ? `${viewerPrefix}_${currentPath}` : currentPath;
    expansionPaths.push(finalPath as ViewerPath);
  }
  
  return expansionPaths;
}

/**
 * Extracts parent path from a given path
 * Example: "root.accounts[0].name" -> "root.accounts[0]"
 */
export function getParentPath(path: AnyPath): AnyPath | null {
  const pathStr = path as string;
  
  // Find the last property or array access
  const lastDotIndex = pathStr.lastIndexOf('.');
  const lastBracketIndex = pathStr.lastIndexOf('[');
  
  if (lastDotIndex === -1 && lastBracketIndex === -1) {
    return null; // No parent (root level)
  }
  
  if (lastDotIndex > lastBracketIndex) {
    // Last access was a property
    return pathStr.substring(0, lastDotIndex) as AnyPath;
  } else {
    // Last access was an array index, find the property before it
    const beforeBracket = pathStr.substring(0, lastBracketIndex);
    const previousDotIndex = beforeBracket.lastIndexOf('.');
    
    if (previousDotIndex === -1) {
      // Array is at root level
      return beforeBracket as AnyPath;
    } else {
      return beforeBracket as AnyPath;
    }
  }
}

/**
 * Validates that a path conversion is contextually valid
 * (e.g., ID-based conversions require context)
 */
export function validateConversionRequirements(
  fromPath: AnyPath,
  targetFormat: 'numeric' | 'id' | 'viewer',
  context?: PathConversionContext
): boolean {
  const hasIdSegments = hasIdBasedSegments(createIdBasedPath(fromPath as string));
  
  // ID-based conversions always require context
  if (hasIdSegments && !context?.jsonData) {
    console.warn('[PathConverter] ID-based path conversion requires context with jsonData');
    return false;
  }
  
  // Viewer path conversions for ID paths require context
  if (targetFormat === 'viewer' && hasIdSegments && !context?.jsonData) {
    console.warn('[PathConverter] Viewer path conversion for ID-based paths requires context');
    return false;
  }
  
  return true;
}

