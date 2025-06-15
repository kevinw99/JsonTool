import React, { useState, useEffect } from 'react';
import { useJsonViewerSync } from '../JsonViewerSyncContext';
import type { DiffResult } from '../../jsonCompare';
// Correct the CSS import path
import './DiffList.css';

interface DiffListProps {
  diffs: DiffResult[];
  height?: number | string;
}

export const DiffList: React.FC<DiffListProps> = ({
  diffs,
  height = 'calc(25vh - 50px)',  // Default to 1/3 of the available height
}) => {
  const { 
    ignoredDiffs,
    toggleIgnoreDiff,
    goToDiff,
    highlightPath,
    clearAllIgnoredDiffs
  } = useJsonViewerSync();
  
  const [filteredDiffs, setFilteredDiffs] = useState<DiffResult[]>(diffs);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showIgnored, setShowIgnored] = useState<boolean>(false);

  useEffect(() => {
    // Filter diffs based on search term and whether to show ignored diffs
    const filtered = diffs.filter(diff => {
      const matchesSearch = searchTerm === '' || 
                           diff.path.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (showIgnored) {
        // Show all diffs that match the search
        return matchesSearch;
      } else {
        // Show only non-ignored diffs that match the search
        return !ignoredDiffs.has(diff.path) && matchesSearch;
      }
    });
    
    setFilteredDiffs(filtered);
  }, [diffs, ignoredDiffs, searchTerm, showIgnored]);

  const handleIgnore = (diffPath: string) => {
    toggleIgnoreDiff(diffPath);
  };

  const handleGoToDiff = (diffPath: string) => {
    goToDiff(diffPath);
  };

  const formatValue = (value: any): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    
    // For objects or arrays, show a summary
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `Array(${value.length})`;
      }
      return `Object{${Object.keys(value).length} keys}`;
    }
    
    // For primitive values
    if (typeof value === 'string') {
      // Truncate long strings
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
        return `Added: ${formatValue(diff.newValue)}`;
      case 'removed':
        return `Removed: ${formatValue(diff.oldValue)}`;
      case 'changed':
        return `Changed: ${formatValue(diff.oldValue)} → ${formatValue(diff.newValue)}`;
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
            placeholder="Search diffs..."
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
          
          {showIgnored && Array.from(ignoredDiffs).length > 0 && (
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
                key={index} 
                className={`diff-item ${diff.type} ${highlightPath === diff.path ? 'highlighted' : ''} ${ignoredDiffs.has(diff.path) ? 'ignored' : ''}`}
              >
                <div className="diff-path">
                  <span className="path-label">
                    {diff.path}
                    {ignoredDiffs.has(diff.path) && <span className="ignored-badge">Ignored</span>}
                  </span>
                  <div className="diff-actions">
                    <button 
                      className="goto-button"
                      onClick={() => handleGoToDiff(diff.path)}
                      title="Navigate to this difference"
                    >
                      Go To
                    </button>
                    <button 
                      className={`ignore-button ${ignoredDiffs.has(diff.path) ? 'restore-button' : ''}`}
                      onClick={() => handleIgnore(diff.path)}
                      title={ignoredDiffs.has(diff.path) ? "Restore this difference" : "Ignore this difference"}
                    >
                      {ignoredDiffs.has(diff.path) ? "Restore" : "Ignore"}
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
