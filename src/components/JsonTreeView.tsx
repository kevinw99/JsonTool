import React, { useRef, useEffect, useContext, useMemo, useState } from 'react';
import './JsonTreeView.css';
import './ResponsiveFix.css';
import { JsonViewerSyncContext } from './JsonViewerSyncContext';
import type { DiffResult } from '../utils/jsonCompare';

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
  } = context;
  
  const nodeRef = useRef<HTMLDivElement>(null);

  // Calculate the generic numeric path for this node, to be used with context state (expandedPaths, highlightPath)
  const genericNumericPathForNode = useMemo(() => {
    // 1. Strip viewer-specific prefix (e.g., "root_viewer1_" or "root_viewer2_") to get a base path.
    // The `path` prop for JsonNode already includes the viewerId, e.g., "root_viewer1_root.some.path"
    // We need to normalize this to match the context's generic paths like "root.some.path"
    let basePath = path.replace(/^root_(viewer1|viewer2)_/, '');

    // 2. If this node represents an array item using an idKey (path contains "[idKey=value]"),
    //    convert its segment to a numeric index using `actualNumericIndex`.
    if (actualNumericIndex !== undefined && idKeySetting && basePath.includes(`[${idKeySetting}=`)) {
      const lastBracket = basePath.lastIndexOf('[');
      if (lastBracket > -1) {
        const parentPathPart = basePath.substring(0, lastBracket);
        // console.log(`[JsonNode VId:${viewerId}] Path: \\"${path}\\", idKey: \\"${idKeySetting}\\", actualIdx: ${actualNumericIndex}. Converting \\"${basePath}\\" to \\"${parentPathPart}[${actualNumericIndex}]\\"`);
        basePath = `${parentPathPart}[${actualNumericIndex}]`;
      }
    }
    // console.log(`[JsonNode VId:${viewerId}] Path: \\"${path}\\", idKeySetting: \\"${idKeySetting}\\", actualNumericIndex: ${actualNumericIndex}. Derived genericNumericPathForNode: \\"${basePath}\\"`);
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

    // Helper function to convert ID-based path to numeric path
    const convertIdPathToNumericPath = (idPath: string): string => {
      if (actualNumericIndex !== undefined && idPath.includes('[') && idPath.includes('=')) {
        const lastBracket = idPath.lastIndexOf('[');
        if (lastBracket > -1) {
          const parentPath = idPath.substring(0, lastBracket);
          const remainingPath = idPath.substring(idPath.indexOf(']') + 1);
          return `${parentPath}[${actualNumericIndex}]${remainingPath}`;
        }
      }
      return idPath;
    };

    // Convert current node's path to numeric for comparison
    const numericPathForComparison = convertIdPathToNumericPath(normalizedPathForDiff);

    // Check for EXACT matches first (this node IS the diff)
    for (const diff of relevantDiffs) {
      if (!diff.numericPath) continue;

      // Check both the original path and the converted numeric path
      if (normalizedPathForDiff === diff.numericPath || numericPathForComparison === diff.numericPath) {
        if (diff.type === 'added' && jsonSide === 'right') {
          classes.push('json-added');
        } else if (diff.type === 'removed' && jsonSide === 'left') {
          classes.push('json-deleted');
        } else if (diff.type === 'changed') {
          classes.push('json-changed');
        }
        console.log(`[JsonNode VId:${viewerId}] ✅ EXACT MATCH: "${normalizedPathForDiff}" (numeric: "${numericPathForComparison}") matches diff "${diff.numericPath}" -> ${diff.type}`);
        return classes; // Return immediately for exact matches
      }
    }

    // If no exact match, check if this node is a PARENT of any diff
    for (const diff of relevantDiffs) {
      if (!diff.numericPath) continue;

      // Check if diff path starts with this node's path (making this node a parent)
      const isParentOfDiff = (
        diff.numericPath.startsWith(normalizedPathForDiff + '.') ||
        diff.numericPath.startsWith(normalizedPathForDiff + '[') ||
        diff.numericPath.startsWith(numericPathForComparison + '.') ||
        diff.numericPath.startsWith(numericPathForComparison + '[')
      );

      if (isParentOfDiff) {
        classes.push('json-parent-changed');
        return classes; // Return immediately for parent matches
      }

      // Special case for root node
      if (normalizedPathForDiff === '' && diff.numericPath !== '') {
        classes.push('json-parent-changed');
        return classes;
      }
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
              // Sort array by ID key if idKeySetting is provided
              let sortedData = [...arrData];
              let sortedIndexMap = new Map<number, number>(); // Maps sorted index to original index
              
              if (idKeySetting) {
                // Create array of {item, originalIndex} pairs
                const itemsWithOriginalIndex = arrData.map((item, originalIndex) => ({
                  item,
                  originalIndex
                }));
                
                // Sort by ID key value
                itemsWithOriginalIndex.sort((a, b) => {
                  const aHasId = typeof a.item === 'object' && a.item !== null && !Array.isArray(a.item) && idKeySetting in a.item;
                  const bHasId = typeof b.item === 'object' && b.item !== null && !Array.isArray(b.item) && idKeySetting in b.item;
                  
                  if (!aHasId && !bHasId) return 0;
                  if (!aHasId) return 1; // Items without ID key go to end
                  if (!bHasId) return -1; // Items without ID key go to end
                  
                  const aId = String((a.item as JsonObject)[idKeySetting]);
                  const bId = String((b.item as JsonObject)[idKeySetting]);
                  
                  return aId.localeCompare(bId);
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
                  />
                );
              });
            })()}
            <div className="json-node json-closing-bracket-node" style={{paddingLeft: `${level * 20}px`}}>
              <span className="json-bracket json-closing-bracket">]</span>
            </div>
          </div>
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
                />
              );
            })}
            <div className="json-node json-closing-brace-node" style={{paddingLeft: `${level * 20}px`}}>
              <span className="json-brace json-closing-brace">{'}'}</span>
            </div>
          </div>
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
      >
        <div className={contentClasses}>
          <span className="expander no-children" />
          <span className={`json-key ${diffStatus}`}>{nodeKey !== undefined ? `${nodeKey}:` : ''}</span>
          <span className="json-value">{formatValue(data)}</span>
        </div>
      </div>
    );
  }
};

interface JsonTreeViewProps {
  data: JsonValue;
  viewerId: string;
  jsonSide: 'left' | 'right';
  idKeySetting: string | null;
  showDiffsOnly?: boolean;
}

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data, viewerId, jsonSide, idKeySetting, showDiffsOnly }) => {
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
      />
    </div>
  );
};
