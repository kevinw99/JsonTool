import React, { useRef, useEffect, useContext, useMemo, useState } from 'react';
import './JsonTreeView.css';
import './ResponsiveFix.css';
import { JsonViewerSyncContext } from './JsonViewerSyncContext';
import { ContextMenu } from './ContextMenu/ContextMenu';
import type { ContextMenuAction } from './ContextMenu/ContextMenu';
import type { DiffResult, IdKeyInfo } from '../utils/jsonCompare';

// Utility hook to get the previous value of a variable
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

// Types for JSON values
export type JsonValue = 
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];


// Function to get the path suffix for an array item
export const getItemPathSuffix = (item: JsonValue, index: number, idKey: string | null): string => {
  if (idKey && typeof item === 'object' && item !== null && !Array.isArray(item)) {
    if (idKey in item) {
      const opaqueValue = (item as JsonObject)[idKey];
      // Path segment becomes [<actual_id_key_name>=<opaque_value_from_json>]
      // No "::index" is appended to the opaqueValue.
      const suffix = `[${idKey}=${String(opaqueValue)}]`;
      // console.log(`[getItemPathSuffix] Using idKey \\"${idKey}\\", value \\"${opaqueValue}\\". Suffix: \\"${suffix}\\" for index ${index}`);
      return suffix;
    }
  }
  // Fallback to numeric index if idKey not present, not applicable, or item doesn't have the key
  // console.log(`[getItemPathSuffix] Fallback to index ${index}. Suffix: \\"[${index}]\\"`);
  return `[${index}]`;
};

interface JsonNodeProps {
  data: JsonValue;
  path: string; 
  level: number;
  viewerId: string;
  nodeKey?: string; 
  isLastChild?: boolean; 
  jsonSide?: 'left' | 'right'; 
  idKeySetting: string | null; 
  actualNumericIndex?: number; // Added to store the true numeric index for array items
  showDiffsOnly?: boolean; // Added prop
  onNodeToggle?: (path: string) => void; // Added prop
  isCompareMode?: boolean; // Added prop to indicate if we're comparing two files
}

export const JsonNode: React.FC<JsonNodeProps> = ({ 
  data, 
  path, 
  level,
  viewerId, 
  nodeKey,
  isLastChild = false, 
  jsonSide,
  idKeySetting,
  actualNumericIndex, // Destructure here
  showDiffsOnly, // Destructure added prop
  onNodeToggle, // Destructure added prop
  isCompareMode = false, // Destructure added prop with default value
}) => {
  // If data is null at the root (level 0) or anywhere, and it's not explicitly part of a key-value pair where null is the value,
  // we might want to render nothing or a placeholder. 
  // For now, if data is null and there's no nodeKey (implying it's likely a root null), render nothing.
  // This also handles cases where a fetch might return null.
  if (data === null && nodeKey === undefined && level === 0) {
    // console.log(`[JsonNode VId:${viewerId}] Root data is null. Rendering nothing.`);
    return null;
  }

  const context = useContext(JsonViewerSyncContext);
  if (!context) { 
    console.error("JsonViewerSyncContext not found! Ensure JsonNode is rendered within a JsonViewerSyncProvider.");
    return null; 
  }
  const { 
    expandedPaths, 
    toggleExpand, 
    highlightPath, // Assumed to be numerically indexed for array segments from context
    persistentHighlightPath, // For persistent border highlighting
    diffResults: diffResultsData,
    showDiffsOnly: showDiffsOnlyContext, 
    ignoredDiffs,
    forceSortedArrays, // New property for forced array sorting
    toggleArraySorting, // Method to toggle array sorting
    syncToCounterpart, // Method to sync nodes
    addIgnoredPatternFromRightClick, // Method to add patterns from right-click
    removeIgnoredPatternByPath, // Method to remove patterns by path
    isPathIgnoredByPattern, // Method to check if path is ignored by pattern
  } = context;
  
  const nodeRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    actions: ContextMenuAction[];
  } | null>(null);

  // Calculate the generic numeric path for this node, to be used with context state (expandedPaths, highlightPath)
  const genericNumericPathForNode = useMemo(() => {
    // 1. Strip viewer-specific prefix (e.g., "root_viewer1_" or "root_viewer2_") to get a base path.
    // The `path` prop for JsonNode already includes the viewerId, e.g., "root_viewer1_root.some.path"
    // We need to normalize this to match the context's generic paths like "root.some.path"
    let basePath = path.replace(/^root_(viewer1|viewer2)_/, '');

    // 2. Convert ID-based array indices to numeric indices
    if (idKeySetting && basePath.includes(`[${idKeySetting}=`)) {
      // For nodes that are array items themselves, use actualNumericIndex
      if (actualNumericIndex !== undefined) {
        const lastBracket = basePath.lastIndexOf('[');
        if (lastBracket > -1) {
          const parentPathPart = basePath.substring(0, lastBracket);
          basePath = `${parentPathPart}[${actualNumericIndex}]`;
        }
      } else {
        // For child nodes of array items, try to determine the numeric index
        // Split the path and find all array segments
        const pathParts = basePath.split('.');
        const convertedParts = pathParts.map(part => {
          if (part.includes(`[${idKeySetting}=`)) {
            // This is an ID-based array reference
            // For now, let's use a simple heuristic: use index 0 as default
            // In a real implementation, we'd need to track the mapping
            return part.replace(new RegExp(`\\[${idKeySetting}=([^\\]]+)\\]`), '[0]');
          }
          return part;
        });
        basePath = convertedParts.join('.');
      }
    }
    
    return basePath;
  }, [path, viewerId, actualNumericIndex, idKeySetting]); // Dependencies for useMemo

  // Moved these declarations earlier as they don't depend on path processing for their definition
  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const hasChildren = isObject && (isArray ? (data as JsonArray).length > 0 : Object.keys(data as JsonObject).length > 0);

  // Path normalization for diff checks (highlightPath is already normalized)
  const normalizedPathForDiff = useMemo(() => {
    // The genericNumericPathForNode includes "root." prefix, but diff numericPath doesn't
    // So we need to remove "root." for comparison with diff results
    let normalized = genericNumericPathForNode;
    if (normalized.startsWith('root.')) {
      normalized = normalized.substring(5); // Remove "root."
    } else if (normalized === 'root') {
      normalized = ''; // Root becomes empty string for comparison
    }
    return normalized;
  }, [genericNumericPathForNode]);
  
  const isHighlighted = (() => {
    if (!highlightPath) return false; 
    // highlightPath from context is already generic and numeric.
    // Compare it with the node's generic numeric path.
    // console.log(`[JsonNode VId:${viewerId}] Highlight Check: Node's genericNumericPathForNode=\\"${genericNumericPathForNode}\\", context.highlightPath=\\"${highlightPath}\\"`);
    return highlightPath === genericNumericPathForNode;
  })();

  const isPersistentlyHighlighted = (() => {
    if (!persistentHighlightPath) return false; 
    // persistentHighlightPath from context is already generic and numeric.
    // Compare it with the node's generic numeric path.
    return persistentHighlightPath === genericNumericPathForNode;
  })();

  const isExpanded = (() => {
    // expandedPaths from context is a Set of generic numeric paths.
    // Check if the node's generic numeric path is in the Set.
    const expanded = expandedPaths.has(genericNumericPathForNode);
    // if (path.includes('\\'accountParams\\'')) {
    //   console.log(`[JsonNode VId:${viewerId}] Expansion Check for \\"${path}\\" (Generic: \\"${genericNumericPathForNode}\\"): expandedPaths.has() returns ${expanded}. expandedPaths:`, Array.from(expandedPaths));
    // }
    return expanded;
  })();

  // DEBUG LOG: Print expandedPaths when a node is highlighted
  // if (isHighlighted) {
  //   console.log(`[JsonNode DEBUG VId:${viewerId}] HIGHLIGHTED Path: \\"${path}\\". GenericNumeric: \\"${genericNumericPathForNode}\\". IsExpanded: ${isExpanded}. Current expandedPaths: ${JSON.stringify(Array.from(expandedPaths))}`);
  // }

  // LOG ADDED: Log node's path and its expansion status (can be kept or removed after debugging)
  // console.log(`[JsonNode VId:${viewerId}] Path: \\"${path}\\", GenericNumeric: \\"${genericNumericPathForNode}\\", IsExpanded: ${isExpanded}, IsHighlighted: ${isHighlighted}, HasChildren: ${hasChildren}`);

  useEffect(() => {
    // Only auto-expand if this is an object/array with children that should be expanded
    // For array navigation from ID Keys panel, we want to highlight the array but not auto-expand it
    // unless it's specifically requested
    const shouldAutoExpand = isHighlighted && (isObject || isArray) && hasChildren && !isExpanded;
    
    // Don't auto-expand array elements (paths ending with [number])
    const isArrayElement = genericNumericPathForNode.match(/\[\d+\]$/);
    
    if (shouldAutoExpand && !isArrayElement) { 
      console.log(`[JsonNode VId:${viewerId}] Auto-expanding highlighted node: "${path}" (generic: "${genericNumericPathForNode}")`);
      // Pass the node's generic numeric path to toggleExpand for auto-expansion
      toggleExpand(genericNumericPathForNode); 
    }
  }, [isHighlighted, path, hasChildren, isExpanded, viewerId, isObject, isArray, toggleExpand, genericNumericPathForNode]); // Added genericNumericPathForNode to dependencies
  
  const prevIsHighlighted = usePrevious(isHighlighted);
  const [isPendingScroll, setIsPendingScroll] = useState(false);

  // Effect to arm the scroll trigger when a node becomes highlighted
  useEffect(() => {
    if (isHighlighted && !prevIsHighlighted) {
      setIsPendingScroll(true);
    }
    // Disarm the trigger if the node is no longer highlighted
    if (!isHighlighted && prevIsHighlighted) {
      setIsPendingScroll(false);
    }
  }, [isHighlighted, prevIsHighlighted]);

  // Effect to execute the scroll once armed and the node is ready (expanded or has no children)
  useEffect(() => {
    if (isPendingScroll && nodeRef.current) {
      const isReadyForScroll = isExpanded || !hasChildren;
      if (isReadyForScroll) {
        const scrollContainer = nodeRef.current.closest('.json-viewer-scroll-container');
        
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const nodeRect = nodeRef.current.getBoundingClientRect();
          
          // Calculate the node's position relative to the container's viewport
          const offsetTopInContainer = nodeRect.top - containerRect.top;
          
          // Calculate the desired scrollTop to center the node
          const desiredScrollTop = scrollContainer.scrollTop + offsetTopInContainer - (containerRect.height / 2) + (nodeRect.height / 2);
          
          scrollContainer.scrollTo({
            top: desiredScrollTop,
            behavior: 'smooth'
          });

        } else {
          console.warn("Scroll container .json-viewer-scroll-container not found. Falling back to scrollIntoView.");
          nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setIsPendingScroll(false); // Disarm trigger after scrolling
      }
    }
  }, [isPendingScroll, isExpanded, hasChildren]);
  
  const getNodeDiffStatus = (): string[] => {
    if (!diffResultsData || diffResultsData.length === 0) return [];

    const relevantDiffs = diffResultsData.filter((diff: DiffResult) => 
      diff.numericPath && !ignoredDiffs.has(diff.numericPath)
    );

    const classes: string[] = [];

    // Debug logging for diff status (only when needed)
    const shouldDebug = normalizedPathForDiff.includes('currentContributionOverride');
    if (shouldDebug) {
      console.log(`[JsonNode VId:${viewerId}] Processing currentContributionOverride:`, {
        path,
        normalizedForDiff: normalizedPathForDiff,
        diffMatches: relevantDiffs.filter(d => d.numericPath === normalizedPathForDiff)
      });
    }

    // Check for EXACT matches first (this node IS the diff)
    for (const diff of relevantDiffs) {
      if (!diff.numericPath) continue;

      // Direct path match - the numericPath should already be in the correct format
      if (normalizedPathForDiff === diff.numericPath) {
        if (diff.type === 'added' && jsonSide === 'right') {
          classes.push('json-added');
        } else if (diff.type === 'removed' && jsonSide === 'left') {
          classes.push('json-deleted');
        } else if (diff.type === 'changed') {
          classes.push('json-changed');
        }
        console.log(`[JsonNode VId:${viewerId}] ✅ DIRECT MATCH: "${normalizedPathForDiff}" matches "${diff.numericPath}" -> ${diff.type}`);
        return classes; // Return immediately for exact matches
      }
    }

    // If no exact match, check if this node is a PARENT of any diff
    for (const diff of relevantDiffs) {
      if (!diff.numericPath) continue;

      // Check direct parent relationship
      const isDirectParent = (
        normalizedPathForDiff && 
        (diff.numericPath.startsWith(normalizedPathForDiff + '.') || 
         diff.numericPath.startsWith(normalizedPathForDiff + '['))
      );

      if (isDirectParent) {
        classes.push('json-parent-changed');
        console.log(`[JsonNode VId:${viewerId}] ✅ PARENT MATCH: "${normalizedPathForDiff}" is parent of "${diff.numericPath}"`);
        return classes; // Return immediately
      }
    }

    // Root node check - if this is the root node and there are any diffs, mark as parent
    if (normalizedPathForDiff === '' && relevantDiffs.length > 0) {
      classes.push('json-parent-changed');
      return classes;
    }

    return classes;
  };
  
  const diffStatusClasses = getNodeDiffStatus(); // This returns an array of classes
  const diffStatus = diffStatusClasses.join(' '); // Join for compatibility with existing code

  const calculateIsVisibleInDiffsOnlyMode = (): boolean => {
    // Use showDiffsOnly from props if available, otherwise from context
    const currentShowDiffsOnly = typeof showDiffsOnly === 'boolean' ? showDiffsOnly : showDiffsOnlyContext;

    if (!currentShowDiffsOnly) {
      return true;
    }

    if (!diffResultsData || diffResultsData.length === 0) {
      return false; 
    }

    if (path.endsWith('_root')) {
      // A root is visible in diffs only mode if there are any relevant (non-ignored) diffs.
      const anyRelevantDiffs = diffResultsData.some((diff: DiffResult) => 
        diff.numericPath && !ignoredDiffs.has(diff.numericPath) // Changed .includes to .has
      );
      // console.log(`[isVisibleInDiffsOnlyMode VId:${viewerId}] Root node \\"${path}\\". Any relevant diffs: ${anyRelevantDiffs}`);
      return anyRelevantDiffs;
    }

    // For non-root nodes:
    // 1. Check if the node itself is a diff (added, removed, changed).
    // 2. Check if the node is an ancestor of any diff.
    const isNodeADiff = diffResultsData.some((diff: DiffResult) => 
      diff.numericPath && diff.numericPath === normalizedPathForDiff && !ignoredDiffs.has(diff.numericPath) // Changed .includes to .has
    );

    if (isNodeADiff) {
      // console.log(`[isVisibleInDiffsOnlyMode VId:${viewerId}] Path \\"${path}\\" (Normalized: \\"${normalizedPathForDiff}\\") IS a diff. Visible: true`);
      return true;
    }

    const isAncestorOfDiff = diffResultsData.some((diff: DiffResult) => {
      if (!diff.numericPath || ignoredDiffs.has(diff.numericPath)) return false; // Changed .includes to .has
      // Ensure normalizedPathForDiff is not empty before creating pathToCheck/arrayPathToCheck
      if (normalizedPathForDiff && 
          (diff.numericPath.startsWith(normalizedPathForDiff + '.') || 
           diff.numericPath.startsWith(normalizedPathForDiff + '['))) {
        return true;
      }
      return false;
    });

    if (isAncestorOfDiff) {
      // console.log(`[isVisibleInDiffsOnlyMode VId:${viewerId}] Path \\"${path}\\" (Normalized: \\"${normalizedPathForDiff}\\") IS an ANCESTOR of a diff. Visible: true`);
      return true;
    }
    
    // console.log(`[isVisibleInDiffsOnlyMode VId:${viewerId}] Path \\"${path}\\" (Normalized: \\"${normalizedPathForDiff}\\") - Not a diff and not an ancestor. Visible: false`);
    return false;
  };

  const isVisibleNode = calculateIsVisibleInDiffsOnlyMode();
  
  // Use showDiffsOnly from props if available, otherwise from context for the final check
  const currentShowDiffsOnlyFinal = typeof showDiffsOnly === 'boolean' ? showDiffsOnly : showDiffsOnlyContext;

  if (currentShowDiffsOnlyFinal && !isVisibleNode) {
    return null;
  }

  const toggleExpansion = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Pass the node's generic numeric path to the context's toggleExpand
    // console.log(`[JsonNode VId:${viewerId}] User Toggling Expansion for path: \\"${path}\\". Calling toggleExpand with generic numeric path: \\"${genericNumericPathForNode}\\"`);
    toggleExpand(genericNumericPathForNode);
    if (onNodeToggle) { // Call onNodeToggle if provided
        onNodeToggle(genericNumericPathForNode);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const actions: ContextMenuAction[] = [];
    
    // Ignore action - add this node's path to ignored patterns
    const isCurrentlyIgnored = normalizedPathForDiff && isPathIgnoredByPattern(normalizedPathForDiff);
    actions.push({
      label: isCurrentlyIgnored ? 'Unignore this diff' : 'Ignore this diff',
      icon: isCurrentlyIgnored ? '✅' : '🚫',
      action: () => {
        if (normalizedPathForDiff) {
          if (isCurrentlyIgnored) {
            // Remove the pattern for this path
            removeIgnoredPatternByPath(normalizedPathForDiff);
            console.log(`[ContextMenu] Removed ignore pattern for path: "${normalizedPathForDiff}"`);
          } else {
            // Add as a pattern to get full filtering behavior
            addIgnoredPatternFromRightClick(normalizedPathForDiff);
            console.log(`[ContextMenu] Added ignore pattern for path: "${normalizedPathForDiff}"`);
          }
        }
      }
    });

    // Sort action - only available for arrays
    if (isArray && hasChildren) {
      const isCurrentlySorted = forceSortedArrays.has(genericNumericPathForNode);
      actions.push({
        label: isCurrentlySorted ? 'Disable Sorting' : 'Sort Array',
        icon: isCurrentlySorted ? '🔄' : '🔽',
        action: () => {
          console.log(`[ContextMenu] Toggling array sorting for: "${genericNumericPathForNode}"`);
          toggleArraySorting(genericNumericPathForNode);
        }
      });
    }

    // Sync action - navigate to counterpart in other viewer (only in compare mode)
    if (isCompareMode) {
      actions.push({
        label: 'Sync to Counterpart',
        icon: '↔️',
        action: () => {
          syncToCounterpart(path, viewerId);
          console.log(`[ContextMenu] Syncing to counterpart for: "${path}"`);
        }
      });
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      actions
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };
  
  const formatValue = (val: JsonValue): string => {
    if (val === null) return 'null';
    if (typeof val === 'string') {
      if (val.length > 200) {
        const truncated = val.substring(0, 200);
        return `${truncated}... (${val.length} chars)`; 
      }
      return val; 
    }
    return String(val);
  };
  
  const nodeClasses = [
    'json-node',
    isLastChild ? 'last-child' : '',
    isHighlighted ? 'highlighted-node' : '',
    isPersistentlyHighlighted ? 'persistent-highlight' : '',
    ...diffStatusClasses, // Spread the array of diff classes
  ].filter(Boolean).join(' ');

  // Debug logging for CSS visibility issues
  if (DEBUG_CSS_HIGHLIGHTING && diffStatusClasses.length > 0) {
    console.log(`[JsonTreeView Debug] Path: ${path}, Classes: ${diffStatusClasses.join(', ')}, Final nodeClasses: ${nodeClasses}`);
  }

  // Create content-specific classes
  const contentClasses = [
    'json-node-content',
    hasChildren ? 'clickable' : '',
  ].filter(Boolean).join(' ');



  if (isArray && data) {
    const arrData = data as JsonArray;
    return (
      <div 
        className={nodeClasses} 
        ref={nodeRef} 
        style={{ '--level': level } as React.CSSProperties}
        data-path={genericNumericPathForNode}
        data-original-path={path}
        onContextMenu={handleContextMenu}
      >
        <div className={contentClasses} onClick={hasChildren ? toggleExpansion : undefined}>
          <span className={`expander ${isExpanded ? 'expanded' : 'collapsed'} ${hasChildren ? '' : 'no-children'}`}>
            {hasChildren ? (isExpanded ? '▼' : '►') : ''}
          </span>
          <span className={`json-key ${diffStatus}`}>{nodeKey !== undefined ? `${nodeKey}:` : ''}</span>
          <span className="json-bracket">[</span>
          {!isExpanded && hasChildren && (
            <>
              <span className="json-collapsed-hint">Array({arrData.length})</span>
              <span className="json-bracket">]</span>
            </>
          )}
          {(!isExpanded && hasChildren) || (!hasChildren && <span className="json-bracket">]</span>)}
        </div>
        {isExpanded && hasChildren && (
          <div className="json-node-children">
            {(() => {
              // Sort array by ID key if idKeySetting is provided OR if this array is in forceSortedArrays
              const shouldSort = idKeySetting || forceSortedArrays.has(genericNumericPathForNode);
              const isForced = forceSortedArrays.has(genericNumericPathForNode);
              
              let sortedData = [...arrData];
              let sortedIndexMap = new Map<number, number>(); // Maps sorted index to original index
              
              if (shouldSort) {
                const sortReason = idKeySetting ? `ID key "${idKeySetting}"` : 'forced via context menu';
                console.log(`[JsonTreeView] 🔍 Sorting array: ${sortReason} (${arrData.length} items)`);
                
                // Debug: Show first item structure only if forced sorting and no ID key
                if (isForced && !idKeySetting && arrData.length > 0) {
                  const firstItem = arrData[0];
                  if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
                    console.log(`[JsonTreeView] 🔍 Available fields:`, Object.keys(firstItem as JsonObject).slice(0, 5));
                  }
                }
                
                // IMPORTANT: Log before and after sorting to verify it's working
                console.log(`[JsonTreeView] 🚨 BEFORE SORTING:`, arrData.map((item, i) => 
                  typeof item === 'object' && item !== null && !Array.isArray(item) && idKeySetting && idKeySetting in item 
                    ? `[${i}]: {${idKeySetting}: "${(item as JsonObject)[idKeySetting]}"}`
                    : `[${i}]: ${typeof item}`
                ).slice(0, 3));
                
                // Create array of {item, originalIndex} pairs
                const itemsWithOriginalIndex = arrData.map((item, originalIndex) => ({
                  item,
                  originalIndex
                }));
                
                // Show what keys are available in items for debugging
                const sampleKeys = new Set<string>();
                itemsWithOriginalIndex.slice(0, 3).forEach(({ item }) => {
                  if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                    Object.keys(item).forEach(key => sampleKeys.add(key));
                  }
                });
                console.log(`[JsonTreeView] Sample keys in items: ${Array.from(sampleKeys).join(', ')}`);
                
                const beforeOrder = itemsWithOriginalIndex.map(({ item, originalIndex }) => {
                  if (typeof item === 'object' && item !== null && !Array.isArray(item) && idKeySetting && idKeySetting in item) {
                    return `${originalIndex}:${(item as JsonObject)[idKeySetting]}`;
                  }
                  return `${originalIndex}:${JSON.stringify(item).substring(0, 30)}...`;
                });
                console.log(`[JsonTreeView] Before sort: [${beforeOrder.join(', ')}]`);
                
                console.log(`[JsonTreeView] Original order:`, itemsWithOriginalIndex.map(({item, originalIndex}) =>
                  typeof item === 'object' && item !== null && !Array.isArray(item) && idKeySetting && idKeySetting in item 
                    ? `[${originalIndex}]: ${(item as JsonObject)[idKeySetting]}`
                    : `[${originalIndex}]: no-id`
                ).slice(0, 3));
                
                // Sort by ID key value if available, otherwise by string representation
                itemsWithOriginalIndex.sort((a, b) => {
                  if (idKeySetting) {
                    const aHasId = typeof a.item === 'object' && a.item !== null && !Array.isArray(a.item) && idKeySetting in a.item;
                    const bHasId = typeof b.item === 'object' && b.item !== null && !Array.isArray(b.item) && idKeySetting in b.item;
                    
                    // If both have the ID key, sort by it
                    if (aHasId && bHasId) {
                      const aId = String((a.item as JsonObject)[idKeySetting]);
                      const bId = String((b.item as JsonObject)[idKeySetting]);
                      return aId.localeCompare(bId);
                    }
                    
                    // If neither has the ID key, fall back to JSON string comparison
                    if (!aHasId && !bHasId) {
                      const aStr = JSON.stringify(a.item);
                      const bStr = JSON.stringify(b.item);
                      return aStr.localeCompare(bStr);
                    }
                    
                    // Items with ID key come first
                    if (aHasId && !bHasId) return -1;
                    if (!aHasId && bHasId) return 1;
                    
                    return 0; // Should never reach here
                  } else {
                    // Fallback sorting by JSON string representation
                    const aStr = JSON.stringify(a.item);
                    const bStr = JSON.stringify(b.item);
                    return aStr.localeCompare(bStr);
                  }
                });
                
                const afterOrder = itemsWithOriginalIndex.map(({ item, originalIndex }) => {
                  if (typeof item === 'object' && item !== null && !Array.isArray(item) && idKeySetting && idKeySetting in item) {
                    return `${originalIndex}:${(item as JsonObject)[idKeySetting]}`;
                  }
                  return `${originalIndex}:${JSON.stringify(item).substring(0, 30)}...`;
                });
                console.log(`[JsonTreeView] After sort: [${afterOrder.join(', ')}]`);
                
                console.log(`[JsonTreeView] Sorted order:`, itemsWithOriginalIndex.map(({item, originalIndex}) =>
                  typeof item === 'object' && item !== null && !Array.isArray(item) && idKeySetting && idKeySetting in item 
                    ? `[${originalIndex}]: ${(item as JsonObject)[idKeySetting]}`
                    : `[${originalIndex}]: no-id`
                ).slice(0, 3));
                
                // Extract sorted data and build index map
                sortedData = itemsWithOriginalIndex.map(({ item }) => item);
                itemsWithOriginalIndex.forEach(({ originalIndex }, sortedIndex) => {
                  sortedIndexMap.set(sortedIndex, originalIndex);
                });
                
                // IMPORTANT: Log after sorting to verify it's working  
                console.log(`[JsonTreeView] 🚨 AFTER SORTING:`, sortedData.map((item, i) => 
                  typeof item === 'object' && item !== null && !Array.isArray(item) && idKeySetting && idKeySetting in item 
                    ? `[${i}]: {${idKeySetting}: "${(item as JsonObject)[idKeySetting]}"}`
                    : `[${i}]: ${typeof item}`
                ).slice(0, 3));
                
                if (isForced) {
                  console.log(`[JsonTreeView] ✅ Force-sorted array complete`);
                }
              } else {
                // No sorting, create identity mapping
                arrData.forEach((_, index) => {
                  sortedIndexMap.set(index, index);
                });
              }
              
              return sortedData.map((itemValue, sortedIndex) => {
                const originalIndex = sortedIndexMap.get(sortedIndex) ?? sortedIndex;
                const itemPathSuffix = getItemPathSuffix(itemValue, originalIndex, idKeySetting);
                const childPath = `${path}${itemPathSuffix}`;
                return (
                  <JsonNode
                    key={`${viewerId}-${childPath}`}
                    data={itemValue}
                    path={childPath}
                    level={level + 1}
                    viewerId={viewerId}
                    isLastChild={sortedIndex === sortedData.length - 1}
                    jsonSide={jsonSide}
                    idKeySetting={idKeySetting}
                    actualNumericIndex={originalIndex}
                    showDiffsOnly={showDiffsOnly}
                    onNodeToggle={onNodeToggle}
                    isCompareMode={isCompareMode}
                  />
                );
              });
            })()}
            <div className="json-node json-closing-bracket-node" style={{paddingLeft: `${level * 20}px`}}>
              <span className="json-bracket json-closing-bracket">]</span>
            </div>
          </div>
        )}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            actions={contextMenu.actions}
            onClose={closeContextMenu}
          />
        )}
      </div>
    );
  } else if (isObject && data) {
    const objData = data as JsonObject;
    const entries = Object.entries(objData);
    return (
      <div 
        className={nodeClasses} 
        ref={nodeRef} 
        style={{ '--level': level } as React.CSSProperties}
        data-path={genericNumericPathForNode}
        data-original-path={path}
        onContextMenu={handleContextMenu}
      >
        <div className={contentClasses} onClick={hasChildren ? toggleExpansion : undefined}>
          <span className={`expander ${isExpanded ? 'expanded' : 'collapsed'} ${hasChildren ? '' : 'no-children'}`}>
            {hasChildren ? (isExpanded ? '▼' : '►') : ''}
          </span>
          <span className={`json-key ${diffStatus}`}>{nodeKey !== undefined ? `${nodeKey}:` : ''}</span>
          <span className="json-brace">{'{'}</span>
          {!isExpanded && hasChildren && (
            <>
              <span className="json-collapsed-hint">Object({entries.length})</span>
              <span className="json-brace">{'}'}</span>
            </>
          )}
          {(!isExpanded && hasChildren) || (!hasChildren && <span className="json-brace">{'}'}</span>)}
        </div>
        {isExpanded && hasChildren && (
          <div className="json-node-children">
            {entries.map(([key, value], index) => {
              const childPath = `${path}.${key}`;
              return (
                <JsonNode
                  key={`${viewerId}-${childPath}`}
                  data={value}
                  path={childPath}
                  level={level + 1}
                  viewerId={viewerId}
                  nodeKey={key}
                  isLastChild={index === entries.length - 1}
                  jsonSide={jsonSide}
                  idKeySetting={idKeySetting}
                  showDiffsOnly={showDiffsOnly}
                  onNodeToggle={onNodeToggle}
                  isCompareMode={isCompareMode}
                />
              );
            })}
            <div className="json-node json-closing-brace-node" style={{paddingLeft: `${level * 20}px`}}>
              <span className="json-brace json-closing-brace">{'}'}</span>
            </div>
          </div>
        )}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            actions={contextMenu.actions}
            onClose={closeContextMenu}
          />
        )}
      </div>
    );
  } else {
    // For primitive values, render directly
    return (
      <div 
        className={nodeClasses} 
        ref={nodeRef} 
        style={{ '--level': level } as React.CSSProperties}
        data-path={genericNumericPathForNode}
        data-original-path={path}
        onContextMenu={handleContextMenu}
      >
        <div className={contentClasses}>
          <span className="expander no-children" />
          <span className={`json-key ${diffStatus}`}>{nodeKey !== undefined ? `${nodeKey}:` : ''}</span>
          <span className="json-value">{formatValue(data)}</span>
        </div>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            actions={contextMenu.actions}
            onClose={closeContextMenu}
          />
        )}
      </div>
    );
  }
};

interface JsonTreeViewProps {
  data: JsonValue;
  viewerId: string;
  jsonSide: 'left' | 'right';
  idKeySetting: string | null;
  idKeysUsed?: IdKeyInfo[]; // Added to match App.tsx usage
  showDiffsOnly?: boolean;
  isCompareMode?: boolean; // New prop to indicate if we're comparing two files
}

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data, viewerId, jsonSide, idKeySetting, idKeysUsed, showDiffsOnly, isCompareMode = false }) => {
  return (
    <div className="json-tree-view responsive-no-wrap">
      <JsonNode
        data={data}
        path={`root_${viewerId}_root`}
        level={0}
        viewerId={viewerId}
        jsonSide={jsonSide}
        idKeySetting={idKeySetting}
        showDiffsOnly={showDiffsOnly}
        isCompareMode={isCompareMode}
      />
    </div>
  );
};

// Debug flag for CSS visibility issues
const DEBUG_CSS_HIGHLIGHTING = true;

// Debug function for CSS visibility issues - attach to window for console access
if (typeof window !== 'undefined') {
  (window as any).debugCSSHighlighting = () => {
    const diffNodes = document.querySelectorAll('.json-node.json-changed, .json-node.json-added, .json-node.json-deleted, .json-node.json-parent-changed');
    console.log(`Found ${diffNodes.length} nodes with diff classes:`);
    diffNodes.forEach((node, index) => {
      const element = node as HTMLElement;
      const computedStyle = window.getComputedStyle(element.querySelector('.json-node-content') || element);
      console.log(`Node ${index + 1}:`, {
        element: element,
        classes: element.className,
        backgroundColor: computedStyle.backgroundColor,
        borderLeft: computedStyle.borderLeft,
        transform: computedStyle.transform,
        isolation: computedStyle.isolation,
        willChange: (computedStyle as any).willChange
      });
    });
    return diffNodes;
  };
}
