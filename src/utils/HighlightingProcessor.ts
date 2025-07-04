import type { DiffResult } from './jsonCompare';
import { type PathConversionContext } from './PathConverter';

/**
 * Preprocessed highlighting information for efficient O(1) lookups
 * Built from JsonCompare diff results to support UI highlighting
 */
export interface HighlightingInfo {
  // O(1) lookup for exact diff matches
  exactDiffs: Map<string, DiffResult>;           // numericPath -> diff
  displayPathToDiff: Map<string, DiffResult>;    // displayPath -> diff
  
  // O(1) lookup for parent relationships  
  parentContainers: Set<string>;                 // all parent paths that contain changes
  childToParentMap: Map<string, string[]>;       // childPath -> [parentPaths]
  
  // O(1) path correlation
  displayToNumericMap: Map<string, string>;      // displayPath -> numericPath
  numericToDisplayMap: Map<string, string>;      // numericPath -> displayPath
  
  // Categorized diffs by type for efficient filtering
  addedPaths: Set<string>;
  removedPaths: Set<string>;  
  changedPaths: Set<string>;
}

/**
 * Extracts all parent paths from a given path
 * Example: "users[0].profile.name" -> ["users", "users[0]", "users[0].profile"]
 */
export function extractParentPaths(path: string): string[] {
  if (!path) return [];
  
  const parents: string[] = [];
  const parts = path.split('.');
  
  for (let i = 0; i < parts.length - 1; i++) {
    const parentPath = parts.slice(0, i + 1).join('.');
    if (parentPath) {
      parents.push(parentPath);
    }
  }
  
  return parents;
}

/**
 * Normalizes a path by removing "root." prefix if present
 */
export function normalizePath(path: string): string {
  if (path.startsWith('root.')) {
    return path.substring(5);
  } else if (path === 'root') {
    return '';
  }
  return path;
}

/**
 * Builds efficient lookup maps from JsonCompare diff results
 * This enables O(1) highlighting lookups instead of O(n) linear searches
 */
export function buildHighlightingMaps(
  diffs: DiffResult[], 
  context?: PathConversionContext
): HighlightingInfo {
  const info: HighlightingInfo = {
    exactDiffs: new Map(),
    displayPathToDiff: new Map(),
    parentContainers: new Set(),
    childToParentMap: new Map(),
    displayToNumericMap: new Map(),
    numericToDisplayMap: new Map(),
    addedPaths: new Set(),
    removedPaths: new Set(),
    changedPaths: new Set(),
  };

  // Step 1: Build exact diff maps and path correlations
  diffs.forEach(diff => {
    if (!diff.numericPath) return;
    
    // Build primary lookup maps with all path variations
    const numericPath = diff.numericPath;
    
    // Store the numeric path (we'll implement proper normalization later)
    const numericVariations = [numericPath, normalizePath(numericPath)];
    
    // Store all numeric path variations
    numericVariations.forEach(variant => {
      info.exactDiffs.set(variant, diff);
    });
    
    if (diff.displayPath) {
      // Store the display path (we'll implement proper normalization later)
      const displayVariations = [diff.displayPath, normalizePath(diff.displayPath)];
      
      // Store all display path variations
      displayVariations.forEach(variant => {
        info.displayPathToDiff.set(variant, diff);
      });
      
      // Build correlation maps for all variations
      displayVariations.forEach(displayVar => {
        numericVariations.forEach(numericVar => {
          info.displayToNumericMap.set(displayVar, numericVar);
          info.numericToDisplayMap.set(numericVar, displayVar);
        });
      });
    }
    
    // Categorize by diff type
    switch(diff.type) {
      case 'added': 
        info.addedPaths.add(diff.numericPath); 
        break;
      case 'removed': 
        info.removedPaths.add(diff.numericPath); 
        break;
      case 'changed': 
        info.changedPaths.add(diff.numericPath); 
        break;
    }
  });

  // Step 2: Build parent hierarchy from diff paths
  // This is the key insight: JsonCompare only reports leaf changes,
  // so we need to infer which parent containers should be highlighted
  diffs.forEach(diff => {
    if (!diff.numericPath) return;
    
    // Get basic path variations for this diff (we'll implement proper normalization later)
    const allPathVariations = [
      diff.numericPath, 
      normalizePath(diff.numericPath),
      ...(diff.displayPath ? [diff.displayPath, normalizePath(diff.displayPath)] : [])
    ];
    
    // Extract parent paths from all variations
    const allParentPaths = new Set<string>();
    allPathVariations.forEach(pathVariant => {
      const parents = extractParentPaths(pathVariant);
      parents.forEach(parent => allParentPaths.add(parent));
    });
    
    // Store all parent paths
    allParentPaths.forEach(parentPath => {
      if (parentPath) {
        info.parentContainers.add(parentPath);
        
        // Build child-to-parent mapping
        if (!info.childToParentMap.has(diff.numericPath)) {
          info.childToParentMap.set(diff.numericPath, []);
        }
        info.childToParentMap.get(diff.numericPath)!.push(parentPath);
      }
    });
  });

  return info;
}

/**
 * Helper function to get highlighting class for a specific diff type and JSON side
 */
export function getDiffHighlightingClass(diffType: DiffResult['type'], jsonSide: 'left' | 'right'): string | null {
  switch (diffType) {
    case 'added':
      return jsonSide === 'right' ? 'json-added' : null;
    case 'removed':
      return jsonSide === 'left' ? 'json-deleted' : null;
    case 'changed':
      return 'json-changed';
    default:
      return null;
  }
}

/**
 * Debug helper to analyze highlighting info
 */
export function debugHighlightingInfo(info: HighlightingInfo): void {
  console.group('🎨 HighlightingInfo Complete Debug');
  
  console.log('📊 Summary:', {
    exactDiffs: info.exactDiffs.size,
    displayPathDiffs: info.displayPathToDiff.size,
    parentContainers: info.parentContainers.size,
    addedPaths: info.addedPaths.size,
    removedPaths: info.removedPaths.size,
    changedPaths: info.changedPaths.size
  });
  
  console.log('🎯 All Exact Diffs (numericPath -> diff):');
  Array.from(info.exactDiffs.entries()).forEach(([path, diff], index) => {
    console.log(`  ${index + 1}. "${path}" -> ${diff.type}`);
  });
  
  console.log('🎨 All Display Path Diffs (displayPath -> diff):');
  Array.from(info.displayPathToDiff.entries()).forEach(([path, diff], index) => {
    console.log(`  ${index + 1}. "${path}" -> ${diff.type}`);
  });
  
  console.log('👨‍👩‍👧‍👦 All Parent Containers:');
  Array.from(info.parentContainers).forEach((path, index) => {
    console.log(`  ${index + 1}. "${path}"`);
  });
  
  console.log('🔗 Path Correlations (display -> numeric):');
  Array.from(info.displayToNumericMap.entries()).slice(0, 10).forEach(([display, numeric], index) => {
    console.log(`  ${index + 1}. "${display}" -> "${numeric}"`);
  });
  
  console.groupEnd();
}