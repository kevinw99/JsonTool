import React from 'react';
import { useJsonViewerSync } from '../JsonViewerSyncContext';
// Ensure DiffResult is imported from the correct location
import type { DiffResult } from '../../utils/jsonCompare';
import { resolveIdBasedPathToNumeric } from '../../utils/pathResolution';
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
    setPersistentHighlightPath,
    idKeysUsed
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
    
    if (hasIdBasedArrays && jsonData && idKeysUsed) {
      console.log('[DiffList] 🔍 Found ID-based arrays - using PathConverter-based correlation');
      
      try {
        // NEW: Use PathConverter-based path resolution
        const { leftPath, rightPath } = resolveIdBasedPathToNumeric(
          idBasedPath,
          jsonData,
          idKeysUsed
        );
        
        console.log('[DiffList] 🎯 PathConverter results - LEFT:', leftPath, 'RIGHT:', rightPath);
        
        if (leftPath && rightPath) {
          console.log('[DiffList] ✅ Found both paths - using new goToDiffWithPaths navigation');
          console.log('[DiffList] 🎯 LEFT path (viewer1):', leftPath);
          console.log('[DiffList] 🎯 RIGHT path (viewer2):', rightPath);
          
          // Use the new dual-path navigation function
          goToDiffWithPaths(leftPath, rightPath);
          
        } else {
          console.log('[DiffList] ❌ PathConverter could not resolve paths - falling back to ID-based path');
          const pathWithRoot = idBasedPath.startsWith('root.') ? idBasedPath : `root.${idBasedPath}`;
          goToDiff(pathWithRoot);
        }
      } catch (error) {
        console.error('[DiffList] 🚨 Error during PathConverter-based correlation:', error);
        console.log('[DiffList] 🔄 Falling back to ID-based path due to error');
        const pathWithRoot = idBasedPath.startsWith('root.') ? idBasedPath : `root.${idBasedPath}`;
        goToDiff(pathWithRoot);
      }
    } else {
      console.log('[DiffList] 📍 Using simple ID-based path approach');
      // Use ID-based path (viewer-agnostic)
      const pathWithRoot = idBasedPath.startsWith('root.') ? idBasedPath : `root.${idBasedPath}`;
      goToDiff(pathWithRoot);
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
