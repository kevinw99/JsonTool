import React, { useState, useEffect } from 'react';
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
    goToDiff,
    highlightPath, // This will be a numeric path
    clearAllIgnoredDiffs
  } = useJsonViewerSync();
  
  const [filteredDiffs, setFilteredDiffs] = useState<DiffResult[]>(diffs);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showIgnored, setShowIgnored] = useState<boolean>(false);

  useEffect(() => {
    const filtered = diffs.filter(diff => {
      // Search term should match against the display path
      const matchesSearch = searchTerm === '' || 
                           diff.displayPath.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (showIgnored) {
        return matchesSearch;
      } else {
        // Ignored diffs are identified by their numericPath
        return !ignoredDiffs.has(diff.numericPath) && matchesSearch; // Changed .includes to .has
      }
    });
    
    setFilteredDiffs(filtered);
  }, [diffs, ignoredDiffs, searchTerm, showIgnored]);

  const handleIgnore = (numericDiffPath: string) => {
    toggleIgnoreDiff(numericDiffPath);
  };

  const handleGoToDiff = (numericDiffPath: string) => {
    console.log('[DiffList] GoTo button clicked for numeric path:', numericDiffPath);
    goToDiff(numericDiffPath); // Pass numericPath to goToDiff
    console.log('[DiffList] Called goToDiff from context with numeric path.');
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
      <div className="diff-list-header">
        <h3>
          Differences ({filteredDiffs.length})
          {ignoredDiffs.size > 0 && (
            <span className="ignored-count">
              {ignoredDiffs.size} ignored
            </span>
          )}
        </h3>
        <div className="diff-search">
          <input
            type="text"
            placeholder="Search diffs (by displayed path)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="diff-search-input"
          />
        </div>
        <div className="diff-controls">
          <div className="show-ignored-toggle">
            <label>
              <input
                type="checkbox"
                checked={showIgnored}
                onChange={() => setShowIgnored(!showIgnored)}
              />
              Show Ignored Diffs
            </label>
          </div>
          
          {/* Ensure clearAllIgnoredDiffs is available and used correctly */}
          {showIgnored && ignoredDiffs.size > 0 && (
            <button 
              className="restore-all-button"
              onClick={clearAllIgnoredDiffs} 
              title="Restore all ignored differences"
            >
              Restore All
            </button>
          )}
        </div>
      </div>
      
      <div className="diff-list-content">
        {filteredDiffs.length === 0 ? (
          <div className="no-diffs">
            {diffs.length === 0 ? 
              "No differences found." : 
              (searchTerm ? "No matching diffs found." : "All differences are currently ignored.")}
          </div>
        ) : (
          <ul className="diff-items">
            {filteredDiffs.map((diff, index) => (
              <li 
                // Use numericPath for key if displayPath might not be unique enough,
                // though index is fine if diffs array doesn't change order.
                // Combining with displayPath for more robustness if needed.
                key={`${diff.numericPath}-${index}`} 
                className={`diff-item ${diff.type} ${highlightPath === diff.numericPath ? 'highlighted' : ''} ${ignoredDiffs.has(diff.numericPath) ? 'ignored' : ''}`}
              >
                <div className="diff-path">
                  <span className="path-label">
                    <span className="diff-number">{index + 1}.</span>
                    {diff.displayPath.startsWith('root.') ? diff.displayPath.substring(5) : diff.displayPath} {/* Remove root. prefix */}
                    {ignoredDiffs.has(diff.numericPath) && <span className="ignored-badge">Ignored</span>}
                  </span>
                  <div className="diff-actions">
                    <button 
                      className="goto-button"
                      // Pass numericPath to handleGoToDiff
                      onClick={() => handleGoToDiff(diff.numericPath)}
                      title="Navigate to this difference"
                    >
                      Go To
                    </button>
                    <button 
                      // Pass numericPath to handleIgnore
                      className={`ignore-button ${ignoredDiffs.has(diff.numericPath) ? 'restore-button' : ''}`}
                      onClick={() => handleIgnore(diff.numericPath)}
                      title={ignoredDiffs.has(diff.numericPath) ? "Restore this difference" : "Ignore this difference"}
                    >
                      {ignoredDiffs.has(diff.numericPath) ? "Restore" : "Ignore"}
                    </button>
                  </div>
                </div>
                <div className="diff-summary">
                  {getDiffSummary(diff)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
