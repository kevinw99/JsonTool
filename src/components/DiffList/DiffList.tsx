import React from 'react';
import { useJsonViewerSync } from '../JsonViewerSyncContext';
// Ensure DiffResult is imported from the correct location
import type { DiffResult } from '../../utils/jsonCompare'; 
import './DiffList.css';

interface DiffListProps {
  diffs: DiffResult[];
  height?: number | string;
}

export const DiffList: React.FC<DiffListProps> = ({
  diffs,
  height = 'calc(25vh - 50px)',
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

  const handleGoToDiff = (numericDiffPath: string) => {
    console.log('[DiffList] 🔍 GoTo button clicked for numeric path:', numericDiffPath);
    
    // Ensure the path has the "root." prefix to match JsonTreeView DOM structure
    const pathWithRoot = numericDiffPath.startsWith('root.') ? numericDiffPath : `root.${numericDiffPath}`;
    console.log('[DiffList] 🔍 Calling goToDiff with path:', pathWithRoot);
    
    // Use the context's goToDiff function which handles highlighting and scrolling
    goToDiff(pathWithRoot);
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
                    {diff.displayPath.startsWith('root.') ? diff.displayPath.substring(5) : diff.displayPath}
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
                      onClick={() => handleGoToDiff(diff.numericPath)}
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
