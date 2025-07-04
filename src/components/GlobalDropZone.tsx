import React, { useCallback, useEffect } from 'react';

interface GlobalDropZoneProps {
  onFileDrop: (files: File[]) => void;
  children: React.ReactNode;
}

export const GlobalDropZone: React.FC<GlobalDropZoneProps> = ({ onFileDrop, children }) => {
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling
    
    
    const files = Array.from(e.dataTransfer?.files || []);
    
    if (files.length > 0) {
      onFileDrop(files);
    } else {
    }
  }, [onFileDrop]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling
  }, []);

  useEffect(() => {
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
    };
  }, [handleDragOver, handleDrop, handleDragEnter, handleDragLeave]);

  return <>{children}</>;
};
