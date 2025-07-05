import React from 'react';
import { useJsonViewerSync } from '../JsonViewerSyncContext';
// Ensure DiffResult is imported from the correct location
import type { DiffResult } from '../../utils/jsonCompare';
import { createNumericPath, validateAndCreateNumericPath } from '../../utils/PathTypes';
import './DiffList.css';

interface DiffListProps {
  diffs: DiffResult[];
  height?: number | string;
  jsonData?: { left: any; right: any }; // Add JSON data for ID-based correlation
}

export const DiffList: React.FC<DiffListProps> = ({
  diffs,
  height = 'calc(25vh - 50px)',
  jsonData,
}) => {
  const { 
    ignoredDiffs,
    // toggleIgnoreDiff,
    addIgnoredPattern,
    isPathIgnoredByPattern,
    goToDiff,
    setPersistentHighlightPath
  } = useJsonViewerSync();

  // Filter out ignored diffs (both manually ignored and pattern-matched)
  const visibleDiffs = diffs.filter(diff => 
    diff.numericPath && !ignoredDiffs.has(diff.numericPath) && !isPathIgnoredByPattern(diff.numericPath)
  );

  const handleIgnore = (numericDiffPath: string) => {
    // Check if the path is already ignored by any pattern
    if (isPathIgnoredByPattern(numericDiffPath)) {
      console.log('[DiffList] Path is already ignored by a pattern:', numericDiffPath);
      return; // Don't add duplicate
    }
    
    // Ensure the path has the "root." prefix for persistent highlighting
    const pathWithRoot = numericDiffPath.startsWith('root.') ? numericDiffPath : `root.${numericDiffPath}`;
    
    // Set persistent highlight for the ignored node (border only)
    setPersistentHighlightPath(pathWithRoot);
    
    // Add the exact path as an ignored pattern (without root prefix for pattern matching)
    addIgnoredPattern(numericDiffPath);
  };

  const handleGoToDiff = (diff: DiffResult) => {
    console.log('[DiffList] 🎯 GoTo diff:', diff.idBasedPath || diff.numericPath);
    
    // Check if this diff involves ID-based arrays
    const idBasedPath = diff.idBasedPath;
    const hasIdBasedArrays = idBasedPath && idBasedPath.includes('[id=');
    
    if (hasIdBasedArrays && jsonData) {
      handleIdBasedCorrelation(idBasedPath, diff);
    } else {
      // Fallback to simple numeric path
      const numericPath = diff.numericPath;
      const pathWithRoot = numericPath.startsWith('root.') ? numericPath : `root.${numericPath}`;
      goToDiff(validateAndCreateNumericPath(pathWithRoot, 'DiffResult.numericPath'));
    }
  };

  // Smart ID-based correlation function
  const handleIdBasedCorrelation = (idBasedPath: string, diff: DiffResult) => {
    // Step 1: Find the corresponding numeric path in LEFT viewer
    const leftNumericPath = findNumericPathForIdBasedPath(idBasedPath, 'left');
    
    // Step 2: Find the corresponding numeric path in RIGHT viewer  
    const rightNumericPath = findNumericPathForIdBasedPath(idBasedPath, 'right');
    
    if (leftNumericPath && rightNumericPath) {
      // Add root prefix if needed
      const leftPathWithRoot = leftNumericPath.startsWith('root.') ? leftNumericPath : `root.${leftNumericPath}`;
      const rightPathWithRoot = rightNumericPath.startsWith('root.') ? rightNumericPath : `root.${rightNumericPath}`;
      
      // First, expand to the parent array to ensure it's available
      const parentPath = getParentArrayPath(leftPathWithRoot);
      if (parentPath) {
        console.log('[DiffList] 📂 Expanding parent array first:', parentPath);
        goToDiff(validateAndCreateNumericPath(parentPath, 'DiffResult.parentPath'));
        
        // Then navigate to the actual target after parent is expanded
        setTimeout(() => {
          goToDiff(validateAndCreateNumericPath(leftPathWithRoot, 'DiffResult.leftPath'));
          
          // Finally highlight both elements
          setTimeout(() => {
            highlightBothElements(leftPathWithRoot, rightPathWithRoot);
          }, 500);
        }, 800);
      } else {
        // No parent array, navigate directly
        goToDiff(validateAndCreateNumericPath(leftPathWithRoot, 'DiffResult.leftPath'));
        setTimeout(() => {
          highlightBothElements(leftPathWithRoot, rightPathWithRoot);
        }, 500);
      }
      
    } else {
      // Fallback to simple numeric path
      const numericPath = diff.numericPath;
      const pathWithRoot = numericPath.startsWith('root.') ? numericPath : `root.${numericPath}`;
      goToDiff(validateAndCreateNumericPath(pathWithRoot, 'DiffResult.numericPath fallback'));
    }
  };

  // Helper function to get parent array path for better expansion
  const getParentArrayPath = (fullPath: string): string | null => {
    // For paths like "root.a.b[1].c[2].d", we want to return "root.a.b[1].c"
    // This ensures the parent array is expanded before trying to find the specific element
    const segments = fullPath.split('.');
    
    // Find the last segment that contains an array index
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].includes('[') && segments[i].includes(']')) {
        // This segment has an array index, so the parent path is everything before the next property
        if (i < segments.length - 1) {
          return segments.slice(0, i + 1).join('.');
        }
      }
    }
    
    return null; // No parent array found
  };

  // Helper function to find numeric path for an ID-based path in a specific JSON viewer
  const findNumericPathForIdBasedPath = (idBasedPath: string, side: 'left' | 'right'): string | null => {
    
    if (!jsonData) return null;
    
    const targetData = side === 'left' ? jsonData.left : jsonData.right;
    if (!targetData) return null;
    
    try {
      return traverseJsonByIdBasedPath(targetData, idBasedPath);
    } catch (error) {
      return null;
    }
  };

  // Helper function to traverse JSON and convert ID-based path to numeric path
  const traverseJsonByIdBasedPath = (data: any, idBasedPath: string): string | null => {
    // Parse ID-based path: "boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-catchup-50-separate_0].contributionType"
    const segments = idBasedPath.split('.');
    
    let currentData = data;
    let numericPath = '';
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Handle ID-based array access: "arrayName[id=value]"
      const idArrayMatch = segment.match(/^([^[]+)\[id=([^\]]+)\]$/);
      if (idArrayMatch) {
        const [, arrayName, targetId] = idArrayMatch;
        
        // Add array name to path
        if (numericPath) numericPath += '.';
        numericPath += arrayName;
        
        // Navigate to array
        currentData = currentData[arrayName];
        if (!Array.isArray(currentData)) {
          throw new Error(`Expected array at ${arrayName}`);
        }
        
        // Find item with target ID
        console.log(`[DiffList] 🔍 Looking for ID "${targetId}" in ${arrayName} array:`, currentData);
        
        const foundIndex = currentData.findIndex((item: any, index: number) => {
          if (typeof item !== 'object' || item === null) return false;
          
          console.log(`[DiffList] 🔍   Item ${index}:`, item);
          
          // Check if any property matches the target ID
          for (const [key, value] of Object.entries(item)) {
            console.log(`[DiffList] 🔍     Checking ${key}: "${value}" vs "${targetId}"`);
            if (String(value) === targetId) {
              console.log(`[DiffList] ✅     Found match!`);
              return true;
            }
          }
          return false;
        });
        
        if (foundIndex === -1) {
          console.log(`[DiffList] ❌ Could not find item with ID "${targetId}" in ${arrayName}`);
          throw new Error(`Could not find item with ID ${targetId} in ${arrayName}`);
        }
        
        console.log(`[DiffList] ✅ Found item at index ${foundIndex}`);
        
        // Add numeric index
        numericPath += `[${foundIndex}]`;
        currentData = currentData[foundIndex];
        
      } else if (segment.includes('[') && segment.includes(']')) {
        // Handle numeric array access: "arrayName[0]"
        const numericArrayMatch = segment.match(/^([^[]+)\[(\d+)\]$/);
        if (numericArrayMatch) {
          const [, arrayName, index] = numericArrayMatch;
          
          if (numericPath) numericPath += '.';
          numericPath += `${arrayName}[${index}]`;
          
          currentData = currentData[arrayName][parseInt(index)];
        }
      } else {
        // Handle simple property access
        if (numericPath) numericPath += '.';
        numericPath += segment;
        
        currentData = currentData[segment];
      }
      
      if (currentData === undefined) {
        throw new Error(`Property ${segment} not found`);
      }
    }
    
    return numericPath;
  };

  // Simplified highlighting function that highlights both elements after expansion
  const highlightBothElements = (leftPath: string, rightPath: string) => {
    // Find all elements with either path
    const leftElements = document.querySelectorAll(`[data-path="${leftPath}"]`);
    const rightElements = document.querySelectorAll(`[data-path="${rightPath}"]`);
    
    // Clear existing highlights
    document.querySelectorAll('.highlighted-node, .persistent-highlight').forEach(el => {
      el.classList.remove('highlighted-node', 'persistent-highlight');
    });
    
    // Highlight found elements
    leftElements.forEach(element => {
      element.classList.add('highlighted-node', 'persistent-highlight');
    });
    
    rightElements.forEach(element => {
      element.classList.add('highlighted-node', 'persistent-highlight');
    });
  };

  const formatValue = (value: any, truncate: boolean = true): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `Array(${value.length})`;
      }
      return `Object{${Object.keys(value).length} keys}`;
    }
    
    if (typeof value === 'string') {
      if (truncate && value.length > 30) {
        return `"${value.substring(0, 30)}..."`;
      }
      return `"${value}"`;
    }
    return String(value);
  };
  
  const getDiffSummary = (diff: DiffResult, truncate: boolean = true): string => {
    switch (diff.type) {
      case 'added':
        // Use value2 for added diffs (+ indicates added to the new/right version)
        return `+ Added: ${formatValue(diff.value2, truncate)}`;
      case 'removed':
        // Use value1 for removed diffs (- indicates removed from the old/left version)
        return `- Removed: ${formatValue(diff.value1, truncate)}`;
      case 'changed':
        // Use value1 and value2 for changed diffs
        return `~ Changed: ${formatValue(diff.value1, truncate)} → ${formatValue(diff.value2, truncate)}`;
      default:
        return '';
    }
  };

  return (
    <div className="diff-list-container" style={{ height }}>
      <div className="diff-list-content">
        {visibleDiffs.length === 0 ? (
          <div className="no-diffs">
            {diffs.length === 0 ? "No differences found." : "All differences are ignored."}
          </div>
        ) : (
          <ul className="diff-items">
            {visibleDiffs.map((diff, index) => (
              <li 
                // Use numericPath for key if displayPath might not be unique enough,
                // though index is fine if diffs array doesn't change order.
                // Combining with displayPath for more robustness if needed.
                key={`${diff.numericPath}-${index}`} 
                className={`diff-item ${diff.type} ${ignoredDiffs.has(diff.numericPath) ? 'ignored' : ''}`}
              >
                <div className="diff-item-content">
                  <span className="diff-number">{index + 1}.</span>
                  <span className="diff-path-inline">
                    {diff.idBasedPath.startsWith('root.') ? diff.idBasedPath.substring(5) : diff.idBasedPath}
                  </span>
                  <span 
                    className="diff-summary-inline"
                    title={getDiffSummary(diff, false)} // Full content for tooltip
                  >
                    {getDiffSummary(diff, true)} {/* Truncated content for display */}
                  </span>
                  {ignoredDiffs.has(diff.numericPath) && <span className="ignored-badge">Ignored</span>}
                  <div className="diff-actions">
                    <button 
                      className="goto-button"
                      onClick={() => handleGoToDiff(diff)}
                      title="Navigate to this difference"
                    >
                      Go To
                    </button>
                    <button 
                      className={`ignore-button ${ignoredDiffs.has(diff.numericPath) ? 'restore-button' : ''}`}
                      onClick={() => handleIgnore(diff.numericPath)}
                      disabled={isPathIgnoredByPattern(diff.numericPath)}
                      title={
                        isPathIgnoredByPattern(diff.numericPath) 
                          ? "This path is already ignored by a pattern"
                          : ignoredDiffs.has(diff.numericPath) 
                            ? "Restore this difference" 
                            : "Ignore this difference"
                      }
                    >
                      {isPathIgnoredByPattern(diff.numericPath) 
                        ? "Already Ignored" 
                        : ignoredDiffs.has(diff.numericPath) 
                          ? "Restore" 
                          : "Ignore"
                      }
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
