import React, { useCallback, useRef, useEffect } from 'react';
import './ResizableDivider.css';

interface ResizableDividerProps {
  direction: 'horizontal' | 'vertical';
  onPositionChange: (position: number) => void;
  minPosition?: number;
  maxPosition?: number;
  initialPosition?: number;
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  direction,
  onPositionChange,
  minPosition = 10,
  maxPosition = 90,
  initialPosition = 50
}) => {
  const isDraggingRef = useRef(false);
  const currentPositionRef = useRef(initialPosition);

  // Update current position when initialPosition changes
  React.useEffect(() => {
    currentPositionRef.current = initialPosition;
  }, [initialPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    console.log('[ResizableDivider] Mouse down, starting drag');
    isDraggingRef.current = true;
    
    const startMouse = direction === 'horizontal' ? e.clientY : e.clientX;
    console.log('[ResizableDivider] Start mouse position:', startMouse);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const currentMouse = direction === 'horizontal' ? e.clientY : e.clientX;
      const mouseDelta = currentMouse - startMouse;
      
      // Get container dimensions
      const container = document.querySelector('.app-content-wrapper');
      if (!container) {
        console.warn('Container .app-content-wrapper not found');
        return;
      }
      
      const containerRect = container.getBoundingClientRect();
      const containerSize = direction === 'horizontal' ? containerRect.height : containerRect.width;
      
      // Calculate percentage change
      const percentChange = (mouseDelta / containerSize) * 100;
      let newPosition = initialPosition + percentChange;
      
      // Apply constraints
      newPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));
      
      console.log('[ResizableDivider] Move:', { mouseDelta, containerSize, percentChange, newPosition });
      
      // Update our ref and call the callback
      currentPositionRef.current = newPosition;
      onPositionChange(newPosition);
    };

    const handleMouseUp = () => {
      console.log('[ResizableDivider] Mouse up, ending drag');
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [direction, onPositionChange, minPosition, maxPosition, initialPosition]);

  const className = `resizable-divider ${direction === 'horizontal' ? 'horizontal' : 'vertical'}`;

  return (
    <div
      className={className}
      onMouseDown={handleMouseDown}
    >
      <div className="divider-handle" />
    </div>
  );
};
