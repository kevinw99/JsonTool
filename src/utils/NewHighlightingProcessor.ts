import { 
  normalizePathForComparison,
  convertIdPathToIndexPath,
  type PathConversionContext 
} from './PathConverter';
import type { DiffResult } from './jsonCompare';
import type { AnyPath, ViewerId, IdBasedPath } from './PathTypes';
import { hasIdBasedSegments, createIdBasedPath } from './PathTypes';

/**
 * CSS class constants for highlighting
 */
export const HIGHLIGHT_CSS_CLASSES = {
  ADDED: 'json-added',
  DELETED: 'json-deleted', 
  CHANGED: 'json-changed',
  PARENT_CHANGED: 'json-parent-changed',
  // Navigation/UI highlighting classes (NOT used by highlighting processor)
  HIGHLIGHTED: 'highlighted-node',        // Temporary highlight during navigation (Go To actions)
  PERSISTENT_HIGHLIGHT: 'persistent-highlight'  // Persistent border highlight until next navigation
} as const;

/**
 * New PathConverter-based Highlighting Processor
 * 
 * This processor uses the PathConverter utility to handle path normalization
 * and correlation between ID-based and numeric paths for accurate highlighting.
 */
export class NewHighlightingProcessor {
  private diffResults: DiffResult[];
  
  constructor(diffResults: DiffResult[]) {
    this.diffResults = diffResults;
  }
  
  /**
   * Determines the highlighting class(es) for a given node path
   * @param nodePath The path to the node being rendered (can be numeric or ID-based)
   * @param viewerId Which panel this node is in ('left' | 'right')
   * @param context PathConversionContext for path normalization
   * @returns Array of CSS classes to apply
   */
  getHighlightingClasses(
    nodePath: AnyPath,
    viewerId: ViewerId,
    context: PathConversionContext
  ): string[] {
    const classes: string[] = [];
    
    // Check if the original input path contains ID-based segments
    const originalPathContainsIdSegments = hasIdBasedSegments(createIdBasedPath(nodePath));
    
    // Step 1: Normalize the node path to get all possible variations
    const pathVariations = normalizePathForComparison(nodePath, context);
    
    // Step 2: Check for exact diff matches
    for (const variation of pathVariations) {
      const exactMatch = this.diffResults.find(diff => {
        // PRIORITIZE idBasedPath over numericPath for accuracy in viewer-specific contexts
        // Check idBasedPath first if it exists (for ID-based correlation)
        if (diff.idBasedPath) {
          const idBasedVariations = normalizePathForComparison(diff.idBasedPath as IdBasedPath, context);
          if (idBasedVariations.includes(variation)) {
            return true;
          }
        }
        
        // For viewer-specific paths (when arrays with ID keys are reordered), numeric paths can be incorrect
        // Only skip numeric fallback if the original input path contains ID-based segments and idBasedPath exists
        const shouldSkipNumericFallback = diff.idBasedPath && originalPathContainsIdSegments;
        
        if (!shouldSkipNumericFallback) {
          // Convert idBasedPath to numeric path for the current viewer context
          const numericPath = convertIdPathToIndexPath(diff.idBasedPath as IdBasedPath, context);
          if (numericPath) {
            const numericVariations = normalizePathForComparison(numericPath as IdBasedPath, context);
            if (numericVariations.includes(variation)) {
              return true;
            }
          }
        }
        
        return false;
      });
      
      if (exactMatch) {
        const diffClass = this.getDiffClass(exactMatch.type, viewerId);
        if (diffClass) {
          classes.push(diffClass);
          return classes; // Return immediately for exact matches
        }
      }
    }
    
    // Step 3: Check if this is a child of any added/removed/changed element
    for (const variation of pathVariations) {
      const parentDiff = this.diffResults.find(diff => {
        // PRIORITIZE idBasedPath over numericPath for parent relationships
        // Check idBasedPath first if it exists
        if (diff.idBasedPath) {
          const idBasedVariations = normalizePathForComparison(diff.idBasedPath as IdBasedPath, context);
          const isChildOfDisplay = idBasedVariations.some(diffVar => 
            variation.startsWith(diffVar + '.') || 
            variation.startsWith(diffVar + '[')
          );
          if (isChildOfDisplay) {
            return true;
          }
        }
        
        // Only skip numeric fallback for ID-based paths with ID segments  
        const shouldSkipNumericFallback = diff.idBasedPath && originalPathContainsIdSegments;
        
        if (!shouldSkipNumericFallback) {
          // Convert idBasedPath to numeric path for the current viewer context
          const numericPath = convertIdPathToIndexPath(diff.idBasedPath as IdBasedPath, context);
          if (numericPath) {
            const numericVariations = normalizePathForComparison(numericPath as IdBasedPath, context);
            const isChildOfNumeric = numericVariations.some(diffVar => 
              variation.startsWith(diffVar + '.') || 
              variation.startsWith(diffVar + '[')
            );
            
            if (isChildOfNumeric) {
              return true;
            }
          }
        }
        
        return false;
      });
      
      if (parentDiff) {
        const diffClass = this.getDiffClass(parentDiff.type, viewerId);
        if (diffClass) {
          classes.push(diffClass);
          return classes; // Return immediately for inherited highlighting
        }
      }
    }
    
    // Step 4: Check if this is a parent of any changed element
    for (const variation of pathVariations) {
      const isParent = this.diffResults.some(diff => {
        // PRIORITIZE idBasedPath over numericPath for child relationships
        // Check idBasedPath first if it exists
        if (diff.idBasedPath) {
          const idBasedVariations = normalizePathForComparison(diff.idBasedPath as IdBasedPath, context);
          const hasDisplayChild = idBasedVariations.some(diffVar => 
            this.isTrueParentChild(variation, diffVar)
          );
          if (hasDisplayChild) {
            return true;
          }
        }
        
        // Only skip numeric fallback for ID-based paths with ID segments
        const shouldSkipNumericFallback = diff.idBasedPath && originalPathContainsIdSegments;
        
        if (!shouldSkipNumericFallback) {
          // Convert idBasedPath to numeric path for the current viewer context
          const numericPath = convertIdPathToIndexPath(diff.idBasedPath as IdBasedPath, context);
          if (numericPath) {
            const numericVariations = normalizePathForComparison(numericPath as IdBasedPath, context);
            const hasNumericChild = numericVariations.some(diffVar => 
              this.isTrueParentChild(variation, diffVar)
            );
            
            if (hasNumericChild) {
              return true;
            }
          }
        }
        
        return false;
      });
      
      if (isParent) {
        classes.push(HIGHLIGHT_CSS_CLASSES.PARENT_CHANGED);
        return classes;
      }
    }
    
    return classes;
  }
  
  /**
   * Maps diff types to CSS classes based on which panel the node is in
   */
  private getDiffClass(diffType: string, viewerId: ViewerId): string | null {
    switch (diffType) {
      case 'added':
        return viewerId === 'right' ? HIGHLIGHT_CSS_CLASSES.ADDED : null;
      case 'removed':
        return viewerId === 'left' ? HIGHLIGHT_CSS_CLASSES.DELETED : null;
      case 'changed':
        return HIGHLIGHT_CSS_CLASSES.CHANGED;
      default:
        return null;
    }
  }

  /**
   * Determines if parentPath is a true parent of childPath (not a sibling)
   * @param parentPath The potential parent path
   * @param childPath The potential child path
   * @returns true if parentPath is a true parent of childPath
   */
  private isTrueParentChild(parentPath: string, childPath: string): boolean {
    // Basic check: child must start with parent + separator
    if (!childPath.startsWith(parentPath + '.') && !childPath.startsWith(parentPath + '[')) {
      return false;
    }

    // Extract what comes after the potential parent path
    const remainder = childPath.substring(parentPath.length);
    
    // Must start with a separator
    if (!remainder.startsWith('.') && !remainder.startsWith('[')) {
      return false;
    }
    
    // For a true parent-child relationship, we need to ensure:
    // 1. The child path is actually nested under the parent
    // 2. We're not dealing with siblings that share the same immediate parent
    
    // Segment analysis removed as it was not used in the final logic
    // The function relies on simple substring pattern matching instead
    
    // If there's nothing after the first segment, this is a direct child
    // We want to return true for direct children (like parent.child)
    // but false for siblings that happen to start with the same path
    
    // The key insight: if parentPath ends with the same segment as the diff starts with,
    // and they have the same length, they're likely siblings
    
    // Check if this could be a sibling relationship
    // Example: parent = "obj.contributions", child = "obj.contributionType"
    // Both have the same parent "obj" but different final segments
    
    // Count segments more accurately by counting dots and array accessors
    // Each . represents a field access, each [ represents an array/object access
    const countSegments = (path: string): number => {
      let count = 0;
      let i = 0;
      while (i < path.length) {
        if (path[i] === '.') {
          count++;
        } else if (path[i] === '[') {
          count++;
          // Skip to the end of this bracket segment
          while (i < path.length && path[i] !== ']') {
            i++;
          }
        }
        i++;
      }
      return count;
    };
    
    const parentSegmentCount = countSegments(parentPath);
    const childSegmentCount = countSegments(childPath);
    
    // If they have the same number of segments, they're at the same level (siblings)
    if (parentSegmentCount === childSegmentCount) {
      return false;
    }
    
    // If parent has fewer segments, it's a true parent
    return parentSegmentCount < childSegmentCount;
  }
  
  /**
   * Update the diff results (useful when new comparisons are performed)
   */
  updateDiffResults(newDiffResults: DiffResult[]): void {
    this.diffResults = newDiffResults;
  }
  
  /**
   * Get all paths that have highlighting (useful for debugging)
   */
  getHighlightedPaths(): string[] {
    return this.diffResults.map(diff => diff.idBasedPath);
  }
  
  /**
   * Check if a path has any highlighting
   */
  hasHighlighting(nodePath: AnyPath, viewerId: ViewerId, context: PathConversionContext): boolean {
    const classes = this.getHighlightingClasses(nodePath, viewerId, context);
    return classes.length > 0;
  }
}

/**
 * Factory function to create a new highlighting processor
 */
export function createNewHighlightingProcessor(diffResults: DiffResult[]): NewHighlightingProcessor {
  return new NewHighlightingProcessor(diffResults);
}

/**
 * Utility function to get highlighting class for a single diff result
 * (backwards compatibility helper)
 */
export function getHighlightingClassForDiff(
  diff: DiffResult,
  nodePath: AnyPath,
  viewerId: ViewerId,
  context: PathConversionContext
): string | null {
  const processor = new NewHighlightingProcessor([diff]);
  const classes = processor.getHighlightingClasses(nodePath, viewerId, context);
  return classes.length > 0 ? classes[0] : null;
}