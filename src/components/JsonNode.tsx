import React, { useEffect, useRef, useContext, useMemo } from 'react'; // Added useMemo
import { JsonNodeProps } from './types';
import { JsonViewerContext } from './JsonViewer';

const JsonNode: React.FC<JsonNodeProps> = ({ 
  path, 
  viewerId, 
  actualNumericIndex, 
  idKeySetting, 
  isObject, 
  isArray, 
  hasChildren 
}) => {
  const context = useContext(JsonViewerContext);
  const { 
    expandedPaths, 
    toggleExpand, 
    highlightPath, 
    diffResults: diffResultsData,
    showDiffsOnly: showDiffsOnlyContext, 
    ignoredDiffs, 
  } = context;
  
  const nodeRef = useRef<HTMLDivElement>(null);

  // Derive the generic, numeric path for this node
  const genericNumericPathForNode = useMemo(() => {
    let resultPath: string;
    // Strip viewer-specific prefix (e.g., "root_viewer1_" or "root_viewer2_")
    const strippedPathPrefix = path.replace(/^root_(viewer1|viewer2)_/, ''); 

    if (actualNumericIndex !== undefined && idKeySetting && strippedPathPrefix.includes(`[${idKeySetting}=`)) {
      // Node is an array item, its path is idKey-based. Convert to generic numeric.
      // Example: strippedPathPrefix = "root.arr[name=A]", actualNumericIndex = 0 -> "root.arr[0]"
      const lastBracket = strippedPathPrefix.lastIndexOf('[');
      
      // Ensure the found bracket is indeed the start of the idKey-based segment
      if (lastBracket > -1 && strippedPathPrefix.substring(lastBracket).startsWith(`[${idKeySetting}=`)) {
        const parentGenericPath = strippedPathPrefix.substring(0, lastBracket);
        resultPath = `${parentGenericPath}[${actualNumericIndex}]`;
      } else {
        // Fallback if path structure is unexpected, though this should be rare with consistent idKey application.
        // console.warn(`[JsonNode VId:${viewerId}] Path "${path}" with idKeySetting="${idKeySetting}" and actualNumericIndex=${actualNumericIndex} did not cleanly parse to numeric. Using stripped: "${strippedPathPrefix}"`);
        resultPath = strippedPathPrefix;
      }
    } else {
      // Node is an object key, or an array item whose path is already numeric, or the root node.
      resultPath = strippedPathPrefix;
    }
    return resultPath;
  }, [path, viewerId, actualNumericIndex, idKeySetting]);

  const isHighlighted = (() => {
    if (!highlightPath) return false; 
    // highlightPath from context is already generic and numeric.
    // Compare it with the node\'s generic numeric path.
    return highlightPath === genericNumericPathForNode;
  })();

  // Check expansion status using the generic numeric path
  const isExpanded = expandedPaths.has(genericNumericPathForNode);

  // DEBUG LOG: Print expandedPaths when a node is highlighted
  // if (isHighlighted) {
  //   console.log(`[JsonNode DEBUG VId:${viewerId}] HIGHLIGHTED Path: \\\"${path}\\\". GenericNumeric: \\\"${genericNumericPathForNode}\\\". IsExpanded: ${isExpanded}. Current expandedPaths: ${JSON.stringify(Array.from(expandedPaths))}`);
  // }
  
  // console.log(`[JsonNode VId:${viewerId}] Path: \\\"${path}\\\", GenericNumeric: \\\"${genericNumericPathForNode}\\\", IsExpanded: ${isExpanded}, IsHighlighted: ${isHighlighted}, HasChildren: ${hasChildren}`);

  useEffect(() => {
    if (isHighlighted && (isObject || isArray) && hasChildren && !isExpanded) { 
      // console.log(`[JsonNode VId:${viewerId}] Auto-expanding highlighted node: \\\"${path}\\\" (generic: \\\"${genericNumericPathForNode}\\\")`);
      // Pass generic numeric path for auto-expansion
      toggleExpand(genericNumericPathForNode); 
    }
  }, [isHighlighted, path, hasChildren, isExpanded, viewerId, isObject, isArray, toggleExpand, genericNumericPathForNode]); // genericNumericPathForNode added
  
  const calculateIsVisibleInDiffsOnlyMode = (): boolean => {
    if (!showDiffsOnlyContext) {
      return true;
    }

    if (!diffResultsData || diffResultsData.length === 0) {
      return false; 
    }
    
    // Use genericNumericPathForNode for root check
    if (genericNumericPathForNode === 'root') {
      const anyRelevantDiffs = diffResultsData.some((diff: DiffResult) => 
        diff.numericPath && !ignoredDiffs.includes(diff.numericPath)
      );
      return anyRelevantDiffs;
    }

    // Use genericNumericPathForNode for diff checks
    const isNodeADiff = diffResultsData.some((diff: DiffResult) => 
      diff.numericPath && diff.numericPath === genericNumericPathForNode && !ignoredDiffs.includes(diff.numericPath)
    );

    if (isNodeADiff) {
      return true;
    }

    const isAncestorOfDiff = diffResultsData.some((diff: DiffResult) => {
      if (!diff.numericPath || ignoredDiffs.includes(diff.numericPath)) return false;
      // Ensure genericNumericPathForNode is not empty before creating pathToCheck/arrayPathToCheck
      if (genericNumericPathForNode && 
          (diff.numericPath.startsWith(genericNumericPathForNode + '.') || 
           diff.numericPath.startsWith(genericNumericPathForNode + '['))) {
        return true;
      }
      return false;
    });

    if (isAncestorOfDiff) {
      return true;
    }
    
    return false;
  };

  const isVisibleNode = calculateIsVisibleInDiffsOnlyMode();

  const toggleExpansion = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Pass the generic, numeric path to the context\'s toggleExpand
    toggleExpand(genericNumericPathForNode);
  };

  if (!isVisibleNode) {
    return null;
  }

  return (
    <div ref={nodeRef} onClick={toggleExpansion}>
      {/* Node rendering logic */}
    </div>
  );
};

export default JsonNode;