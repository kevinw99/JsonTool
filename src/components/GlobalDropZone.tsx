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
    // Uncomment for very verbose logging: console.log('🌍 GlobalDropZone: Drag over');
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling
    
    console.log('🌍 GlobalDropZone: Drop event detected!', e);
    
    const files = Array.from(e.dataTransfer?.files || []);
    console.log('🌍 GlobalDropZone: Files detected:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    if (files.length > 0) {
      console.log('🌍 GlobalDropZone: Calling onFileDrop with files:', files.map(f => f.name));
      onFileDrop(files);
    } else {
      console.log('🌍 GlobalDropZone: No files in drop event');
    }
  }, [onFileDrop]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling
    console.log('🌍 GlobalDropZone: Drag enter detected');
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling
    console.log('🌍 GlobalDropZone: Drag leave detected');
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
