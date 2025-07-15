import React from 'react';
import { useJsonViewerSync } from '../JsonViewerSyncContext';
// Ensure DiffResult is imported from the correct location
import type { DiffResult } from '../../utils/jsonCompare';
import type { IdBasedPath, ViewerPath } from '../../utils/PathTypes';
import { createViewerPath, validateAndCreateIdBasedPath, validateAndCreateNumericPath, hasIdBasedSegments, createIdBasedPath } from '../../utils/PathTypes';
import { convertIdPathToViewerPath, type PathConversionContext } from '../../utils/PathConverter';
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
    goToDiffWithPaths,
    setPersistentHighlightPaths,
    idKeysUsed
  } = useJsonViewerSync();

  // Filter out ignored diffs (both manually ignored and pattern-matched)
  const visibleDiffs = diffs.filter(diff => 
    diff.idBasedPath && !ignoredDiffs.has(diff.idBasedPath) && !isPathIgnoredByPattern(validateAndCreateIdBasedPath(diff.idBasedPath, 'DiffList.visibleDiffs'))
  );

  const handleIgnore = (idBasedDiffPath: IdBasedPath) => {
    // Check if the path is already ignored by any pattern
    if (isPathIgnoredByPattern(idBasedDiffPath)) {
      console.log('[DiffList] Path is already ignored by a pattern:', idBasedDiffPath);
      return; // Don't add duplicate
    }
    
    // Set persistent highlight for the ignored node (border only)
    const highlights = new Set<ViewerPath>([
      createViewerPath('left', validateAndCreateNumericPath(idBasedDiffPath, 'DiffList.handleIgnore')),
      createViewerPath('right', validateAndCreateNumericPath(idBasedDiffPath, 'DiffList.handleIgnore'))
    ]);
    setPersistentHighlightPaths(highlights);
    
    // Add the exact path as an ignored pattern (without root prefix for pattern matching)
    addIgnoredPattern(idBasedDiffPath);
  };

  const handleGoToDiff = (diff: DiffResult) => {
    console.log('[DiffList] 🎯 GoTo diff clicked - checking for ID-based correlation');
    console.log('[DiffList] 📍 idBasedPath:', diff.idBasedPath);
    
    // Check if this diff involves ID-based arrays
    const idBasedPath = diff.idBasedPath;
    const hasIdBasedArrays = idBasedPath && hasIdBasedSegments(createIdBasedPath(idBasedPath));
    
    if (hasIdBasedArrays && jsonData && idKeysUsed) {
      console.log('[DiffList] 🔍 Found ID-based arrays - using PathConverter-based correlation');
      
      try {
        // Create conversion contexts for both viewers
        const leftContext: PathConversionContext = { 
          jsonData: jsonData.left, 
          idKeysUsed 
        };
        const rightContext: PathConversionContext = { 
          jsonData: jsonData.right, 
          idKeysUsed 
        };
        
        // Convert ID-based path to ViewerPaths directly
        const leftViewerPath = convertIdPathToViewerPath(
          createIdBasedPath(idBasedPath), 
          leftContext, 
          'left'
        );
        const rightViewerPath = convertIdPathToViewerPath(
          createIdBasedPath(idBasedPath), 
          rightContext, 
          'right'
        );
        
        console.log('[DiffList] 🎯 PathConverter results - LEFT:', leftViewerPath, 'RIGHT:', rightViewerPath);
        
        if (leftViewerPath || rightViewerPath) {
          console.log('[DiffList] ✅ Found ViewerPath(s) - diff type:', diff.type);
          console.log('[DiffList] 🎯 LEFT ViewerPath:', leftViewerPath || 'null');
          console.log('[DiffList] 🎯 RIGHT ViewerPath:', rightViewerPath || 'null');
          
          if (leftViewerPath && rightViewerPath) {
            // Both paths exist - changed item
            console.log('[DiffList] 🔄 Changed item - navigate to both viewers');
            goToDiffWithPaths(leftViewerPath, rightViewerPath, true, true);
            
          } else if (leftViewerPath && !rightViewerPath) {
            // Only left path exists - removed item
            console.log('[DiffList] ➖ Removed item - use goToDiffWithPaths with left viewer path');
            // For removed items, pass the left path for both parameters
            // goToDiffWithPaths will detect that only the left element exists and navigate accordingly
            goToDiffWithPaths(leftViewerPath, leftViewerPath, true, false);
            
          } else if (!leftViewerPath && rightViewerPath) {
            // Only right path exists - added item
            console.log('[DiffList] ➕ Added item - use goToDiffWithPaths with right viewer path');
            // For added items, pass the right path for both parameters  
            // goToDiffWithPaths will detect that only the right element exists and navigate accordingly
            goToDiffWithPaths(rightViewerPath, rightViewerPath, false, true);
          }
          
        } else {
          console.log('[DiffList] ❌ PathConverter could not resolve paths - falling back to ID-based path');
          goToDiff(validateAndCreateIdBasedPath(idBasedPath, 'DiffList.handleGoToDiff.fallback1'));
        }
      } catch (error) {
        console.error('[DiffList] 🚨 Error during PathConverter-based correlation:', error);
        console.log('[DiffList] 🔄 Falling back to ID-based path due to error');
        goToDiff(validateAndCreateIdBasedPath(idBasedPath, 'DiffList.handleGoToDiff.fallback2'));
      }
    } else {
      console.log('[DiffList] 📍 Using simple ID-based path approach');
      // Use ID-based path (viewer-agnostic) - add root prefix only when needed for navigation
      goToDiff(validateAndCreateIdBasedPath(idBasedPath, 'DiffList.handleGoToDiff.simple'));
    }
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
                  <code 
                    className="diff-path-inline clickable"
                    onClick={() => handleGoToDiff(diff)}
                    title={diff.idBasedPath}
                  >
                    {diff.idBasedPath}
                  </code>
                  <span 
                    className="diff-summary-inline"
                    title={getDiffSummary(diff, false)} // Full content for tooltip
                  >
                    {getDiffSummary(diff, true)} {/* Truncated content for display */}
                  </span>
                  {ignoredDiffs.has(diff.idBasedPath) && <span className="ignored-badge">Ignored</span>}
                  <div className="diff-actions">
                    <button 
                      className={`ignore-button ${ignoredDiffs.has(diff.idBasedPath) ? 'restore-button' : ''}`}
                      onClick={() => handleIgnore(validateAndCreateIdBasedPath(diff.idBasedPath, 'DiffList.button.onClick'))}
                      disabled={isPathIgnoredByPattern(validateAndCreateIdBasedPath(diff.idBasedPath, 'DiffList.button.disabled'))}
                      title={
                        isPathIgnoredByPattern(validateAndCreateIdBasedPath(diff.idBasedPath, 'DiffList.button.title')) 
                          ? "This path is already ignored by a pattern"
                          : ignoredDiffs.has(diff.idBasedPath) 
                            ? "Restore this difference" 
                            : "Ignore this difference"
                      }
                    >
                      {isPathIgnoredByPattern(validateAndCreateIdBasedPath(diff.idBasedPath, 'DiffList.button.text')) 
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
