import React, { useState } from 'react';
import { useJsonViewerSync } from '../JsonViewerSyncContext';
import { validateAndCreateIdBasedPath } from '../../utils/PathTypes';
import './IgnoredPanel.css';

interface IgnoredPanelProps {
  height?: number | string;
}

export const IgnoredPanel: React.FC<IgnoredPanelProps> = ({
  height = 'calc(25vh - 50px)',
}) => {
  const { 
    ignoredPatterns,
    // rawIgnoredDiffs,
    addIgnoredPattern,
    removeIgnoredPattern,
    updateIgnoredPattern,
    removeIgnoredPatternByPath,
    // toggleIgnoreDiff,
  } = useJsonViewerSync();
  
  // Get right-click ignored patterns (these show as "ignored diffs")
  const rightClickIgnored = Array.from(ignoredPatterns.entries())
    .filter(([id]) => id.startsWith('rightclick_'))
    .map(([id, pattern]) => ({
      id,
      path: id.replace('rightclick_', ''),
      pattern
    }));
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [newPattern, setNewPattern] = useState<string>('');

  const handleStartEdit = (id: string, currentPattern: string) => {
    setEditingId(id);
    setEditingValue(currentPattern);
  };

  const handleSaveEdit = () => {
    if (editingId && editingValue.trim() && editingValue.trim() !== '') {
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
      addIgnoredPattern(validateAndCreateIdBasedPath(newPattern.trim(), 'IgnoredPanel.handleAddNew'));
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
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <div className="ignored-panel-container" style={{ height }}>
      <div className="ignored-panel-content">
        {/* Explicitly ignored diffs section */}
        {rightClickIgnored.length > 0 && (
          <div className="ignored-section">
            <h4 className="section-title">🚫 Ignored Diffs ({rightClickIgnored.length})</h4>
            <ul className="ignored-items-list">
              {rightClickIgnored.map(({ id, path, pattern }) => (
                <li key={id} className="ignored-item">
                  <span className="ignored-path" title={pattern}>
                    {pattern.length > 50 ? `...${pattern.slice(-50)}` : pattern}
                  </span>
                  <button 
                    className="unignore-button"
                    onClick={() => removeIgnoredPatternByPath(validateAndCreateIdBasedPath(path, 'IgnoredPanel.removeIgnored'))}
                    title={`Unignore: ${pattern}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Ignored patterns section */}
        <div className="ignored-section">
          <h4 className="section-title">📝 Ignored Patterns ({Array.from(ignoredPatterns.keys()).filter(id => !id.startsWith('rightclick_')).length})</h4>
          {Array.from(ignoredPatterns.entries()).filter(([id]) => !id.startsWith('rightclick_')).length === 0 ? (
            <div className="no-ignored">
              No ignored patterns. Click "Ignore" on any difference to add it here.
            </div>
          ) : (
            <ul className="ignored-patterns-list">
              {Array.from(ignoredPatterns.entries()).filter(([id]) => !id.startsWith('rightclick_')).map(([id, pattern]) => (
                <li key={id} className="ignored-pattern-item">
                  <div className="pattern-content">
                    {editingId === id ? (
                      <div className="edit-pattern-group">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, 'save')}
                          onBlur={handleSaveEdit}
                          className="edit-pattern-input"
                          autoFocus
                        />
                        <button 
                          onClick={() => removeIgnoredPattern(id)}
                          className="unignore-button"
                          title="Stop ignoring this pattern"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <span 
                          className="pattern-text editable"
                          onClick={() => handleStartEdit(id, pattern)}
                          title="Click to edit this pattern"
                        >
                          {pattern}
                        </span>
                        <button 
                          onClick={() => removeIgnoredPattern(id)}
                          className="unignore-button"
                          title="Stop ignoring this pattern"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
              </li>
            ))}
          </ul>
        )}
        </div>
        
        <div className="add-pattern-section">
          <div className="add-pattern-input-group">
            <input
              type="text"
              placeholder="Add ignore pattern (e.g., elapsedTime, metadata, externalId)"
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
          <strong>Pattern Examples (case-insensitive substring matching):</strong>
          <ul>
            <li><code>elapsedTime</code> - Ignores any field containing "elapsedTime"</li>
            <li><code>metadata</code> - Ignores any field containing "metadata"</li>
            <li><code>externalId</code> - Ignores any field containing "externalId"</li>
            <li><code>uid</code> - Ignores any field containing "uid" (matches "UID", "guid", etc.)</li>
            <li><code>debug</code> - Ignores any field containing "debug" (matches "debugOutput", etc.)</li>
          </ul>
          <p><em>Note: Patterns match any part of the field path and are case-insensitive.</em></p>
        </div>
      </div>
    </div>
  );
};
