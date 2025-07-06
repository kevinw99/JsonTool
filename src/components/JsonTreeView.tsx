import React, { useRef, useEffect, useContext, useMemo, useState } from 'react';
import './JsonTreeView.css';
import './ResponsiveFix.css';
import { JsonViewerSyncContext } from './JsonViewerSyncContext';
import { ContextMenu } from './ContextMenu/ContextMenu';
import type { ContextMenuAction } from './ContextMenu/ContextMenu';
import type { DiffResult, IdKeyInfo } from '../utils/jsonCompare';
import { convertIdPathToIndexPath, type PathConversionContext } from '../utils/PathConverter';
import type { IdBasedPath, ViewerId } from '../utils/PathTypes';
import { createIdBasedPath, createViewerPath } from '../utils/PathTypes';

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
  path: IdBasedPath; // Paths in JsonTreeView are always ID-based (may include [id=value] segments)
  level: number;
  viewerId: string;
  nodeKey?: string; 
  isLastChild?: boolean; 
  jsonSide?: 'left' | 'right'; 
  idKeySetting: string | null; 
  actualNumericIndex?: number; // Added to store the true numeric index for array items
  showDiffsOnly?: boolean; // Added prop
  onNodeToggle?: (path: IdBasedPath) => void; // Updated to use strict type
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
    persistentHighlightPaths, // For viewer-specific highlighting
    diffResults: diffResultsData,
    highlightingProcessor, // New: PathConverter-based highlighting processor
    showDiffsOnly: showDiffsOnlyContext, 
    ignoredDiffs,
    forceSortedArrays, // New property for forced array sorting
    toggleArraySorting, // Method to toggle array sorting
    syncToCounterpart, // Method to sync nodes
    addIgnoredPatternFromRightClick, // Method to add patterns from right-click
    removeIgnoredPatternByPath, // Method to remove patterns by path
    isPathIgnoredByPattern, // Method to check if path is ignored by pattern
    jsonData, // PathConverter context data
    idKeysUsed, // PathConverter context data
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
    // 1. Strip viewer-specific prefix (e.g., "root_left_" or "root_right_") to get a base path.
    let basePath = path.replace(/^root_(left|right)_/, '');

    // 2. Convert ID-based array indices to numeric indices using PathConverter
    if (basePath.includes('[id=')) {
      // Get JSON data and ID keys from context for PathConverter
      const jsonData = viewerId === 'left' ? 
        (context as any)?.jsonData?.left : 
        (context as any)?.jsonData?.right;
      const idKeysUsed = (context as any)?.idKeysUsed;
      
      if (jsonData && idKeysUsed) {
        try {
          const sourceContext = { jsonData, idKeysUsed };
          const convertedPath = convertIdPathToIndexPath(
            createIdBasedPath(basePath),
            sourceContext,
            { preservePrefix: true }
          );
          if (convertedPath) {
            basePath = convertedPath;
            console.log(`[JsonNode DEBUG] 🔧 PathConverter: "${path}" -> "${basePath}"`);
          }
        } catch (error) {
          console.log(`[JsonNode DEBUG] 🔧 PathConverter failed, using fallback:`, error);
          // Fallback to simple replacement
          const pathParts = basePath.split('.');
          const convertedParts = pathParts.map(part => {
            if (part.includes('[id=')) {
              return part.replace(/\[id=[^\]]+\]/, '[0]');
            }
            return part;
          });
          basePath = convertedParts.join('.');
        }
      }
    }
    
    return basePath;
  }, [path, viewerId, context]); // Dependencies for useMemo

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
    // Check viewer-specific highlighting using ViewerPath
    const viewerSpecificPath = createViewerPath(viewerId as ViewerId, genericNumericPathForNode);
    return persistentHighlightPaths && persistentHighlightPaths.has(viewerSpecificPath);
  })();

  const isExpanded = (() => {
    // Check viewer-specific path expansion state
    const viewerSpecificPath = createViewerPath(viewerId as ViewerId, genericNumericPathForNode);
    const expanded = expandedPaths.has(viewerSpecificPath);
    
    // Explicit logging for contributions nodes
    if (path.includes('contributions') && path.includes('accountParams')) {
      console.log(`[isExpanded] 🔍 Checking expansion for ${viewerId}:`);
      console.log(`[isExpanded] 🔍 Original path: "${path}"`);
      console.log(`[isExpanded] 🔍 genericNumericPathForNode: "${genericNumericPathForNode}"`);
      console.log(`[isExpanded] 🔍 viewerSpecificPath: "${viewerSpecificPath}"`);
      console.log(`[isExpanded] 🔍 expandedPaths.has(viewerSpecificPath): ${expanded}`);
//       console.log(`[isExpanded] 🔍 All expandedPaths:`, Array.from(expandedPaths));
//       console.log(`[isExpanded] 🔍 Filtered contributions paths:`, Array.from(expandedPaths).filter(p => p.includes('contributions')));
    }
    
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
      // For auto-expansion, use numeric path (no cross-viewer sync needed)
      toggleExpand(genericNumericPathForNode); // Auto-expansion - use numeric path
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
    // Early return if no highlighting processor available
    if (!highlightingProcessor || !jsonSide) return [];

    // Build PathConversionContext for path normalization
    const pathContext: PathConversionContext = {
      jsonData: jsonSide === 'left' ? jsonData?.left : jsonData?.right,
      idKeysUsed: idKeysUsed || []
    };

    // Use the original path (with ID-based brackets) for highlighting
    // Strip the viewer prefix to match diff path format
    let pathForHighlighting = path.replace(/^root_(left|right)_/, '');
    if (pathForHighlighting.startsWith('root.')) {
      pathForHighlighting = pathForHighlighting.substring(5); // Remove "root."
    } else if (pathForHighlighting === 'root') {
      pathForHighlighting = ''; // Root becomes empty string for comparison
    }

    // Use the new highlighting processor with the original ID-based path
    const classes = highlightingProcessor.getHighlightingClasses(
      createIdBasedPath(pathForHighlighting),
      jsonSide,
      pathContext
    );

    // Filter out ignored diffs by checking if any of the underlying diffs are ignored
    // This is a simplified approach - we may need to enhance this if needed
    return classes;
  };
  
  const diffStatusClasses = getNodeDiffStatus(); // This returns an array of classes
  const diffStatus = diffStatusClasses.join(' '); // Join for compatibility with existing code
  
  // DEBUG: Log highlighting for the problematic contributions arrays
  if (path.includes('contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributions')) {
    console.log(`[HIGHLIGHTING DEBUG] ${viewerId} Path: "${path}"`);
    console.log(`[HIGHLIGHTING DEBUG] ${viewerId} CSS classes: [${diffStatusClasses.join(', ')}]`);
    console.log(`[HIGHLIGHTING DEBUG] ${viewerId} genericNumericPathForNode: "${genericNumericPathForNode}"`);
  }

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
    console.log(`[JsonNode VId:${viewerId}] Toggling expansion for path: "${path}"`);
    toggleExpand(path, viewerId as ViewerId);
    if (onNodeToggle) {
        onNodeToggle(path);
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
          } else {
            // Add as a pattern to get full filtering behavior
            addIgnoredPatternFromRightClick(normalizedPathForDiff);
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
        }
      });
    }

    // Debug action - print detailed node information
    actions.push({
      label: 'Debug',
      icon: '🔍',
      action: () => {
        const diffStatusClasses = getNodeDiffStatus();
        const relevantDiffs = diffResultsData ? diffResultsData.filter((diff: any) => 
          diff.numericPath === normalizedPathForDiff
        ) : [];
        
        debugNodeInfo({
          path,
          normalizedPathForDiff,
          genericNumericPathForNode,
          value: data,
          isArray,
          hasChildren,
          diffInfo: {
            classes: diffStatusClasses,
            relevantDiffs,
            isIgnored: normalizedPathForDiff ? ignoredDiffs.has(normalizedPathForDiff) : false
          },
          isExpanded,
          viewerId,
          isCompareMode,
          idKeySetting,
          forceSortedArrays,
          actualNumericIndex,
          ignoredDiffs
        });
      }
    });

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
              
              let sortedData = [...arrData];
              let sortedIndexMap = new Map<number, number>(); // Maps sorted index to original index
              
              if (shouldSort) {
                
                // Create array of {item, originalIndex} pairs
                const itemsWithOriginalIndex = arrData.map((item, originalIndex) => ({
                  item,
                  originalIndex
                }));
                
                
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
                
                
                // Extract sorted data and build index map
                sortedData = itemsWithOriginalIndex.map(({ item }) => item);
                itemsWithOriginalIndex.forEach(({ originalIndex }, sortedIndex) => {
                  sortedIndexMap.set(sortedIndex, originalIndex);
                });
                
                
              } else {
                // No sorting, create identity mapping
                arrData.forEach((_, index) => {
                  sortedIndexMap.set(index, index);
                });
              }
              
              return sortedData.map((itemValue, sortedIndex) => {
                const originalIndex = sortedIndexMap.get(sortedIndex) ?? sortedIndex;
                const itemPathSuffix = getItemPathSuffix(itemValue, originalIndex, idKeySetting);
                const childPath: IdBasedPath = createIdBasedPath(`${path}${itemPathSuffix}`);
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
              const childPath: IdBasedPath = createIdBasedPath(`${path}.${key}`);
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

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data, viewerId, jsonSide, idKeySetting, /* idKeysUsed, */ showDiffsOnly, isCompareMode = false }) => {
  return (
    <div className="json-tree-view responsive-no-wrap">
      <JsonNode
        data={data}
        path={createIdBasedPath(`root_${viewerId}_root`)}
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
const DEBUG_CSS_HIGHLIGHTING = false;

// Debug function for individual node information
const debugNodeInfo = (nodeData: {
  path: string;
  normalizedPathForDiff: string | null;
  genericNumericPathForNode: string;
  value: JsonValue;
  isArray: boolean;
  hasChildren: boolean;
  diffInfo: any;
  isExpanded: boolean;
  ignoredDiffs: Set<string>;
  viewerId: string;
  isCompareMode: boolean;
  idKeySetting: string | null;
  forceSortedArrays: Set<string>;
  actualNumericIndex?: number;
}) => {
  console.group(`🔍 Node Debug Info: ${nodeData.path}`);
  
  console.log('📍 Path Information:', {
    originalPath: nodeData.path,
    normalizedPathForDiff: nodeData.normalizedPathForDiff,
    genericNumericPath: nodeData.genericNumericPathForNode
  });
  
  console.log('📊 Value Information:', {
    value: nodeData.value,
    type: typeof nodeData.value,
    isArray: nodeData.isArray,
    hasChildren: nodeData.hasChildren,
    isExpanded: nodeData.isExpanded
  });
  
  console.log('🔄 Diff Information:', {
    diffInfo: nodeData.diffInfo,
    isCompareMode: nodeData.isCompareMode,
    viewerId: nodeData.viewerId
  });

  // 🎨 HIGHLIGHTING DEBUG INFORMATION
  console.log('🎨 Highlighting Analysis:', {
    currentHighlightClasses: nodeData.diffInfo.classes,
    normalizedPath: nodeData.normalizedPathForDiff,
    isIgnored: nodeData.diffInfo.isIgnored
  });

  // 🎯 CORRELATION DEBUGGING - Key information for investigating sync issues
  const arrayItemMatch = nodeData.genericNumericPathForNode.match(/^(.*)\[(\d+)\](.*)$/);
  if (arrayItemMatch) {
    const [, arrayPath, indexStr, afterArrayPath] = arrayItemMatch;
    const currentIndex = parseInt(indexStr, 10);
    
    console.log('🔗 Array Correlation Analysis:', {
      isArrayItem: true,
      arrayPath: arrayPath,
      displayIndex: currentIndex,
      originalIndex: nodeData.actualNumericIndex,
      pathAfterArray: afterArrayPath || '(none)',
      indexDifference: nodeData.actualNumericIndex !== undefined ? (currentIndex - nodeData.actualNumericIndex) : 'unknown'
    });
    
    // Check if this array is sorted
    const isArraySorted = Boolean(nodeData.idKeySetting) || nodeData.forceSortedArrays.has(arrayPath);
    const sortMethod = nodeData.idKeySetting ? `ID key: "${nodeData.idKeySetting}"` : 
                      nodeData.forceSortedArrays.has(arrayPath) ? 'Force-sorted via context menu' : 'Not sorted';
    
    console.log('📋 Array Sorting State:', {
      arrayPath: arrayPath,
      isSorted: isArraySorted,
      sortMethod: sortMethod,
      idKeySetting: nodeData.idKeySetting,
      isInForceSortedSet: nodeData.forceSortedArrays.has(arrayPath),
      allForceSortedArrays: Array.from(nodeData.forceSortedArrays)
    });
    
    // If this is an array, show sorting analysis for its items
    if (nodeData.isArray && Array.isArray(nodeData.value)) {
      const arrayItems = nodeData.value as JsonValue[];
      
      // Detect what ID key would be best for this specific array
      const candidateKeys = ['id', 'key', 'uuid', 'name', 'accountType', 'resolvedDisplayLabel', 'type'];
      const detectedIdKey = candidateKeys.find(candidateKey => {
        let validCount = 0;
        const seenValues = new Set<string>();
        for (const item of arrayItems) {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            const itemObj = item as JsonObject;
            if (candidateKey in itemObj) {
              const value = String(itemObj[candidateKey]);
              if (value && !seenValues.has(value)) {
                seenValues.add(value);
                validCount++;
              }
            }
          }
        }
        return validCount >= Math.max(2, Math.floor(arrayItems.length * 0.8));
      }) || null;
      
      // Show file-specific ID keys for debugging
/*
      console.log('📋 File-Specific ID Keys Analysis:');
      if (typeof window !== 'undefined') {
        console.log('File 1 ID Keys:', (window as any).file1IdKeys?.length || 0, 'entries');
        console.log('File 2 ID Keys:', (window as any).file2IdKeys?.length || 0, 'entries');
        
        // Find entries related to contributions
        const contributionsKeys = (window as any).currentIdKeysUsed?.filter((idKeyInfo: any) => 
          idKeyInfo.arrayPath.includes('contributions')
        ) || [];
        console.log('Contributions-related ID Keys:', contributionsKeys.length);
        contributionsKeys.forEach((idKeyInfo: any, index: number) => {
          console.log(`  ${index + 1}. arrayPath: "${idKeyInfo.arrayPath}", idKey: "${idKeyInfo.idKey}"`);
        });
      }
 */

      console.log('🔍 Array Items Sorting Analysis:', {
        arrayLength: arrayItems.length,
        detectedArraySpecificIdKey: detectedIdKey,
        globalIdKeySetting: nodeData.idKeySetting,
        idKeyMismatch: detectedIdKey !== nodeData.idKeySetting,
        currentArrayPath: nodeData.genericNumericPathForNode,
        normalizedForLookup: nodeData.genericNumericPathForNode
          .replace(/^root\./, '') // Remove "root." prefix
          .replace(/\[\d+\]/g, ''), // Remove array indices
        firstFewItems: arrayItems.slice(0, 3).map((item, index) => {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            const itemObj = item as JsonObject;
            return {
              index,
              globalIdValue: nodeData.idKeySetting && nodeData.idKeySetting in itemObj ? itemObj[nodeData.idKeySetting] : 'NO_GLOBAL_ID',
              detectedIdValue: detectedIdKey && detectedIdKey in itemObj ? itemObj[detectedIdKey] : 'NO_DETECTED_ID',
              availableKeys: Object.keys(itemObj).slice(0, 5),
              type: typeof item
            };
          }
          return { index, globalIdValue: 'N/A', detectedIdValue: 'N/A', type: typeof item };
        }),
        sortingNote: 'Check the idKeysUsed array entries above to see the actual arrayPath format used for matching.'
      });
    }
    
    // Correlation target analysis
    console.log('🎯 Correlation Target Analysis:', {
      shouldCorrelateByPosition: isArraySorted,
      currentDisplayPosition: currentIndex,
      targetSide: nodeData.viewerId === 'left' ? 'right' : 'left',
      expectedTargetPath: `root_${nodeData.viewerId === 'left' ? 'right' : 'left'}_${arrayPath}[${currentIndex}]${afterArrayPath || ''}`,
      correlationStrategy: isArraySorted ? 'POSITIONAL (after sorting both sides)' : 'ID-BASED (preserve original mapping)',
      actualNumericIndexMissing: nodeData.actualNumericIndex === undefined,
      troubleshootingNote: nodeData.actualNumericIndex === undefined ? 
        'actualNumericIndex is undefined - this means the array item sorting logic may not be passing the original index correctly' : 
        'actualNumericIndex is available'
    });
    
    // Check if the value has an ID field
    if (typeof nodeData.value === 'object' && nodeData.value !== null && !Array.isArray(nodeData.value)) {
      const valueObj = nodeData.value as JsonObject;
      const hasIdField = nodeData.idKeySetting && nodeData.idKeySetting in valueObj;
      console.log('🆔 ID Field Analysis:', {
        hasIdField: hasIdField,
        idFieldName: nodeData.idKeySetting,
        idValue: hasIdField && nodeData.idKeySetting ? valueObj[nodeData.idKeySetting] : 'N/A',
        availableFields: Object.keys(valueObj).slice(0, 10)
      });
    }
  } else {
    console.log('🔗 Array Correlation Analysis:', {
      isArrayItem: false,
      isArrayItself: nodeData.isArray,
      note: nodeData.isArray ? 'This is an array container' : 'Not an array item'
    });
  }
  
  // Get DOM element and styling information
  const selector = `[data-path="${nodeData.path}"]`;
  const element = document.querySelector(selector) as HTMLElement;
  
  if (element) {
    const computedStyle = window.getComputedStyle(element);
    const contentElement = element.querySelector('.json-node-content') as HTMLElement;
    const contentStyle = contentElement ? window.getComputedStyle(contentElement) : null;
    
    console.log('🎨 DOM & Styling:', {
      element: element,
      classes: element.className,
      computedStyle: {
        backgroundColor: computedStyle.backgroundColor,
        borderLeft: computedStyle.borderLeft,
        transform: computedStyle.transform,
        isolation: computedStyle.isolation,
        willChange: (computedStyle as any).willChange
      },
      contentStyle: contentStyle ? {
        backgroundColor: contentStyle.backgroundColor,
        borderLeft: contentStyle.borderLeft,
        padding: contentStyle.padding
      } : null
    });
  } else {
    console.log('❌ DOM element not found for selector:', selector);
  }
  
  console.groupEnd();
};

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
