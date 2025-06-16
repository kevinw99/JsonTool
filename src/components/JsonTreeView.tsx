import React, { useEffect, useRef } from 'react';
import './JsonTreeView.css';
import { useJsonViewerSync } from './JsonViewerSyncContext';
import type { DiffResult } from '../jsonCompare';

// Types for JSON values
type JsonValue = 
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

interface JsonNodeProps {
  value: JsonValue;
  keyName?: string;
  level: number;
  isLastChild: boolean;
  nodePath: string;
  diffResults?: DiffResult[];
  diffMap?: Record<string, { type: string, changed: boolean }>;
  isOriginal?: boolean;
}

interface JsonTreeViewProps {
  json: JsonValue;
  viewerId?: string;
  diffResults?: DiffResult[];
  isOriginal?: boolean;
}

// Renders a single node in the JSON tree
const JsonNode: React.FC<JsonNodeProps> = ({ 
  value, 
  keyName, 
  level, 
  isLastChild, 
  nodePath, 
  diffResults = [], 
  diffMap = {}, 
  isOriginal = true 
}) => {
  const { 
    expandedPaths, 
    toggleExpand, 
    showColoredDiff, 
    ignoredDiffs, 
    highlightPath 
  } = useJsonViewerSync();
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const isExpanded = expandedPaths.has(nodePath);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const hasChildren = isObject && Object.keys(value).length > 0;
  const nodeType = isArray ? 'array' : isObject ? 'object' : typeof value;
  
  // Get node path without viewer prefix for diff checking
  const normalizedPath = nodePath.replace(/^root_(.+?)_/, '');
  
  // Normalize path for comparison
  let normalizedDotPath = normalizedPath.replace(/\[(\d+)\]/g, '.$1'); // Convert array notation to dot notation
  if (normalizedDotPath.startsWith('root.')) {
    normalizedDotPath = normalizedDotPath.substring(5);
  } else if (normalizedDotPath === 'root') {
    normalizedDotPath = '';
  }
  
  // Check if this node should be highlighted from navigation
  // Handle complex array paths with patterns like [id=45596359::2]
  const isHighlighted = (() => {
    if (!highlightPath) return false;
    
    // Enhanced debug logging for path matching
    console.log(`[JsonNode] Comparing highlight path: \"${highlightPath}\" with node path: \"${normalizedPath}\" (dot: \"${normalizedDotPath}\")`);
    
    // Direct match
    if (highlightPath === normalizedDotPath || highlightPath === normalizedPath) {
      console.log('[JsonNode] DIRECT MATCH! Highlight:', highlightPath, 'Node:', normalizedPath);
      return true;
    }
    
    // Handle complex array paths with special identifiers
    let simplifiedHighlightPath = highlightPath;
    let processedNodePath = normalizedPath;
    let processedDotPath = normalizedDotPath;
    
    // If either path contains the special id pattern, normalize both for comparison
    if (highlightPath.includes('[id=') || normalizedPath.includes('[id=')) {
      simplifiedHighlightPath = highlightPath.replace(/\\[id=[^\\]]+::(\\d+)\\]/g, '[$1]');
      processedNodePath = normalizedPath.replace(/\\[id=[^\\]]+::(\\d+)\\]/g, '[$1]');
      processedDotPath = normalizedDotPath.replace(/\\[id=[^\\]]+::(\\d+)\\]/g, '.$1'); // For dot path
      
      console.log('[JsonNode] Simplified paths for comparison:');
      console.log('- Highlight path (simplified):', simplifiedHighlightPath);
      console.log('- Node path (processed):', processedNodePath);
      console.log('- Dot path (processed):', processedDotPath);
      
      if (simplifiedHighlightPath === processedNodePath || simplifiedHighlightPath === processedDotPath) {
        console.log('[JsonNode] SIMPLIFIED MATCH! Highlight (simplified):', simplifiedHighlightPath, 'Node (processed):', processedNodePath);
        return true;
      }
    }
    
    // Additional case: check the end of long paths - if the current node is the final part
    // of a complex highlighted path. This is a fallback and might need refinement.
    const highlightParts = simplifiedHighlightPath.split('.');
    const nodePathParts = processedNodePath.split('.'); // Use processedNodePath for consistency
    
    if (highlightParts.length > 0 && nodePathParts.length > 0) {
      const lastHighlightPart = highlightParts[highlightParts.length - 1];
      const lastNodePathPart = nodePathParts[nodePathParts.length - 1];
      
      // Check if the node path ends with the last part of the highlight path
      // and if the last parts themselves match.
      if (lastHighlightPart === lastNodePathPart && processedNodePath.endsWith(lastHighlightPart)) {
        console.log('[JsonNode] ENDING PART MATCH! Last Highlight Part:', lastHighlightPart, 'Node Path:', processedNodePath);
        return true;
      }
    }
    
    return false;
  })();
  
  // Handle auto-expansion of highlighted nodes
  useEffect(() => {
    if (isHighlighted && hasChildren && !isExpanded) {
      console.log('[JsonNode] Auto-expanding highlighted node:', nodePath, 'Is Expanded:', isExpanded);
      toggleExpand(nodePath); // toggleExpand will handle adding it to expandedPaths
    }
  }, [isHighlighted, nodePath, hasChildren, isExpanded, toggleExpand]);
  
  // Scroll into view if this node is highlighted
  useEffect(() => {
    if (isHighlighted && nodeRef.current) {
      const scrollTimer = setTimeout(() => {
        if (nodeRef.current) {
          console.log('[JsonNode] Scrolling to highlighted node:', nodePath);
          nodeRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          nodeRef.current.classList.add('flash-highlight');
          nodeRef.current.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'; // More prominent highlight
          
          const highlightTimer = setTimeout(() => {
            if (nodeRef.current) {
              nodeRef.current.classList.remove('flash-highlight');
              nodeRef.current.style.backgroundColor = ''; // Reset background
            }
          }, 3000); // Duration of the visual highlight
          
          return () => clearTimeout(highlightTimer);
        }
      }, 150); // Slightly reduced delay, ensure DOM is ready
      
      return () => clearTimeout(scrollTimer);
    }
  }, [isHighlighted, nodePath]);
  
  // Determine if this is an array element with a key identifier in its path
  const isIdentifiedArrayElement = normalizedDotPath.includes('=');
  
  // Check if this node has any diff
  const processNodeDiffStatus = () => {
    if (!showColoredDiff) return '';
    
    // Special case for root node
    if (normalizedPath === 'root') {
      return diffResults.length > 0 ? 'json-parent-changed' : '';
    }
    
    // Special case for arrays with objects that might be reordered
    if (isArray && keyName === 'accountParams') {
      return '';
    }
    
    // Start with base diff status
    let status = '';
    
    // Check against all diffs
    for (const diff of diffResults) {
      // Skip ignored diffs
      if (ignoredDiffs.has(diff.path)) {
        continue;
      }
      
      // Convert both paths to dot notation for comparison
      let diffPathDot = diff.path.replace(/\[(\d+)\]/g, '.$1');
      // Handle paths with ID-based indices e.g., [idField=value]
      diffPathDot = diffPathDot.replace(/\[([\w\.]+)=([^\]]+)\]/g, '.$2');
      
      // Check if this node is directly affected by a diff
      if (normalizedDotPath === diffPathDot) {
        if (diff.type === 'added' && !isOriginal) return 'json-added';
        if (diff.type === 'removed' && isOriginal) return 'json-removed';
        if (diff.type === 'changed') return 'json-changed';
      }
      
      // Check if this is a parent of a changed node
      // Need to handle empty path for root node
      const pathToCheck = normalizedDotPath === '' ? '' : normalizedDotPath + '.';
      
      // For identified array elements, we handle styling separately
      if (!isIdentifiedArrayElement) {
        // For regular objects and arrays, mark ALL parents along the path as changed
        if ((pathToCheck !== '' && diffPathDot.startsWith(pathToCheck)) || 
            (normalizedDotPath !== '' && 
             (diffPathDot.startsWith(normalizedDotPath + '[') || 
              diffPathDot.startsWith(normalizedDotPath + '.')))) {
          status = 'json-parent-changed';
        }
        
        // Alternative method: Also mark any node that's part of the path to a change
        // This ensures all parent nodes are highlighted up to the root
        if (diffPathDot !== '') {
          const diffPathParts = diffPathDot.split('.');
          
          // Remove the last part which is the actual change
          diffPathParts.pop();
          
          // Check if our normalizedDotPath is part of the path to a change
          let currentPath = '';
          const isPathToChange = diffPathParts.some(part => {
            currentPath = currentPath ? `${currentPath}.${part}` : part;
            return normalizedDotPath === currentPath;
          });
          
          if (isPathToChange) {
            status = 'json-parent-changed';
          }
        }
      }
    }
    
    // Special case for arrays with objects - don't highlight if their children are just reordered
    if (isArray && status === 'json-parent-changed') {
      const hasArrayStructureDiff = diffResults.some(diff => {
        // If the diff is directly on this array path, count it
        return diff.path === normalizedDotPath.replace(/^root\.?/, '');
      });
      
      // If no structural changes to the array itself, suppress highlighting
      if (!hasArrayStructureDiff) {
        status = '';
      }
    }
    
    // For objects - we need to properly handle parent highlighting
    if (isObject && status === 'json-parent-changed') {
      // First, check if this is a parent of any change by looking at all diff paths
      let isParentOfChange = false;
      
      // Convert normalizedDotPath to a pattern we can check against
      const parentPattern = normalizedDotPath === '' ? '' : 
                           (normalizedDotPath + '.');
      
      // Check if any diff path starts with this node's path (meaning it's a child or descendant)
      if (parentPattern !== '') {
        isParentOfChange = diffResults.some(diff => {
          const diffPath = diff.path.replace(/\[(\d+)\]/g, '.$1')
                                    .replace(/\[([\w\.]+)=([^\]]+)\]/g, '.$2');
          
          // Check if this node is in the path to a diff (any level down)
          return diffPath.startsWith(parentPattern) || 
                 diffPath === normalizedDotPath.replace(/^root\.?/, '');
        });
      }
      
      // Keep the highlight if this is a parent of any change
      if (!isParentOfChange) {
        status = '';
      }
    }
    
    return status;
  };
  
  const diffStatus = processNodeDiffStatus();
  
  const toggleExpansion = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleExpand(nodePath);
  };
  
  // Format primitive values for display
  const formatValue = (val: JsonValue): string => {
    if (val === null) return 'null';
    if (typeof val === 'string') {
      // Truncate very long strings for better display
      if (val.length > 200) {
        const truncated = val.substring(0, 200);
        return `"${truncated}..." (${val.length} chars)`;
      }
      return `"${val}"`;
    }
    return String(val);
  };
  
  return (
    <div 
      className={`json-node json-level-${level} ${isLastChild ? 'last-child' : ''} ${isHighlighted ? 'highlighted-node' : ''}`}
      ref={nodeRef}
    >
      <div 
        className={`json-node-content ${isObject ? 'clickable' : ''}`} 
        onClick={hasChildren ? toggleExpansion : undefined}
      >
        {hasChildren && (
          <span className={`expander ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {isExpanded ? '▼' : '►'}
          </span>
        )}
        
        {/* Apply diff highlight to the key for consistent styling */}
        {keyName !== undefined && (
          <span className={`json-key ${diffStatus}`}>"{keyName}":</span>
        )}
        
        {isObject ? (
          <>
            {/* Brackets are never highlighted */}
            <span className="json-bracket">
              {isArray ? '[' : '{'}
            </span>
            {!isExpanded && (
              <span className="json-collapsed-hint">
                {isArray ? `Array(${Object.keys(value).length})` : `Object`}
                <span className="json-bracket">
                  {isArray ? ']' : '}'}
                </span>
              </span>
            )}
          </>
        ) : (
          // For leaf nodes, apply diff classes directly to value
          <span className={`json-value json-value-${nodeType} ${diffStatus}`}>
            {formatValue(value)}
          </span>
        )}
      </div>
      
      {isObject && isExpanded && (
        <div className="json-children">
          {Object.entries(value).map(([childKey, childValue], index, array) => {
            // Construct the child path, preserving any viewer prefixes
            const childPath = isArray 
              ? `${nodePath}[${index}]` 
              : `${nodePath}.${childKey}`;
              
            return (
              <JsonNode 
                key={childKey} 
                keyName={isArray ? undefined : childKey}
                value={childValue}
                level={level + 1}
                isLastChild={index === array.length - 1}
                nodePath={childPath}
                diffResults={diffResults}
                diffMap={diffMap}
                isOriginal={isOriginal}
              />
            );
          })}
          <div className="json-node-closing">
            <span className="json-bracket">
              {isArray ? ']' : '}'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({ 
  json, 
  viewerId = 'default',
  diffResults = [],
  isOriginal = true
}) => {
  // Create a diff map for faster lookups
  const createDiffMap = () => {
    const map: Record<string, { type: string, changed: boolean }> = {};
    
    diffResults.forEach(diff => {
      // For each diff, mark the path and all its parent paths
      const pathParts = diff.path
        .replace(/\[(\d+)\]/g, '.$1') // Convert array notation to dot notation
        .split('.');
      
      let currentPath = '';
      pathParts.forEach(part => {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        
        // If this path is directly affected by the diff
        if (currentPath === diff.path.replace(/\[(\d+)\]/g, '.$1')) {
          map[currentPath] = { 
            type: diff.type,
            changed: true
          };
        } else {
          // If this is a parent path, mark as a parent of a change
          if (!map[currentPath]) {
            map[currentPath] = { 
              type: 'parent',
              changed: false
            };
          }
        }
      });
    });
    
    return map;
  };
  
  const diffMap = createDiffMap();
  
  return (
    <div className="json-tree-view">
      <JsonNode 
        value={json} 
        level={0} 
        isLastChild={true} 
        nodePath={`root_${viewerId}_root`} 
        diffResults={diffResults}
        diffMap={diffMap}
        isOriginal={isOriginal}
      />
    </div>
  );
};
