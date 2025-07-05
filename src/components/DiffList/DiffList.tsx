import React from 'react';
import { useJsonViewerSync } from '../JsonViewerSyncContext';
import { convertIdPathToIndexPath } from '../../utils/PathConverter';
import { unsafeIdBasedPath } from '../../utils/PathTypes';
// Ensure DiffResult is imported from the correct location
import type { DiffResult } from '../../utils/jsonCompare';
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
    diff.idBasedPath && !ignoredDiffs.has(diff.idBasedPath) && !isPathIgnoredByPattern(diff.idBasedPath)
  );

  const handleIgnore = (idBasedDiffPath: string) => {
    // Check if the path is already ignored by any pattern
    if (isPathIgnoredByPattern(idBasedDiffPath)) {
      console.log('[DiffList] Path is already ignored by a pattern:', idBasedDiffPath);
      return; // Don't add duplicate
    }
    
    // Ensure the path has the "root." prefix for persistent highlighting
    const pathWithRoot = idBasedDiffPath.startsWith('root.') ? idBasedDiffPath : `root.${idBasedDiffPath}`;
    
    // Set persistent highlight for the ignored node (border only)
    setPersistentHighlightPath(pathWithRoot);
    
    // Add the exact path as an ignored pattern (without root prefix for pattern matching)
    addIgnoredPattern(idBasedDiffPath);
  };

  const handleGoToDiff = (diff: DiffResult) => {
    console.log('[DiffList] 🎯 GoTo diff clicked - checking for ID-based correlation');
    console.log('[DiffList] 📍 idBasedPath:', diff.idBasedPath);
    
    // Check if this diff involves ID-based arrays
    const idBasedPath = diff.idBasedPath;
    const hasIdBasedArrays = idBasedPath && idBasedPath.includes('[id=');
    
    if (hasIdBasedArrays && jsonData) {
      console.log('[DiffList] 🔍 Found ID-based arrays - using smart correlation');
      handleIdBasedCorrelation(idBasedPath, diff);
    } else {
      console.log('[DiffList] 📍 Using simple ID-based path approach');
      // Use ID-based path (viewer-agnostic)
      const idBasedPath = diff.idBasedPath;
      const pathWithRoot = idBasedPath.startsWith('root.') ? idBasedPath : `root.${idBasedPath}`;
      goToDiff(pathWithRoot);
    }
  };

  // Smart ID-based correlation function
  const handleIdBasedCorrelation = (idBasedPath: string, diff: DiffResult) => {
    console.log('[DiffList] 🔍 Starting ID-based correlation for:', idBasedPath);
    
    try {
      // Step 1: Find the corresponding numeric path in LEFT viewer
      const leftNumericPath = findNumericPathForIdBasedPath(idBasedPath, 'left');
      
      // Step 2: Find the corresponding numeric path in RIGHT viewer  
      const rightNumericPath = findNumericPathForIdBasedPath(idBasedPath, 'right');
      
      console.log('[DiffList] 🎯 Correlation results:');
      console.log('[DiffList] 🎯 LEFT numeric path:', leftNumericPath);
      console.log('[DiffList] 🎯 RIGHT numeric path:', rightNumericPath);
      
      if (leftNumericPath && rightNumericPath) {
        console.log('[DiffList] ✅ Found both paths - highlighting corresponding elements');
        
        // Add root prefix if needed
        const leftPathWithRoot = leftNumericPath.startsWith('root.') ? leftNumericPath : `root.${leftNumericPath}`;
        const rightPathWithRoot = rightNumericPath.startsWith('root.') ? rightNumericPath : `root.${rightNumericPath}`;
        
        console.log('[DiffList] 🎯 LEFT path with root:', leftPathWithRoot);
        console.log('[DiffList] 🎯 RIGHT path with root:', rightPathWithRoot);
        
        // FIXED: Use manual DOM highlighting instead of goToDiff to avoid overwriting
        highlightElementsManually(leftPathWithRoot, rightPathWithRoot);
        
      } else {
        console.log('[DiffList] ❌ Could not find both paths - falling back to ID-based path');
        const idBasedPath = diff.idBasedPath;
        const pathWithRoot = idBasedPath.startsWith('root.') ? idBasedPath : `root.${idBasedPath}`;
        goToDiff(pathWithRoot);
      }
    } catch (error) {
      console.error('[DiffList] 🚨 Error during ID-based correlation:', error);
      console.log('[DiffList] 🔄 Falling back to ID-based path due to error');
      const idBasedPath = diff.idBasedPath;
      const pathWithRoot = idBasedPath.startsWith('root.') ? idBasedPath : `root.${idBasedPath}`;
      goToDiff(pathWithRoot);
    }
  };


  // Helper function to find numeric path for an ID-based path in a specific JSON viewer
  const findNumericPathForIdBasedPath = (idBasedPath: string, side: 'left' | 'right'): string | null => {
    console.log(`[DiffList] 🔍 ${side.toUpperCase()} - Searching for:`, idBasedPath);
    
    if (!jsonData) {
      console.log(`[DiffList] ❌ No JSON data available`);
      return null;
    }
    
    const targetData = side === 'left' ? jsonData.left : jsonData.right;
    if (!targetData) {
      console.log(`[DiffList] ❌ No ${side} JSON data`);
      return null;
    }
    
    try {
      const numericPath = traverseJsonByIdBasedPath(targetData, idBasedPath);
      console.log(`[DiffList] ✅ ${side.toUpperCase()} found:`, numericPath);
      return numericPath;
    } catch (error) {
      console.log(`[DiffList] ❌ ${side.toUpperCase()} error:`, error);
      throw error; // Re-throw instead of failing silently
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
        const foundIndex = currentData.findIndex((item: any) => {
          if (typeof item !== 'object' || item === null) return false;
          
          // Check if any property matches the target ID
          for (const value of Object.values(item)) {
            if (String(value) === targetId) return true;
          }
          return false;
        });
        
        if (foundIndex === -1) {
          throw new Error(`Could not find item with ID ${targetId} in ${arrayName}`);
        }
        
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

  // Manual highlighting function that can highlight different paths in each viewer
  const highlightElementsManually = (leftPath: string, rightPath: string) => {
    console.log('[DiffList] 🔧 Manual highlighting - LEFT:', leftPath, 'RIGHT:', rightPath);
    
    // IMPORTANT: We need to expand arrays step by step since DOM elements don't exist for collapsed arrays
    
    // Extract the array paths that need to be expanded first
    const leftArrayPath = getArrayContainerPath(leftPath);
    const rightArrayPath = getArrayContainerPath(rightPath);
    
    console.log('[DiffList] 📂 Step 1: Expanding array containers');
    console.log('[DiffList] 📂 LEFT array container:', leftArrayPath);
    console.log('[DiffList] 📂 RIGHT array container:', rightArrayPath);
    
    // Step 1: Expand the array containers first
    if (leftArrayPath) goToDiff(leftArrayPath);
    if (rightArrayPath && rightArrayPath !== leftArrayPath) {
      setTimeout(() => goToDiff(rightArrayPath), 300);
    }
    
    // Step 2: After arrays are expanded, navigate to the actual target elements
    setTimeout(() => {
      console.log('[DiffList] 📂 Step 2: Navigating to target elements');
      goToDiff(leftPath);
      
      setTimeout(() => {
        goToDiff(rightPath);
        
        // Step 3: After both expansions, manually highlight elements
        setTimeout(() => {
          console.log('[DiffList] ✨ Step 3: Finding and highlighting both elements manually');
          
          // Find LEFT element
          const leftElements = document.querySelectorAll(`[data-path="${leftPath}"]`);
          console.log(`[DiffList] 🔍 Found ${leftElements.length} LEFT elements for path: ${leftPath}`);
          
          // Find RIGHT element  
          const rightElements = document.querySelectorAll(`[data-path="${rightPath}"]`);
          console.log(`[DiffList] 🔍 Found ${rightElements.length} RIGHT elements for path: ${rightPath}`);
          
          // Clear all existing highlights first
          document.querySelectorAll('.highlighted-node, .persistent-highlight').forEach(el => {
            el.classList.remove('highlighted-node', 'persistent-highlight');
          });
          
          // Highlight LEFT elements (only in left viewer)
          leftElements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const isLeftViewer = rect.left < viewportWidth / 2;
            
            if (isLeftViewer) {
              element.classList.add('highlighted-node', 'persistent-highlight');
              console.log(`[DiffList] ✅ Highlighted LEFT element ${index + 1}`);
            }
          });
          
          // Highlight RIGHT elements (only in right viewer)  
          rightElements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const isRightViewer = rect.left >= viewportWidth / 2;
            
            if (isRightViewer) {
              element.classList.add('highlighted-node', 'persistent-highlight');
              console.log(`[DiffList] ✅ Highlighted RIGHT element ${index + 1}`);
            }
          });
          
          console.log('[DiffList] 🎉 Manual dual highlighting completed');
          
        }, 800); // Wait for final expansions to complete
      }, 400); // Wait between left and right navigation
    }, 800); // Wait for array expansions to complete
  };
  
  // Helper function to extract the array container path from a full path
  const getArrayContainerPath = (fullPath: string): string | null => {
    // For "root.accountParams[1].contributions[0].contributionType"
    // We want "root.accountParams[1].contributions" (the array container)
    
    const match = fullPath.match(/^(.+\.[^.\[]+)\[[^\]]+\]\.[^.]+$/);
    if (match) {
      const arrayPath = match[1];
      console.log(`[DiffList] 🔍 Extracted array path from "${fullPath}": "${arrayPath}"`);
      return arrayPath;
    }
    
    console.log(`[DiffList] 🔍 No array container found in path: "${fullPath}"`);
    return null;
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
                // Use idBasedPath for key - it's viewer-agnostic and unique
                key={`${diff.idBasedPath}-${index}`} 
                className={`diff-item ${diff.type} ${ignoredDiffs.has(diff.idBasedPath) ? 'ignored' : ''}`}
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
                  {ignoredDiffs.has(diff.idBasedPath) && <span className="ignored-badge">Ignored</span>}
                  <div className="diff-actions">
                    <button 
                      className="goto-button"
                      onClick={() => handleGoToDiff(diff)}
                      title="Navigate to this difference"
                    >
                      Go To
                    </button>
                    <button 
                      className={`ignore-button ${ignoredDiffs.has(diff.idBasedPath) ? 'restore-button' : ''}`}
                      onClick={() => handleIgnore(diff.idBasedPath)}
                      disabled={isPathIgnoredByPattern(diff.idBasedPath)}
                      title={
                        isPathIgnoredByPattern(diff.idBasedPath) 
                          ? "This path is already ignored by a pattern"
                          : ignoredDiffs.has(diff.idBasedPath) 
                            ? "Restore this difference" 
                            : "Ignore this difference"
                      }
                    >
                      {isPathIgnoredByPattern(diff.idBasedPath) 
                        ? "Already Ignored" 
                        : ignoredDiffs.has(diff.idBasedPath) 
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
