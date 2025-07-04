import React, { useEffect, useRef } from 'react';

interface SyncScrollProps {
  enabled: boolean;
  children: React.ReactNode;
  syncGroup?: string;
  className?: string; 
  style?: React.CSSProperties; // Allow passing styles directly to the scrollable div
}

export const SyncScroll: React.FC<SyncScrollProps> = ({ 
  enabled = true,
  children,
  syncGroup = 'default',
  className,
  style
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<boolean>(false);
  
  useEffect(() => {
    const currentElement = containerRef.current;
    if (!enabled || !currentElement) return;

    const syncPeers = document.querySelectorAll<HTMLDivElement>(`[data-sync-group="${syncGroup}"]`);
    if (syncPeers.length <= 1) return;
    
    const handleScroll = (event: Event) => {
      if (isScrollingRef.current) return;
      if (!(event.target instanceof HTMLElement) || event.target !== currentElement) return;
      
      // Check if sync is temporarily disabled
      if (currentElement.classList.contains('temp-disable-sync')) {
        return;
      }

      isScrollingRef.current = true;
      const source = event.target;
      
      syncPeers.forEach(targetPeerElement => {
        // Ensure we don't try to scroll the source element via the peer list
        if (targetPeerElement !== currentElement) {
          targetPeerElement.scrollTop = source.scrollTop;
          targetPeerElement.scrollLeft = source.scrollLeft;
        }
      });
      
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 50); // Debounce to prevent scroll fight / oscillations
    };
    
    currentElement.addEventListener('scroll', handleScroll);
    
    return () => {
      currentElement.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, syncGroup, style]); // Re-run if enabled, group, or style (affecting scrollability) changes
  
  return (
    <div 
      ref={containerRef} 
      data-sync-group={syncGroup} 
      className={className} 
      style={style} // Apply provided styles (should include overflow, height, etc.)
    >
      {children}
    </div>
  );
};
