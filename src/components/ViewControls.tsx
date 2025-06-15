import React from 'react';
import { useJsonViewerSync } from './JsonViewerSyncContext';
import './ViewControls.css';

interface ViewControlsProps {
  onToggleViewMode?: () => void;
}

export const ViewControls: React.FC<ViewControlsProps> = ({ onToggleViewMode }) => {
  const { 
    viewMode, 
    setViewMode, 
    showDiffsOnly, 
    setShowDiffsOnly,
    showColoredDiff,
    setShowColoredDiff
  } = useJsonViewerSync();

  const toggleViewMode = () => {
    setViewMode(viewMode === 'text' ? 'tree' : 'text');
    if (onToggleViewMode) {
      onToggleViewMode();
    }
  };

  const toggleShowDiffsOnly = () => {
    setShowDiffsOnly(!showDiffsOnly);
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
          className={`filter-toggle ${showDiffsOnly ? 'active' : ''}`}
          onClick={toggleShowDiffsOnly}
        >
          {showDiffsOnly ? '👁️ Showing Diffs Only' : '👁️ Showing Full JSON'}
        </button>
        <button 
          className={`diff-mode-toggle ${showColoredDiff ? 'active' : ''}`}
          onClick={toggleShowColoredDiff}
        >
          {showColoredDiff ? '🎨 Show Diff Highlighting' : '⬜ Hide Diff Highlighting'}
        </button>
      </div>
    </div>
  );
};
