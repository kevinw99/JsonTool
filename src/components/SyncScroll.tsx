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
    console.log(`[SyncScroll useEffect] 🔄 Running with enabled=${enabled}, syncGroup="${syncGroup}"`);
    const currentElement = containerRef.current;
    
    if (!enabled) {
      console.log(`[SyncScroll useEffect] 🚫 Sync disabled, exiting early`);
      return;
    }
    
    if (!currentElement) {
      console.log(`[SyncScroll useEffect] ❌ No current element, exiting early`);
      return;
    }

    console.log(`[SyncScroll useEffect] 📡 Current element scrollTop before setup:`, currentElement.scrollTop);

    const syncPeers = document.querySelectorAll<HTMLDivElement>(`[data-sync-group="${syncGroup}"]`);
    if (syncPeers.length <= 1) {
      console.log(`[SyncScroll useEffect] 👥 Not enough peers (${syncPeers.length}), exiting early`);
      return;
    }
    
    console.log(`[SyncScroll useEffect] 👥 Found ${syncPeers.length} sync peers`);
    
    const handleScroll = (event: Event) => {
      if (isScrollingRef.current) return;
      if (!(event.target instanceof HTMLElement) || event.target !== currentElement) return;
      
      // Check if sync is temporarily disabled
      if (currentElement.classList.contains('temp-disable-sync')) {
        console.log('[SyncScroll] 🚫 Scroll event blocked by temp-disable-sync class');
        return;
      }

      console.log('[SyncScroll] 📜 Processing scroll event from', currentElement.getAttribute('data-sync-group'));
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
    console.log(`[SyncScroll useEffect] ✅ Event listener added to element with scrollTop:`, currentElement.scrollTop);
    
    return () => {
      console.log(`[SyncScroll useEffect cleanup] 🧹 Cleaning up event listener`);
      console.log(`[SyncScroll useEffect cleanup] 📡 Element scrollTop during cleanup:`, currentElement.scrollTop);
      currentElement.removeEventListener('scroll', handleScroll);
      console.log(`[SyncScroll useEffect cleanup] ✅ Event listener removed`);
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
