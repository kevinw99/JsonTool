import React, { useState, useCallback } from 'react';
import './FileDropZone.css';

interface FileDropZoneProps {
  onFileDrop: (data: { content: any; isTextMode: boolean; fileName?: string }) => void;
  onMultipleFilesDrop?: (files: Array<{ content: any; isTextMode: boolean; fileName?: string }>) => void;
  children: React.ReactNode;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({ onFileDrop, onMultipleFilesDrop, children }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Don't stop propagation - let GlobalDropZone also handle it
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Don't stop propagation - let GlobalDropZone also handle it
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Don't stop propagation - let GlobalDropZone also handle it
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Don't stop propagation initially - let's see what happens
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    
    if (files && files.length > 0) {
      // NOW stop propagation since we're handling it
      e.stopPropagation();
      
      // If multiple files and we have a handler for multiple files, use that
      if (files.length > 1 && onMultipleFilesDrop) {
        const filePromises = Array.from(files).map(file => {
          return new Promise<{ content: any; isTextMode: boolean; fileName?: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const text = event.target?.result;
                if (typeof text === 'string') {
                  try {
                    // Try to parse as JSON first
                    const jsonData = JSON.parse(text);
                    resolve({ 
                      content: jsonData, 
                      isTextMode: false, 
                      fileName: file.name 
                    });
                  } catch (jsonError) {
                    // If JSON parsing fails, fall back to text mode
                    console.warn('JSON parsing failed, displaying as text:', jsonError);
                    resolve({ 
                      content: text, 
                      isTextMode: true, 
                      fileName: file.name 
                    });
                  }
                } else {
                  reject(new Error('File content is not a string.'));
                }
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = () => {
              reject(new Error(`Error reading file: ${reader.error}`));
            };
            reader.readAsText(file);
          });
        });

        Promise.all(filePromises)
          .then(fileData => {
            onMultipleFilesDrop(fileData);
          })
          .catch(error => {
            console.error('Error reading files:', error);
            alert(`Error reading files: ${error.message}`);
          });
      } else {
        // Handle single file (original behavior)
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
    } else {
      // Don't stop propagation - let GlobalDropZone handle it
    }
  }, [onFileDrop, onMultipleFilesDrop]);

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
          <p>Drop file(s) here (JSON or text)</p>
        </div>
      )}
    </div>
  );
};
