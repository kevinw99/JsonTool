import React, { useState } from 'react';
import './FileSelector.css';

interface FileSelectorProps {
  availableFiles: string[];
  onFileSelect: (fileName: string) => void;
  side: 'left' | 'right';
  currentFileName?: string;
}

export const FileSelector: React.FC<FileSelectorProps> = ({
  availableFiles,
  onFileSelect,
  side,
  currentFileName
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleFileSelect = (fileName: string) => {
    onFileSelect(fileName);
    setIsOpen(false);
  };

  return (
    <div className={`file-selector ${side}`}>
      <button
        className="file-selector-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Select file from public directory"
      >
        📁 Browse Files
      </button>
      
      {isOpen && (
        <div className="file-selector-dropdown">
          <div className="file-selector-header">
            Select a file:
          </div>
          {availableFiles.map((fileName) => (
            <button
              key={fileName}
              className={`file-selector-option ${fileName === currentFileName ? 'current' : ''}`}
              onClick={() => handleFileSelect(fileName)}
            >
              {fileName}
              {fileName === currentFileName && <span className="current-indicator">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
