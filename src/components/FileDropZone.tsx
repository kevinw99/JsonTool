import React, { useState, useCallback } from 'react';
import './FileDropZone.css';

interface FileDropZoneProps {
  onFileDrop: (jsonData: object) => void;
  children: React.ReactNode;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({ onFileDrop, children }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Necessary to allow drop
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result;
          if (typeof text === 'string') {
            const jsonData = JSON.parse(text);
            onFileDrop(jsonData);
          } else {
            console.error('File content is not a string.');
            alert('Error: Could not read file content as text.');
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
          alert(`Error parsing file: ${(error as Error).message}`);
        }
      };
      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
        alert('An error occurred while reading the file.');
      };
      reader.readAsText(file);
    }
  }, [onFileDrop]);

  return (
    <div 
      className={`file-drop-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragOver && (
        <div className="drop-zone-overlay">
          <p>Drop JSON file here</p>
        </div>
      )}
    </div>
  );
};
