import React, { useState, useCallback } from 'react';
import type { DiffResult } from '../jsonCompare';
import { useJsonViewerSync } from './JsonViewerSyncContext';
import './DiffList.css';

interface DiffListProps {
  diffs: DiffResult[];
  height?: string | number;
}

export const DiffList: React.FC<DiffListProps> = ({ diffs, height = '33vh' }) => {
  const { toggleExpand, setExpandAll } = useJsonViewerSync();
  const [ignoredDiffs, setIgnoredDiffs] = useState<Set<string>>(new Set());
  const [flashingPath, setFlashingPath] = useState<string | null>(null);
  
  // Toggle a diff to be ignored
  const toggleIgnoreDiff = useCallback((path: string) => {
    setIgnoredDiffs((prev) => {
      const newIgnored = new Set(prev);
      if (newIgnored.has(path)) {
        newIgnored.delete(path);
      } else {
        newIgnored.add(path);
      }
      return newIgnored;
    });
  }, []);
  
  // Navigate to a specific diff path in the tree
  const goToDiff = useCallback((path: string) => {
    // Make sure all ancestors are expanded
    const pathParts = path.split(/\.|\[|\]/g).filter(Boolean);
    let currentPath = '';
    
    // Expand all parent paths
    pathParts.forEach(part => {
      if (currentPath) {
        currentPath = isNaN(Number(part)) ? `${currentPath}.${part}` : `${currentPath}[${part}]`;
      } else {
        currentPath = part;
      }
      
      // Expand both viewers
      toggleExpand(`root_viewer1_${currentPath}`);
      toggleExpand(`root_viewer2_${currentPath}`);
    });
    
    // Set the flashing path and remove after animation
    setFlashingPath(path);
    setTimeout(() => {
      setFlashingPath(null);
    }, 2000); // Flash for 2 seconds
    
    // Find and scroll to the element
    const element1 = document.querySelector(`[data-path="root_viewer1_${path}"]`);
    const element2 = document.querySelector(`[data-path="root_viewer2_${path}"]`);
    
    if (element1) {
      element1.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (element2) {
      element2.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [toggleExpand]);
  
  // Filter out ignored diffs
  const visibleDiffs = diffs.filter(diff => !ignoredDiffs.has(diff.path));
  
  return (
    <div className="diff-list-container" style={{ maxHeight: height, height }}>
      <div className="diff-list-header">
        <h2>Differences ({visibleDiffs.length})</h2>
        <div className="diff-list-actions">
          {ignoredDiffs.size > 0 && (
            <button 
              className="diff-button reset-ignored" 
              onClick={() => setIgnoredDiffs(new Set())}
            >
              Reset Ignored
            </button>
          )}
          <button 
            className="diff-button expand-all" 
            onClick={() => setExpandAll(true)}
          >
            Expand All
          </button>
          <button 
            className="diff-button collapse-all" 
            onClick={() => setExpandAll(false)}
          >
            Collapse All
          </button>
        </div>
      </div>
      
      <div className="diff-list-content">
        {visibleDiffs.length === 0 && ignoredDiffs.size === 0 && (
          <p className="no-diffs">No differences found.</p>
        )}
        
        {visibleDiffs.length === 0 && ignoredDiffs.size > 0 && (
          <p className="all-ignored">
            All {ignoredDiffs.size} differences are ignored. 
            <button 
              className="text-button"
              onClick={() => setIgnoredDiffs(new Set())}
            >
              Reset
            </button>
          </p>
        )}
        
        <ul className="diff-list">
          {visibleDiffs.map((diff, index) => (
            <li 
              key={index} 
              className={`diff-item ${diff.type} ${flashingPath === diff.path ? 'flash' : ''}`}
            >
              <div className="diff-item-header">
                <span className="diff-path">{diff.path}</span>
                <span className="diff-type">{diff.type}</span>
                <div className="diff-actions">
                  <button 
                    className="diff-button goto" 
                    onClick={() => goToDiff(diff.path)}
                    title="Go to this difference"
                  >
                    Go To
                  </button>
                  <label className="diff-ignore-label">
                    <input
                      type="checkbox"
                      checked={ignoredDiffs.has(diff.path)}
                      onChange={() => toggleIgnoreDiff(diff.path)}
                    />
                    Ignore
                  </label>
                </div>
              </div>
              
              <div className="diff-details">
                {diff.type === 'changed' && (
                  <>
                    <div className="diff-old">
                      <span className="diff-label">Old:</span> 
                      <pre>{JSON.stringify(diff.oldValue, null, 2)}</pre>
                    </div>
                    <div className="diff-new">
                      <span className="diff-label">New:</span> 
                      <pre>{JSON.stringify(diff.newValue, null, 2)}</pre>
                    </div>
                  </>
                )}
                {diff.type === 'added' && (
                  <div className="diff-added">
                    <span className="diff-label">Added:</span> 
                    <pre>{JSON.stringify(diff.newValue, null, 2)}</pre>
                  </div>
                )}
                {diff.type === 'removed' && (
                  <div className="diff-removed">
                    <span className="diff-label">Removed:</span> 
                    <pre>{JSON.stringify(diff.oldValue, null, 2)}</pre>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
