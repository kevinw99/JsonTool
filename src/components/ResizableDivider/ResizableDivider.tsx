import React, { useState, useRef, useEffect } from 'react';
import './ResizableDivider.css';

interface ResizableDividerProps {
  initialPosition: number; // Initial position in percentage (0-100)
  minPosition?: number;    // Minimum position in percentage
  maxPosition?: number;    // Maximum position in percentage
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
  const dividerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = direction === 'horizontal' ? 'row-resize' : 'col-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dividerRef.current) return;

      const containerRect = dividerRef.current.parentElement?.getBoundingClientRect();
      if (!containerRect) return;

      let newPosition;
      if (direction === 'horizontal') {
        newPosition = ((e.clientY - containerRect.top) / containerRect.height) * 100;
      } else {
        newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      }

      // Clamp position between min and max
      newPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));
      
      setPosition(newPosition);
      onPositionChange(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minPosition, maxPosition, direction, onPositionChange]);

  return (
    <div 
      ref={dividerRef}
      className={`resizable-divider ${direction === 'horizontal' ? 'horizontal' : 'vertical'} ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      style={direction === 'horizontal' ? { top: `${position}%` } : { left: `${position}%` }}
    >
      <div className="divider-handle" />
    </div>
  );
};
