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
    toggleIgnoreDiff,
    goToDiff
  } = useJsonViewerSync();

  const handleIgnore = (numericDiffPath: string) => {
    toggleIgnoreDiff(numericDiffPath);
  };

  const handleGoToDiff = (numericDiffPath: string) => {
    console.log('[DiffList] 🔍 GoTo button clicked for numeric path:', numericDiffPath);
    console.log('[DiffList] 🔍 Checking DOM elements with this path...');
    
    // The JsonTreeView DOM elements have paths with "root." prefix, so we need to add it
    const pathWithRoot = numericDiffPath.startsWith('root.') ? numericDiffPath : `root.${numericDiffPath}`;
    
    // Debug: First, let's see what data-path attributes actually exist in the DOM
    const allDataPathElements = document.querySelectorAll('[data-path]');
    console.log(`[DiffList] 🔍 Found ${allDataPathElements.length} elements with data-path attributes`);
    
    // Look for partial matches to debug
    const partialMatches = Array.from(allDataPathElements).filter(el => {
      const path = el.getAttribute('data-path');
      return path && (path.includes('boomerForecastV3Requests') || path.includes('metadata') || path.includes('externalRequestDateTime'));
    });
    
    console.log(`[DiffList] 🔍 Found ${partialMatches.length} elements with partial path matches:`);
    partialMatches.forEach((el, i) => {
      console.log(`[DiffList] 🔍   ${i + 1}: data-path="${el.getAttribute('data-path')}"`);
    });
    
    // Debug: Check what elements exist with various selectors
    const selectors = [
      `[data-path="${pathWithRoot}"]`,
      `[data-path="${numericDiffPath}"]`,
      `[data-numeric-path="${pathWithRoot}"]`,
      `[data-numeric-path="${numericDiffPath}"]`,
      `[data-generic-path="${pathWithRoot}"]`,
      `[data-generic-path="${numericDiffPath}"]`,
      `.json-node[data-path="${pathWithRoot}"]`,
      `.json-node[data-path="${numericDiffPath}"]`
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`[DiffList] 🔍 Selector "${selector}" found ${elements.length} elements`);
      if (elements.length > 0) {
        console.log(`[DiffList] 🔍 First element:`, elements[0]);
      }
    });
    
    goToDiff(pathWithRoot); // Pass path WITH root prefix to goToDiff (like ID Keys Panel does)
    console.log(`[DiffList] ✅ Called goToDiff from context with path: ${pathWithRoot}`);
  };

  const formatValue = (value: any): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `Array(${value.length})`;
      }
      return `Object{${Object.keys(value).length} keys}`;
    }
    
    if (typeof value === 'string') {
      if (value.length > 30) {
        return `"${value.substring(0, 30)}..."`;
      }
      return `"${value}"`;
    }
    return String(value);
  };
  
  const getDiffSummary = (diff: DiffResult): string => {
    switch (diff.type) {
      case 'added':
        // Use value2 for added diffs
        return `Added: ${formatValue(diff.value2)}`;
      case 'removed':
        // Use value1 for removed diffs
        return `Removed: ${formatValue(diff.value1)}`;
      case 'changed':
        // Use value1 and value2 for changed diffs
        return `Changed: ${formatValue(diff.value1)} → ${formatValue(diff.value2)}`;
      default:
        return '';
    }
  };

  return (
    <div className="diff-list-container" style={{ height }}>
      <div className="diff-list-content">
        {diffs.length === 0 ? (
          <div className="no-diffs">
            No differences found.
          </div>
        ) : (
          <ul className="diff-items">
            {diffs.map((diff, index) => (
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
                  <span className="diff-summary-inline">
                    {getDiffSummary(diff)}
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
                      title={ignoredDiffs.has(diff.numericPath) ? "Restore this difference" : "Ignore this difference"}
                    >
                      {ignoredDiffs.has(diff.numericPath) ? "Restore" : "Ignore"}
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
