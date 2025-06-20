import React, { useCallback, useContext, useMemo } from 'react';
import './DiffFilteredJsonView.css';
import type { DiffResult } from '../jsonCompare';
import { JsonNode } from './JsonTreeView'; // Assuming JsonNode is exported and can be used
import { JsonViewerSyncContext } from './JsonViewerSyncContext'; // Corrected path

interface DiffFilteredJsonViewProps {
  originalJson: any;
  diffResults: DiffResult[];
  height?: number | string;
  jsonData: any;
  diffs: DiffResult[];
  viewerId: string;
  expandedPaths: Set<string>;
  setExpandedPaths: (paths: Set<string>) => void;
  highlightPath: string;
  renderPath: string;
  idKey: string;
}

// Helper function to filter JSON to only include differences
export const filterJsonByDiffs = (json: any, diffResults: DiffResult[], parentPath = ''): any => {
  const diffPaths = new Set<string>();
  const parentDiffPaths = new Set<string>();

  diffResults.forEach(diff => {
    let path = diff.path;

    // Normalize path segments to be consistently dot-separated
    // Replace [id=value::index] -> .index
    path = path.replace(/\[id=[^\s\]]+::(\d+)\]/g, '.' + '$1');
    // Replace [id=value] -> .value (if value is a simple key)
    path = path.replace(/\[id=([^\s\]]+)\]/g, '.' + '$1');
    // Replace [index] -> .index
    path = path.replace(/\[(\d+)\]/g, '.' + '$1');

    // Remove any leading dot that might have been introduced or was already there
    if (path.startsWith('.')) {
      path = path.substring(1);
    }
    // Replace multiple dots with a single dot (e.g., if a key was empty string or from replacements)
    path = path.replace(/\.{2,}/g, '.');

    const normalizedDiffPath = path;
    if (normalizedDiffPath === undefined || normalizedDiffPath === null) return;

    diffPaths.add(normalizedDiffPath);

    if (normalizedDiffPath === '') {
      parentDiffPaths.add('');
    } else {
      const parts = normalizedDiffPath.split('.');
      for (let i = parts.length; i > 0; i--) {
        parentDiffPaths.add(parts.slice(0, i).join('.'));
      }
    }
  });

  const filterRecursively = (currentJson: any, currentPathInJson: string): any => {
    if (currentJson === null || typeof currentJson !== 'object') {
      return diffPaths.has(currentPathInJson) ? currentJson : undefined;
    }

    let isDirectDiff = diffPaths.has(currentPathInJson);
    let isParentOfDiff = parentDiffPaths.has(currentPathInJson);
    
    // Special handling for root: if any diffs exist, root structure should be present.
    if (currentPathInJson === '' && (diffPaths.size > 0 || parentDiffPaths.size > 0) && !isDirectDiff && !isParentOfDiff) {
        isParentOfDiff = true; // Ensure root is considered a parent if any diffs exist
    }
    
    const shouldKeepBranch = isDirectDiff || isParentOfDiff;

    if (!shouldKeepBranch) {
      return undefined;
    }

    if (Array.isArray(currentJson)) {
      const filteredArray: any[] = [];
      let hasKeptItems = false;
      currentJson.forEach((item, index) => {
        const itemPath = currentPathInJson ? `${currentPathInJson}.${index}` : `${index}`;
        const filteredItem = filterRecursively(item, itemPath);
        if (filteredItem !== undefined) {
          // To keep original structure with potentially sparse arrays for display
          while (filteredArray.length < index) {
            filteredArray.push(undefined); // Pad with undefined if creating sparse array
          }
          filteredArray[index] = filteredItem;
          hasKeptItems = true;
        } else {
          // If item is filtered out, but its path is a parent of a diff (or a diff itself that results in undefined like empty obj)
          // ensure its place is preserved if the array itself is kept.
          // Add undefined to maintain structure if this specific item is not kept but array is.
           if (parentDiffPaths.has(itemPath) || diffPaths.has(itemPath)) {
             while (filteredArray.length < index) {
               filteredArray.push(undefined);
             }
             filteredArray[index] = undefined; // Explicitly mark as undefined to keep structure
           }
        }
      });
      // If the branch must be kept (it's a diff or ancestor), return the array, even if it's empty or all undefined.
      // Otherwise (not a diff/ancestor itself), return it only if it has actual content.
      // This was simplified: if shouldKeepBranch is true, we always return it.
      return filteredArray; // Always return the array if shouldKeepBranch is true
    }

    // For objects
    const result: Record<string, any> = {};
    let hasKeptKeys = false;
    Object.keys(currentJson).forEach(key => { // Use Object.keys to iterate in a way that matches typical JSON processing
      const value = currentJson[key];
      const childPath = currentPathInJson ? `${currentPathInJson}.${key}` : key;
      const filteredValue = filterRecursively(value, childPath);
      if (filteredValue !== undefined) {
        result[key] = filteredValue;
        hasKeptKeys = true;
      } else {
         // If value is filtered out, but its path is a parent of a diff
         // we might want to represent the key with undefined value if the object itself is kept.
         if (parentDiffPaths.has(childPath) || diffPaths.has(childPath)) {
            result[key] = undefined; // Explicitly keep key with undefined if it's on a diff path
         }
      }
    });
    
    // If shouldKeepBranch is true, return the result object, even if it's empty or contains only undefined values.
    return result; 
  };

  const finalFilteredJson = filterRecursively(json, parentPath);

  // If the root itself was an object or array and it's now undefined, 
  // but there were diffs, return an empty version of the original type.
  if (parentPath === '' && finalFilteredJson === undefined && (diffPaths.size > 0 || parentDiffPaths.size > 0)) {
    if (Array.isArray(json)) return [];
    if (typeof json === 'object' && json !== null) return {};
  }

  return finalFilteredJson;
};

export const DiffFilteredJsonView: React.FC<DiffFilteredJsonViewProps> = ({
  originalJson,
  diffResults,
  height = 400,
  jsonData,
  diffs,
  viewerId,
  expandedPaths,
  setExpandedPaths,
  highlightPath,
  renderPath,
  idKey,
}) => {
  const { scrollSync } = useContext(JsonViewerSyncContext);

  const normalizeDiffPath = useCallback((path: string) => {
    // Normalize path for internal consistency
    let normalizedPath = path.replace(/\[(\d+)\]/g, '.$1'); // Convert array notation to dot notation

    // Remove any leading dot
    if (normalizedPath.startsWith('.')) {
      normalizedPath = normalizedPath.substring(1);
    }

    return normalizedPath;
  }, []);

  const filteredJson = useMemo(() => {
    if (!diffs || diffs.length === 0) {
      // If there are no diffs, and we're in "show diffs only" mode,
      // effectively nothing should be shown from this view's perspective.
      // Return an empty object or null to signify this.
      return {}; // Or null, depending on how JsonNode handles it.
    }

    // Filter the JSON to include only the parts that have differences
    return filterJsonByDiffs(originalJson, diffs);
  }, [originalJson, diffs, normalizeDiffPath]);

  const rootNodePath = `root_${viewerId}_root`;

  // console.log(`[DiffFilteredJsonView-${viewerId}] Filtered JSON:`, JSON.stringify(filteredJson, null, 2));
  // console.log(`[DiffFilteredJsonView-${viewerId}] Diffs:`, diffs);


  // If filteredJson is effectively empty (e.g., {} or null) and diffs exist,
  // it implies that the root itself was filtered out, which shouldn't happen if diffs exist.
  // However, filterJsonByDiffs is designed to preserve the path to diffs.
  // An empty filteredJson with non-empty diffs should ideally not occur unless jsonData itself is empty.

  return (
    <JsonNode
      nodeKey={viewerId === 'viewer1' ? 'json1' : 'json2'}
      data={filteredJson} // Pass the ALREADY filtered data
      path={''} // Path for JsonNode relative to its data (root is empty)
      fullPath={rootNodePath} // Prefixed full path for expansion/highlight state
      level={0}
      isRoot={true}
      viewerId={viewerId}
      colors={undefined} // colors prop removed as useTheme is not used
      expandedPaths={expandedPaths}
      setExpandedPaths={setExpandedPaths}
      highlightPath={highlightPath}
      renderPath={renderPath}
      scrollSync={scrollSync}
      diffs={diffs} // Pass original diffs for highlighting
      showDiffsOnly={false} // CRITICAL CHANGE: Data is already filtered.
      idKey={idKey}
    />
  );
};

export default DiffFilteredJsonView;
