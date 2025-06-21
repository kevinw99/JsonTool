import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ResizableDivider.css';

interface ResizableDividerProps {
  initialPosition: number;
  minPosition?: number;
  maxPosition?: number;
  direction: 'horizontal' | 'vertical';
  onPositionChange: (position: number) => void;
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  initialPosition,
  minPosition = 20,
  maxPosition = 80,
  direction,
  onPositionChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const dragStateRef = useRef(false);
  
  // Update position when not dragging
  useEffect(() => {
    if (!isDragging && !dragStateRef.current) {
      setPosition(initialPosition);
    }
  }, [initialPosition, isDragging]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current) {
      console.log('[ResizableDivider] MouseMove called but not dragging, ignoring');
      return;
    }

    const target = e.target as HTMLElement;
    const container = target.closest('.app-content-wrapper') as HTMLElement;
    
    if (!container) {
      console.log('[ResizableDivider] No container found');
      return;
    }

    const rect = container.getBoundingClientRect();
    let newPosition;

    if (direction === 'horizontal') {
      newPosition = ((e.clientY - rect.top) / rect.height) * 100;
      console.log('[ResizableDivider] Horizontal movement:', {
        mouseY: e.clientY,
        containerTop: rect.top,
        containerHeight: rect.height,
        newPosition
      });
    } else {
      newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      console.log('[ResizableDivider] Vertical movement:', {
        mouseX: e.clientX,
        containerLeft: rect.left,
        containerWidth: rect.width,
        newPosition
      });
    }

    newPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));
    
    console.log('[ResizableDivider] About to call callbacks:', {
      newPosition,
      onPositionChangeType: typeof onPositionChange
    });
    
    setPosition(newPosition);
    onPositionChange(newPosition);
    
    console.log('[ResizableDivider] Callbacks called, position should update to:', newPosition);
  }, [direction, minPosition, maxPosition, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    console.log('[ResizableDivider] Mouse up - ending drag');
    setIsDragging(false);
    dragStateRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    console.log('[ResizableDivider] Mouse down - starting drag');
    setIsDragging(true);
    dragStateRef.current = true;
    document.body.style.cursor = direction === 'horizontal' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  }, [direction]);

  useEffect(() => {
    if (isDragging && dragStateRef.current) {
      console.log('[ResizableDivider] Adding event listeners');
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      console.log('[ResizableDivider] Removing event listeners');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  console.log('[ResizableDivider] Render:', { position, isDragging, dragStateRef: dragStateRef.current, direction });

  return (
    <div 
      className={`resizable-divider ${direction} ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        [direction === 'horizontal' ? 'top' : 'left']: `${position}%`
      }}
    >
      <div className="divider-handle" />
    </div>
  );
};
