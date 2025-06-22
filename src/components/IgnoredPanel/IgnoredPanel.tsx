import React, { useState } from 'react';
import { useJsonViewerSync } from '../JsonViewerSyncContext';
import './IgnoredPanel.css';

interface IgnoredPanelProps {
  height?: number | string;
}

export const IgnoredPanel: React.FC<IgnoredPanelProps> = ({
  height = 'calc(25vh - 50px)',
}) => {
  const { 
    ignoredPatterns,
    addIgnoredPattern,
    removeIgnoredPattern,
    updateIgnoredPattern,
  } = useJsonViewerSync();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [newPattern, setNewPattern] = useState<string>('');

  const handleStartEdit = (id: string, currentPattern: string) => {
    setEditingId(id);
    setEditingValue(currentPattern);
  };

  const handleSaveEdit = () => {
    if (editingId && editingValue.trim()) {
      updateIgnoredPattern(editingId, editingValue.trim());
    }
    setEditingId(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleAddNew = () => {
    if (newPattern.trim()) {
      addIgnoredPattern(newPattern.trim());
      setNewPattern('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'save' | 'add') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (action === 'save') {
        handleSaveEdit();
      } else {
        handleAddNew();
      }
    } else if (e.key === 'Escape' && action === 'save') {
      handleCancelEdit();
    }
  };

  return (
    <div className="ignored-panel-container" style={{ height }}>
      <div className="ignored-panel-content">
        {ignoredPatterns.size === 0 ? (
          <div className="no-ignored">
            No ignored patterns. Click "Ignore" on any difference to add it here.
          </div>
        ) : (
          <ul className="ignored-patterns-list">
            {Array.from(ignoredPatterns.entries()).map(([id, pattern]) => (
              <li key={id} className="ignored-pattern-item">
                <div className="pattern-content">
                  {editingId === id ? (
                    <div className="edit-pattern-group">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, 'save')}
                        className="edit-pattern-input"
                        autoFocus
                      />
                      <div className="edit-pattern-actions">
                        <button 
                          onClick={handleSaveEdit}
                          className="save-button"
                          disabled={!editingValue.trim()}
                        >
                          Save
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="pattern-text">{pattern}</span>
                      <div className="pattern-actions">
                        <button 
                          onClick={() => handleStartEdit(id, pattern)}
                          className="edit-button"
                          title="Edit this pattern"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => removeIgnoredPattern(id)}
                          className="unignore-button"
                          title="Stop ignoring this pattern"
                        >
                          Do not ignore
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="add-pattern-section">
          <div className="add-pattern-input-group">
            <input
              type="text"
              placeholder="Add ignore pattern (e.g., *.elapsedTime, *.metadata.*, boomerForecastV3Requests[0].metadata.*)"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, 'add')}
              className="add-pattern-input"
            />
            <button 
              onClick={handleAddNew}
              disabled={!newPattern.trim()}
              className="add-pattern-button"
            >
              Add
            </button>
          </div>
        </div>

        <div className="pattern-help">
          <strong>Pattern Examples:</strong>
          <ul>
            <li><code>*.elapsedTime</code> - Ignores any field named exactly "elapsedTime"</li>
            <li><code>*elapsedTime*</code> - Ignores any field containing "elapsedTime" (e.g., "elapsedTimeAfterGetting...")</li>
            <li><code>*.metadata.*</code> - Ignores all fields under any "metadata" object</li>
            <li><code>boomerForecastV3Requests[0].metadata.externalRequestUID</code> - Ignores specific field</li>
            <li><code>searchPerIterationDebugOutputs[*].elapsedTime</code> - Ignores "elapsedTime" in any array item</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
