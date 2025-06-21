import React, { useState, useCallback } from 'react';
import './FileDropZone.css';

interface FileDropZoneProps {
  onFileDrop: (data: { content: any; isTextMode: boolean; fileName?: string }) => void;
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
            try {
              // Try to parse as JSON first
              const jsonData = JSON.parse(text);
              onFileDrop({ 
                content: jsonData, 
                isTextMode: false, 
                fileName: file.name 
              });
            } catch (jsonError) {
              // If JSON parsing fails, fall back to text mode
              console.warn('JSON parsing failed, displaying as text:', jsonError);
              onFileDrop({ 
                content: text, 
                isTextMode: true, 
                fileName: file.name 
              });
            }
          } else {
            console.error('File content is not a string.');
            alert('Error: Could not read file content as text.');
          }
        } catch (error) {
          console.error('Error reading file:', error);
          alert(`Error reading file: ${(error as Error).message}`);
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
          <p>Drop file here (JSON or text)</p>
        </div>
      )}
    </div>
  );
};
