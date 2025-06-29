import React from 'react';
import { useJsonViewerSync } from './JsonViewerSyncContext';
import './ViewControls.css';

interface ViewControlsProps {
  onToggleViewMode?: () => void;
  onSaveFiles?: () => void;
}

export const ViewControls: React.FC<ViewControlsProps> = ({ onToggleViewMode, onSaveFiles }) => {
  const { 
    viewMode, 
    setViewMode, 
    showColoredDiff,
    setShowColoredDiff,
    // rawIgnoredDiffs,
    ignoredPatterns,
    // toggleIgnoreDiff,
    removeIgnoredPatternByPath,
    // clearAllIgnoredDiffs
  } = useJsonViewerSync();

  // Count patterns created from right-click actions (they have specific IDs)
  const rightClickIgnoredCount = Array.from(ignoredPatterns.keys()).filter(id => id.startsWith('rightclick_')).length;
  const ignoredCount = rightClickIgnoredCount;

  const toggleViewMode = () => {
    setViewMode(viewMode === 'text' ? 'tree' : 'text');
    if (onToggleViewMode) {
      onToggleViewMode();
    }
  };
  
  const toggleShowColoredDiff = () => {
    setShowColoredDiff(!showColoredDiff);
  };

  return (
    <div className="view-controls">
      <div className="controls-container">
        <button 
          className={`view-mode-toggle ${viewMode === 'text' ? 'active' : ''}`}
          onClick={toggleViewMode}
        >
          {viewMode === 'text' ? '🔄 View as Tree' : '🔄 View as Text'}
        </button>
        <button 
          className={`diff-mode-toggle ${showColoredDiff ? 'active' : ''}`}
          onClick={toggleShowColoredDiff}
        >
          {showColoredDiff ? '🎨 Show Diff Highlighting' : '⬜ Hide Diff Highlighting'}
        </button>
        {onSaveFiles && (
          <button 
            className="save-files-button"
            onClick={onSaveFiles}
            title="Save current files with their actual filenames to the public directory"
          >
            💾 Save Files
          </button>
        )}
        {ignoredCount > 0 && (
          <div className="ignored-diffs-section">
            <span className="ignored-diffs-count">
              🚫 {ignoredCount} ignored diff{ignoredCount === 1 ? '' : 's'}
            </span>
            <button 
              className="clear-ignored-button"
              onClick={() => {
                // Clear all right-click ignored patterns
                Array.from(ignoredPatterns.keys())
                  .filter(id => id.startsWith('rightclick_'))
                  .forEach(id => {
                    const path = id.replace('rightclick_', '');
                    removeIgnoredPatternByPath(path);
                  });
              }}
              title="Clear all ignored diffs"
            >
              Clear All
            </button>
            <details className="ignored-diffs-details">
              <summary>Show ignored paths</summary>
              <div className="ignored-diffs-list">
                {Array.from(ignoredPatterns.entries())
                  .filter(([id]) => id.startsWith('rightclick_'))
                  .map(([id, pattern]) => {
                    // Extract path from ID
                    const path = id.replace('rightclick_', '');
                    return (
                      <div key={id} className="ignored-diff-item">
                        <span className="ignored-path" title={pattern}>
                          {pattern.length > 30 ? `...${pattern.slice(-30)}` : pattern}
                        </span>
                        <button 
                          className="unignore-button"
                          onClick={() => removeIgnoredPatternByPath(path)}
                          title={`Unignore: ${pattern}`}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};
