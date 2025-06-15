import React from 'react';
import './JsonDiffOnlyView.css';
import type { DiffResult } from '../jsonCompare';

interface JsonDiffOnlyViewProps {
  diffResults: DiffResult[];
  height?: number | string;
}

export const JsonDiffOnlyView: React.FC<JsonDiffOnlyViewProps> = ({ diffResults, height = 400 }) => {
  // Group diff results by path root to organize them hierarchically
  const groupDiffsByRoot = () => {
    const groups: Record<string, DiffResult[]> = {};
    
    diffResults.forEach(diff => {
      // Get first part of path to use as group key
      const pathParts = diff.path.split(/\.|\[/)[0];
      const rootKey = pathParts;
      
      if (!groups[rootKey]) {
        groups[rootKey] = [];
      }
      
      groups[rootKey].push(diff);
    });
    
    return groups;
  };
  
  const diffGroups = groupDiffsByRoot();
  
  // Format a value for display
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    return JSON.stringify(value);
  };

  // Render diff groups and their items
  return (
    <div className="diff-only-container" style={{ height }}>
      <div className="diff-only-header">
        <h3>Differences Only View</h3>
      </div>
      
      <div className="diff-only-content">
        {Object.keys(diffGroups).length === 0 ? (
          <div className="no-diffs">No differences found between the JSON objects</div>
        ) : (
          Object.entries(diffGroups).map(([key, diffs]) => (
            <div key={key} className="diff-group">
              <h4 className="diff-group-title">{key}</h4>
              <ul className="diff-list">
                {diffs.map((diff, index) => (
                  <li key={index} className={`diff-item diff-type-${diff.type}`}>
                    <div className="diff-path">{diff.path}</div>
                    <div className="diff-details">
                      {diff.type === 'added' && (
                        <div className="diff-added">
                          <span className="diff-label">Added:</span> 
                          <span className="diff-value">{formatValue(diff.newValue)}</span>
                        </div>
                      )}
                      
                      {diff.type === 'removed' && (
                        <div className="diff-removed">
                          <span className="diff-label">Removed:</span> 
                          <span className="diff-value">{formatValue(diff.oldValue)}</span>
                        </div>
                      )}
                      
                      {diff.type === 'changed' && (
                        <>
                          <div className="diff-old">
                            <span className="diff-label">From:</span> 
                            <span className="diff-value">{formatValue(diff.oldValue)}</span>
                          </div>
                          <div className="diff-new">
                            <span className="diff-label">To:</span> 
                            <span className="diff-value">{formatValue(diff.newValue)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
