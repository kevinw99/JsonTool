import React, { useEffect, useRef } from 'react';
import { ScrollService } from '../services/ScrollService';
import type { ViewerId } from '../types/ScrollTypes';

interface SyncScrollProps {
  enabled: boolean;
  children: React.ReactNode;
  syncGroup?: string;
  className?: string; 
  style?: React.CSSProperties;
  viewer?: ViewerId; // Which viewer this container represents
}

export const SyncScroll: React.FC<SyncScrollProps> = ({ 
  enabled = true,
  children,
  syncGroup = 'json-tree-content',
  className,
  style,
  viewer
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const currentElement = containerRef.current;
    
    if (!enabled || !currentElement) {
      return;
    }
    
    const handleScroll = (event: Event) => {
      if (!(event.target instanceof HTMLElement) || event.target !== currentElement) {
        return;
      }
      
      // Delegate to unified ScrollService
      ScrollService.handleManualScroll(currentElement);
    };
    
    currentElement.addEventListener('scroll', handleScroll);
    
    return () => {
      currentElement.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, syncGroup]); // Re-run if enabled or group changes
  
  return (
    <div 
      ref={containerRef} 
      data-sync-scroll={syncGroup}
      data-viewer={viewer}
      className={className} 
      style={style}
    >
      {children}
    </div>
  );
};
