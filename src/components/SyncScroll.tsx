import React, { useEffect, useRef } from 'react';

interface SyncScrollProps {
  enabled: boolean;
  children: React.ReactNode;
  syncGroup?: string;
}

export const SyncScroll: React.FC<SyncScrollProps> = ({ 
  enabled = true,
  children,
  syncGroup = 'default'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<boolean>(false);
  
  // Set up scroll synchronization
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    
    // Find all containers with the same sync group
    const syncContainers = document.querySelectorAll(`[data-sync-group="${syncGroup}"]`);
    if (syncContainers.length <= 1) return;
    
    const findScrollableElements = () => {
      const scrollables: HTMLElement[] = [];
      
      syncContainers.forEach(container => {
        // First try to find the .json-tree-view element
        const treeView = container.querySelector('.json-tree-view');
        if (treeView) {
          scrollables.push(treeView as HTMLElement);
          return;
        }
        
        // Then try to find textarea
        const textarea = container.querySelector('textarea');
        if (textarea) {
          scrollables.push(textarea as HTMLElement);
          return;
        }
        
        // Then try to find scrollable elements
        const elements = Array.from(container.querySelectorAll('*'));
        const scrollable = elements.find(el => {
          const style = window.getComputedStyle(el);
          return style.overflow === 'auto' || style.overflow === 'scroll' ||
                 style.overflowY === 'auto' || style.overflowY === 'scroll';
        });
        
        if (scrollable) {
          scrollables.push(scrollable as HTMLElement);
        }
      });
      
      return scrollables;
    };
    
    const scrollables = findScrollableElements();
    if (scrollables.length <= 1) return;
    
    const handleScroll = (source: HTMLElement, targets: HTMLElement[]) => {
      if (isScrollingRef.current) return;
      
      isScrollingRef.current = true;
      
      targets.forEach(target => {
        if (target !== source) {
          target.scrollTop = source.scrollTop;
          target.scrollLeft = source.scrollLeft;
        }
      });
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 50);
    };
    
    // Set up scroll handlers for each scrollable element
    const handlers: { element: HTMLElement, handler: EventListener }[] = [];
    
    scrollables.forEach(scrollable => {
      const handler = () => handleScroll(scrollable, scrollables);
      scrollable.addEventListener('scroll', handler);
      handlers.push({ element: scrollable, handler });
    });
    
    return () => {
      // Clean up event listeners
      handlers.forEach(({ element, handler }) => {
        element.removeEventListener('scroll', handler);
      });
    };
  }, [enabled, syncGroup]);
  
  return (
    <div ref={containerRef} data-sync-group={syncGroup}>
      {children}
    </div>
  );
};
