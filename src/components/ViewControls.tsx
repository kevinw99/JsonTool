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
    setShowColoredDiff
  } = useJsonViewerSync();

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
      </div>
    </div>
  );
};
