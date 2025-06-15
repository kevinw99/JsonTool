import React, { useRef, useEffect } from 'react';
import { FilteredJsonViewer } from './FilteredJsonViewer';
import { JsonDiffViewer } from './JsonDiffViewer';
import { JsonViewer } from './JsonViewer';
import type { DiffResult } from '../jsonCompare';
import { JsonViewerSyncProvider, useJsonViewerSync } from './JsonViewerSyncContext';
import './SyncedJsonViewers.css';

interface SyncedJsonViewersProps {
  json1: any;
  json2: any;
  diffs: DiffResult[];
  viewMode: 'normal' | 'diff';
  syncScroll: boolean;
  height?: number;
  onToggleSyncScroll: () => void;
}

export const SyncedJsonViewers: React.FC<SyncedJsonViewersProps> = ({
  json1,
  json2,
  diffs,
  viewMode,
  syncScroll,
  height = 400,
  onToggleSyncScroll
}) => {
  const container1Ref = useRef<HTMLDivElement>(null);
  const container2Ref = useRef<HTMLDivElement>(null);
  
  // Track if we're currently handling a scroll event to prevent infinite loops
  const isScrollingRef = useRef<boolean>(false);
  
  // Set up scroll synchronization when enabled
  useEffect(() => {
    if (!syncScroll) return;
    
    const container1 = container1Ref.current;
    const container2 = container2Ref.current;
    
    if (!container1 || !container2) return;
    
    // Find the scrollable elements inside the containers
    const findScrollable = (container: HTMLElement): HTMLElement | null => {
      // First try to find the .json-tree-view element
      const treeView = container.querySelector('.json-tree-view');
      if (treeView) return treeView as HTMLElement;
      
      // Then try to find textarea
      const textarea = container.querySelector('textarea');
      if (textarea) return textarea;
      
      // Then try to find pre or any element with overflow auto/scroll
      const elements = Array.from(container.querySelectorAll('*')) as HTMLElement[];
      return elements.find(el => {
        const style = window.getComputedStyle(el);
        return style.overflow === 'auto' || style.overflow === 'scroll' ||
               style.overflowY === 'auto' || style.overflowY === 'scroll';
      }) || null;
    };
    
    const scrollable1 = findScrollable(container1);
    const scrollable2 = findScrollable(container2);
    
    if (!scrollable1 || !scrollable2) return;
    
    const handleScroll = (source: HTMLElement, target: HTMLElement) => {
      if (isScrollingRef.current) return;
      
      isScrollingRef.current = true;
      
      // Sync scroll positions
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 50);
    };
    
    // Add event listeners
    const scrollHandler1 = () => handleScroll(scrollable1, scrollable2);
    const scrollHandler2 = () => handleScroll(scrollable2, scrollable1);
    
    scrollable1.addEventListener('scroll', scrollHandler1);
    scrollable2.addEventListener('scroll', scrollHandler2);
    
    return () => {
      scrollable1.removeEventListener('scroll', scrollHandler1);
      scrollable2.removeEventListener('scroll', scrollHandler2);
    };
  }, [syncScroll, viewMode, json1, json2]);
  
  return (
    <div className="synced-json-viewers-container">
      <div className="synced-json-viewers-controls">
        <button 
          className={`sync-toggle ${syncScroll ? 'active' : ''}`}
          onClick={onToggleSyncScroll}
          aria-pressed={syncScroll}
        >
          {syncScroll ? '🔒 Synchronized Scrolling' : '🔓 Independent Scrolling'}
        </button>
      </div>
      
      <div className="synced-json-viewers-content">
        <div className="json-viewer-column" ref={container1Ref}>
          <h2>Sample 1</h2>
          <div className="json-viewer-wrapper">
            {viewMode === 'normal' ? (
              <JsonViewer json={json1} height={height} />
            ) : (
              <JsonDiffViewer 
                json={json1} 
                diffResults={diffs} 
                isOriginal={true} 
                height={height} 
              />
            )}
          </div>
        </div>
        
        <div className="json-viewer-column" ref={container2Ref}>
          <h2>Sample 2</h2>
          <div className="json-viewer-wrapper">
            {viewMode === 'normal' ? (
              <JsonViewer json={json2} height={height} />
            ) : (
              <JsonDiffViewer 
                json={json2} 
                diffResults={diffs} 
                isOriginal={false} 
                height={height}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
