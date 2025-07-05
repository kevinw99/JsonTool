import { 
  normalizePathForComparison,
  type PathConversionContext 
} from './PathConverter';
import type { DiffResult } from './jsonCompare';
import type { AnyPath } from './PathTypes';
import { unsafeIdBasedPath } from './PathTypes';

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
   * @param jsonSide Which panel this node is in ('left' | 'right')
   * @param context PathConversionContext for path normalization
   * @returns Array of CSS classes to apply
   */
  getHighlightingClasses(
    nodePath: AnyPath,
    jsonSide: 'left' | 'right',
    context: PathConversionContext
  ): string[] {
    const classes: string[] = [];
    
    // Step 1: Normalize the node path to get all possible variations
    const pathVariations = normalizePathForComparison(nodePath, context);
    
    
    // Step 2: Check for exact diff matches
    for (const variation of pathVariations) {
      const exactMatch = this.diffResults.find(diff => {
        // Check both numeric path and display path if available
        const numericVariations = normalizePathForComparison(unsafeIdBasedPath(diff.numericPath), context);
        if (numericVariations.includes(variation)) {
          return true;
        }
        
        // Also check idBasedPath if it exists (for ID-based correlation)
        if (diff.idBasedPath) {
          const idBasedVariations = normalizePathForComparison(unsafeIdBasedPath(diff.idBasedPath), context);
          if (idBasedVariations.includes(variation)) {
            return true;
          }
        }
        
        return false;
      });
      
      if (exactMatch) {
        const diffClass = this.getDiffClass(exactMatch.type, jsonSide);
        if (diffClass) {
          classes.push(diffClass);
          return classes; // Return immediately for exact matches
        }
      }
    }
    
    // Step 3: Check if this is a child of any added/removed/changed element
    for (const variation of pathVariations) {
      const parentDiff = this.diffResults.find(diff => {
        // Check both numeric path and display path for parent relationships
        const numericVariations = normalizePathForComparison(unsafeIdBasedPath(diff.numericPath), context);
        const isChildOfNumeric = numericVariations.some(diffVar => 
          variation.startsWith(diffVar + '.') || 
          variation.startsWith(diffVar + '[')
        );
        
        if (isChildOfNumeric) {
          return true;
        }
        
        // Also check idBasedPath if it exists
        if (diff.idBasedPath) {
          const idBasedVariations = normalizePathForComparison(unsafeIdBasedPath(diff.idBasedPath), context);
          const isChildOfDisplay = idBasedVariations.some(diffVar => 
            variation.startsWith(diffVar + '.') || 
            variation.startsWith(diffVar + '[')
          );
          if (isChildOfDisplay) {
            return true;
          }
        }
        
        return false;
      });
      
      if (parentDiff) {
        const diffClass = this.getDiffClass(parentDiff.type, jsonSide);
        if (diffClass) {
          classes.push(diffClass);
          return classes; // Return immediately for inherited highlighting
        }
      }
    }
    
    // Step 4: Check if this is a parent of any changed element
    for (const variation of pathVariations) {
      const isParent = this.diffResults.some(diff => {
        // Check both numeric path and display path for child relationships
        const numericVariations = normalizePathForComparison(unsafeIdBasedPath(diff.numericPath), context);
        const hasNumericChild = numericVariations.some(diffVar => 
          diffVar.startsWith(variation + '.') || 
          diffVar.startsWith(variation + '[')
        );
        
        if (hasNumericChild) {
          return true;
        }
        
        // Also check idBasedPath if it exists
        if (diff.idBasedPath) {
          const idBasedVariations = normalizePathForComparison(unsafeIdBasedPath(diff.idBasedPath), context);
          const hasDisplayChild = idBasedVariations.some(diffVar => 
            diffVar.startsWith(variation + '.') || 
            diffVar.startsWith(variation + '[')
          );
          if (hasDisplayChild) {
            return true;
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
  private getDiffClass(diffType: string, jsonSide: 'left' | 'right'): string | null {
    switch (diffType) {
      case 'added':
        return jsonSide === 'right' ? HIGHLIGHT_CSS_CLASSES.ADDED : null;
      case 'removed':
        return jsonSide === 'left' ? HIGHLIGHT_CSS_CLASSES.DELETED : null;
      case 'changed':
        return HIGHLIGHT_CSS_CLASSES.CHANGED;
      default:
        return null;
    }
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
    return this.diffResults.map(diff => diff.numericPath);
  }
  
  /**
   * Check if a path has any highlighting
   */
  hasHighlighting(nodePath: AnyPath, jsonSide: 'left' | 'right', context: PathConversionContext): boolean {
    const classes = this.getHighlightingClasses(nodePath, jsonSide, context);
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
  jsonSide: 'left' | 'right',
  context: PathConversionContext
): string | null {
  const processor = new NewHighlightingProcessor([diff]);
  const classes = processor.getHighlightingClasses(nodePath, jsonSide, context);
  return classes.length > 0 ? classes[0] : null;
}