import type { IdKeyInfo } from './jsonCompare';
import type { NumericPath, IdBasedPath, AnyPath } from './PathTypes';
import { unsafeAnyToIdBased, unsafeAnyToNumeric } from './PathTypes';

/**
 * Path Converter Utility
 * Provides bidirectional conversion between ID-based and index-based paths
 */

export interface PathConversionContext {
  jsonData?: any;
  idKeysUsed?: IdKeyInfo[];
  viewerId?: string;
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
  
  return buildPathWithPrefix(convertedCorePath, targetPrefix) as NumericPath;
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
        
        const idKeyInfo = context.idKeysUsed.find(info => 
          pathToArray === info.arrayPath || 
          pathToArray.endsWith(info.arrayPath)
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
  stripped = stripped.replace(/^root_(viewer\d+)_/, '');
  
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