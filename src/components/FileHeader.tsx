import React, { useState, useRef, useEffect } from 'react';
import './FileHeader.css';

interface FileHeaderProps {
  fileName?: string;
  onFileNameChange?: (newName: string) => void;
  side: 'left' | 'right';
}

export const FileHeader: React.FC<FileHeaderProps> = ({
  fileName,
  onFileNameChange,
  side
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(fileName || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(fileName || '');
  }, [fileName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (!isEditing) {
      setEditValue(fileName || '');
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && onFileNameChange) {
      onFileNameChange(trimmedValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(fileName || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const displayName = fileName || `JSON ${side === 'left' ? '1' : '2'}`;

  return (
    <div className={`file-header ${side}`}>
      <div className="file-header-content">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="file-header-input"
            placeholder="Enter filename..."
          />
        ) : (
          <span 
            className="file-header-name"
            onClick={handleEdit}
            title={displayName} // Always show full name on hover
          >
            {displayName}
          </span>
        )}
        
        {!isEditing && (
          <button
            className="file-header-edit-btn"
            onClick={handleEdit}
            title="Edit filename"
          >
            ✏️
          </button>
        )}
      </div>
      
      {!fileName && (
        <div className="file-header-placeholder">
          Drop a JSON file here or click to load sample data
        </div>
      )}
    </div>
  );
};
