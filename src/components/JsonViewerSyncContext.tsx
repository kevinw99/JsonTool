import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { DiffResult } from '../utils/jsonCompare'; 

export interface JsonViewerSyncContextProps { // Exporting the interface
  viewMode: 'text' | 'tree';
  showDiffsOnly: boolean;
  showColoredDiff: boolean;
  expandedPaths: Set<string>; // Stores generic numeric paths (e.g., "root.some.array[0]")
  ignoredDiffs: Set<string>; // All effectively ignored diffs (includes patterns)
  rawIgnoredDiffs: Set<string>; // Only explicitly ignored diffs (for UI display)
  ignoredPatterns: Map<string, string>; // Map<id, pattern> for ignored patterns
  setViewMode: (mode: 'text' | 'tree') => void;
  setShowDiffsOnly: (show: boolean) => void;
  setShowColoredDiff: (show: boolean) => void;
  toggleExpand: (genericPath: string) => void; // Path is generic numeric path
  setExpandAll: (expand: boolean) => void;
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  toggleIgnoreDiff: (diffPath: string) => void; 
  addIgnoredPattern: (pattern: string) => void;
  addIgnoredPatternFromRightClick: (path: string) => string;
  removeIgnoredPatternByPath: (path: string) => void;
  removeIgnoredPattern: (id: string) => void;
  updateIgnoredPattern: (id: string, newPattern: string) => void;
  isPathIgnoredByPattern: (path: string) => boolean;
  goToDiff: (diffPath: string) => void; 
  highlightPath: string | null;
  setHighlightPath: (path: string | null | ((prevState: string | null) => string | null)) => void;
  persistentHighlightPath: string | null; // New property for persistent border highlighting
  setPersistentHighlightPath: (path: string | null) => void;
  clearAllIgnoredDiffs: () => void;
  diffResults: DiffResult[]; 
  viewerId1: string; // Still needed for root path construction if JsonNode needs it initially, though generic paths are preferred
  viewerId2: string; 
  toggleShowDiffsOnly: () => void;
  // Context menu actions
  forceSortedArrays: Set<string>; // Paths of arrays that should be forcibly sorted
  toggleArraySorting: (arrayPath: string) => void;
  syncToCounterpart: (nodePath: string, viewerId: string) => void;
  // Test function for viewport debugging
  testViewportDetection: () => void;
}

export const JsonViewerSyncContext = createContext<JsonViewerSyncContextProps | undefined>(undefined);

interface JsonViewerSyncProviderProps {
  children: ReactNode;
  initialViewMode?: 'text' | 'tree';
  initialShowDiffsOnly?: boolean;
  initialSyncEnabled?: boolean;
  diffResults?: DiffResult[];
  viewerId1?: string; 
  viewerId2?: string; 
}

export const JsonViewerSyncProvider: React.FC<JsonViewerSyncProviderProps> = ({
  children,
  initialViewMode = 'tree',
  initialShowDiffsOnly = false, 
  initialSyncEnabled = true, 
  diffResults = [], 
  viewerId1 = "viewer1", // Default viewer IDs
  viewerId2 = "viewer2"
}) => {
    const [viewMode, _setViewMode] = useState<'text' | 'tree'>(initialViewMode);
    const [showDiffsOnly, setShowDiffsOnlyState] = useState<boolean>(initialShowDiffsOnly);
    const [showColoredDiff, _setShowColoredDiff] = useState<boolean>(true); 
    // Initialize with a Set including the generic root path
    const [expandedPaths, setExpandedPathsState] = useState<Set<string>>(
      new Set(['root']) // Generic root path
    );
    const [syncEnabled, setSyncEnabled] = useState<boolean>(initialSyncEnabled);
    const [ignoredDiffs, setIgnoredDiffsState] = useState<Set<string>>(new Set());
    
    // Helper functions for localStorage persistence
    const saveIgnoredPatternsToStorage = useCallback((patterns: Map<string, string>) => {
      try {
        const patternsArray = Array.from(patterns.entries());
        localStorage.setItem('jsonTool_ignoredPatterns', JSON.stringify(patternsArray));
      } catch (error) {
        console.warn('Failed to save ignored patterns to localStorage:', error);
      }
    }, []);

    const loadIgnoredPatternsFromStorage = useCallback((): Map<string, string> => {
      try {
        const stored = localStorage.getItem('jsonTool_ignoredPatterns');
        if (stored) {
          const patternsArray = JSON.parse(stored);
          return new Map(patternsArray);
        }
      } catch (error) {
        console.warn('Failed to load ignored patterns from localStorage:', error);
      }
      return new Map();
    }, []);

    // Initialize ignored patterns from localStorage
    const [ignoredPatterns, setIgnoredPatternsState] = useState<Map<string, string>>(() => {
      return loadIgnoredPatternsFromStorage();
    });
    const [highlightPath, setHighlightPathState] = useState<string | null>(null);
    const [persistentHighlightPath, setPersistentHighlightPath] = useState<string | null>(null);

    // Context menu related state
    const [forceSortedArrays, setForceSortedArraysState] = useState<Set<string>>(new Set());

    // Ref to track sync scroll state for temporary disabling during alignment
    const syncScrollRef = useRef<boolean>(true);
    
    // Track last sync alignment to maintain deterministic behavior
    const lastSyncAlignment = useRef<{
      viewer1ScrollTop: number;
      viewer2ScrollTop: number;
      targetPath: string;
      timestamp: number;
    } | null>(null);

    const memoizedSetViewMode = useCallback((mode: 'text' | 'tree') => {
      _setViewMode(mode);
    }, []);
    
    const memoizedSetShowColoredDiff = useCallback((show: boolean) => {
      _setShowColoredDiff(show);
    }, []);

    const memoizedSetHighlightPath = useCallback((path: string | null | ((prevState: string | null) => string | null)) => {
        setHighlightPathState(path);
    }, []);

    useEffect(() => {
      // Ensure "root" is expanded on initial load or changes to initialShowDiffsOnly
      setExpandedPathsState(prev => new Set(prev).add('root')); 
      setShowDiffsOnlyState(initialShowDiffsOnly); 
    }, [initialShowDiffsOnly]); // Dependencies simplified

    // Keep syncScrollRef synchronized with syncEnabled
    useEffect(() => {
      syncScrollRef.current = syncEnabled;
    }, [syncEnabled]);

    const toggleExpand = useCallback((genericPath: string) => {
      // genericPath is the generic numeric path, e.g., "root.some.path" or "root.array[0]"
      setExpandedPathsState(prev => {
        const newPathsSet = new Set(prev);
        if (newPathsSet.has(genericPath)) {
          newPathsSet.delete(genericPath);
        } else {
          newPathsSet.add(genericPath);
        }
        // console.log(`[JsonViewerSyncContext toggleExpand] Path: \"${genericPath}\". New expandedPaths:`, Array.from(newPathsSet));
        return newPathsSet;
      });
    }, []); // Dependencies simplified, sync logic removed as expansion is per-viewer based on generic path

    const setExpandAll = useCallback((expand: boolean) => {
      if (expand) {
        // Placeholder for full expansion logic
        // console.log("[JsonViewerSyncContext] setExpandAll(true) - full expansion not yet implemented");
        // For now, can iterate diffResults and add all unique numericPaths and their ancestors
        const allPathsToExpand = new Set<string>(['root']);
        diffResults.forEach(diff => {
          if (diff.numericPath) {
            // Add the diff path itself
            allPathsToExpand.add(diff.numericPath);
            // Add all its ancestors
            let currentPath = diff.numericPath;
            while (currentPath.includes('.') || currentPath.includes('[')) {
              const lastDot = currentPath.lastIndexOf('.');
              const lastBracket = currentPath.lastIndexOf('[');
              const parentEndIndex = Math.max(lastDot, lastBracket);
              if (parentEndIndex > -1) {
                currentPath = currentPath.substring(0, parentEndIndex);
                if (currentPath && currentPath !== 'root') { // Avoid adding empty string or re-adding root if path was like "root.foo"
                    allPathsToExpand.add(currentPath);
                } else if (currentPath === 'root') {
                    allPathsToExpand.add('root'); // Ensure root is there
                    break; // Reached root
                }
              } else {
                break; // No more parents
              }
            }
          }
        });
        setExpandedPathsState(allPathsToExpand);

      } else {
        setExpandedPathsState(new Set(['root'])); // Collapse to root
      }
    }, [diffResults]); // Dependency on diffResults for expansion logic

    const toggleIgnoreDiff = useCallback((numericDiffPath: string) => {
      setIgnoredDiffsState(prevIgnoredPaths => {
        const newIgnoredPathsSet = new Set(prevIgnoredPaths);
        if (newIgnoredPathsSet.has(numericDiffPath)) {
          newIgnoredPathsSet.delete(numericDiffPath);
        } else {
          newIgnoredPathsSet.add(numericDiffPath);
        }
        return newIgnoredPathsSet;
      });
    }, []);

    const clearAllIgnoredDiffs = useCallback(() => {
      setIgnoredDiffsState(new Set());
    }, []);

    // TEST FUNCTION: Debug viewport detection
    const testViewportDetection = useCallback(() => {
      console.log('🧪 VIEWPORT TEST: Starting viewport detection test');
      
      // Get window dimensions
      console.log('🧪 Window dimensions:', {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        devicePixelRatio: window.devicePixelRatio
      });
      
      // Find all elements with data-path
      const allElements = document.querySelectorAll('[data-path]');
      console.log(`🧪 Found ${allElements.length} elements with data-path`);
      
      // Test viewport detection for first 10 elements
      Array.from(allElements).slice(0, 10).forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const viewportCenter = window.innerHeight / 2;
        
        // Test different viewport detection methods
        const isInViewport_Method1 = rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
        const isInViewport_Method2 = rect.top >= 0 && rect.bottom <= window.innerHeight;
        const isInViewport_Method3 = rect.top < window.innerHeight && rect.bottom > 0;
        
        console.log(`🧪 Element ${index + 1}:`, {
          dataPath: element.getAttribute('data-path'),
          textContent: element.textContent?.substring(0, 30) + '...',
          rect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height
          },
          elementCenter: elementCenter,
          viewportCenter: viewportCenter,
          distanceFromCenter: Math.abs(elementCenter - viewportCenter),
          isInViewport_Method1: isInViewport_Method1,
          isInViewport_Method2: isInViewport_Method2,
          isInViewport_Method3: isInViewport_Method3,
          isVisible: rect.width > 0 && rect.height > 0,
          isWellCentered: Math.abs(elementCenter - viewportCenter) < 100
        });
      });
      
      // Show scroll containers
      const scrollContainers = document.querySelectorAll('[data-sync-group]');
      console.log(`🧪 Found ${scrollContainers.length} scroll containers`);
      scrollContainers.forEach((container, index) => {
        const rect = container.getBoundingClientRect();
        console.log(`🧪 Scroll container ${index + 1}:`, {
          tagName: container.tagName,
          className: container.className,
          rect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height
          },
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight
        });
      });
      
    }, []);

    const goToDiff = useCallback((numericPathToExpand: string) => {
      console.log(`[JsonViewerSyncContext goToDiff] 🎯 CALLED with NUMERIC path: "${numericPathToExpand}"`);
      
      // For array paths from ID Keys, we typically want to highlight the array itself
      // The IdKeysPanel should now be sending us the array path without [0] at the end
      // So we don't need to strip it here anymore
      let pathToHighlight = numericPathToExpand;
      console.log(`[JsonViewerSyncContext goToDiff] 🎯 Will highlight path: "${pathToHighlight}"`);
      
      // Reset highlight to re-trigger the effect in JsonNode, even for the same path.
      setHighlightPathState(null);

      // Use a timeout to allow the null state to propagate before setting the new path.
      // This ensures the `isHighlighted && !prevIsHighlighted` condition in JsonNode's useEffect fires correctly.
      setTimeout(() => {
        console.log(`[JsonViewerSyncContext goToDiff] 🔆 Setting highlight path: "${pathToHighlight}"`);
        setHighlightPathState(pathToHighlight); // highlightPath is generic numeric
        
        // Set persistent highlight for border highlighting that persists until next navigation
        setPersistentHighlightPath(pathToHighlight);
        console.log(`[JsonViewerSyncContext goToDiff] 🔒 Setting persistent highlight path: "${pathToHighlight}"`);

        setExpandedPathsState(currentExpandedPaths => {
          const newExpandedPaths = new Set<string>(currentExpandedPaths);
          newExpandedPaths.add('root'); // Ensure root is always expanded

          const segments: string[] = [];
          let remainingPath = numericPathToExpand;
          let baseIsRoot = false;

          if (remainingPath.startsWith('root')) {
              baseIsRoot = true;
              if (remainingPath.startsWith('root.')) {
                  remainingPath = remainingPath.substring(5);
              } else if (remainingPath === 'root') {
                  remainingPath = ''; 
              }
          }
          
          if (baseIsRoot) segments.push('root');

          if (remainingPath) { 
              const pathSegmentRegex = /([^.\[]+)|\[([^\]]+)\]/g; 
              let match;
              while ((match = pathSegmentRegex.exec(remainingPath)) !== null) {
                  segments.push(match[1] || match[0]); 
              }
          }

          console.log(`[JsonViewerSyncContext goToDiff] 🧩 Parsed segments from "${numericPathToExpand}":`, segments);

          const ancestorGenericPaths: string[] = [];
          let currentAncestorPath = '';
          
          // For array paths like "root.data.items[5]", we want to expand:
          // - "root" 
          // - "root.data"
          // - "root.data.items" (the array itself)
          // We need to continue through the full path to reach the target
          
          for (let i = 0; i < segments.length; i++) { 
            const segment = segments[i];
            
            if (currentAncestorPath === '') {
              currentAncestorPath = segment;
            } else {
              if (segment.startsWith('[') && segment.endsWith(']')) {
                // This is an array index - add the current path (array) as ancestor
                ancestorGenericPaths.push(currentAncestorPath);
                console.log(`[JsonViewerSyncContext goToDiff] 📂 Array ancestor: "${currentAncestorPath}"`);
                // Continue building the path through the array index
                currentAncestorPath += segment; 
              } else {
                currentAncestorPath += `.${segment}`;
              }
            }
            
            // Add all paths as ancestors - INCLUDING the final target
            if (!ancestorGenericPaths.includes(currentAncestorPath)) {
              ancestorGenericPaths.push(currentAncestorPath);
              console.log(`[JsonViewerSyncContext goToDiff] 📂 Ancestor path ${i + 1}: "${currentAncestorPath}"`);
            }
          }
          
          console.log(`[JsonViewerSyncContext goToDiff] 📂 GENERIC ancestor paths to expand (derived from "${numericPathToExpand}"):`, ancestorGenericPaths);

          ancestorGenericPaths.forEach(genericAncestor => {
            if (genericAncestor) { 
              newExpandedPaths.add(genericAncestor);
              console.log(`[JsonViewerSyncContext goToDiff] ➕ Added to expanded paths: "${genericAncestor}"`);
            }
          });
          
          console.log(`[JsonViewerSyncContext goToDiff] 📂 Setting expandedPaths to:`, Array.from(newExpandedPaths));
          return newExpandedPaths;
        });

        // Add additional scrolling logic after a delay to ensure DOM is updated
        setTimeout(() => {
          console.log(`[JsonViewerSyncContext goToDiff] 📜 Attempting to scroll to target: "${numericPathToExpand}"`);
          
          // The target path should be what we want to scroll to
          let targetPath = numericPathToExpand;
          // JsonTreeView DOM elements have paths with "root." prefix, so we need to add it if missing
          const pathWithRoot = targetPath.startsWith('root.') ? targetPath : `root.${targetPath}`;
          console.log(`[JsonViewerSyncContext goToDiff] 🎯 Target path for scrolling: "${targetPath}"`);
          console.log(`[JsonViewerSyncContext goToDiff] 🎯 Target path with root prefix: "${pathWithRoot}"`);
          
          // Debug: Check what data-path attributes exist that are similar
          const allDataPathElements = document.querySelectorAll('[data-path]');
          console.log(`[JsonViewerSyncContext goToDiff] 🔍 Total elements with data-path: ${allDataPathElements.length}`);
          
          const partialMatches = Array.from(allDataPathElements).filter(el => {
            const path = el.getAttribute('data-path');
            return path && (path.includes('boomerForecastV3Requests') || path.includes('metadata') || path.includes('externalRequestDateTime'));
          });
          
          console.log(`[JsonViewerSyncContext goToDiff] 🔍 Found ${partialMatches.length} elements with similar paths:`);
          partialMatches.forEach((el, i) => {
            if (i < 5) { // Limit output to first 5 matches
              console.log(`[JsonViewerSyncContext goToDiff] 🔍   ${i + 1}: data-path="${el.getAttribute('data-path')}"`);
            }
          });
          
          // Function to attempt finding and scrolling to the target element
          const attemptScrollToTarget = (attempt: number = 1, maxAttempts: number = 5) => {
            console.log(`[JsonViewerSyncContext goToDiff] 🔄 Scroll attempt ${attempt}/${maxAttempts}`);
            
            // Try multiple selectors to find the target element
            // Include viewer-specific paths since DOM elements have viewer prefixes
            const selectors = [
              `[data-path="${pathWithRoot}"]`,
              `[data-path="${targetPath}"]`,
              `[data-path="root_viewer1_${pathWithRoot}"]`,
              `[data-path="root_viewer2_${pathWithRoot}"]`,
              `[data-path="root_viewer1_${targetPath}"]`,
              `[data-path="root_viewer2_${targetPath}"]`,
              `[data-numeric-path="${pathWithRoot}"]`,
              `[data-numeric-path="${targetPath}"]`,
              `[data-generic-path="${pathWithRoot}"]`,
              `[data-generic-path="${targetPath}"]`,
              `.json-node[data-path="${pathWithRoot}"]`,
              `.json-node[data-path="${targetPath}"]`,
              `.json-node[data-path*="${pathWithRoot}"]`,
              `.json-node[data-path*="${targetPath}"]`
            ];
            
            let targetElement = null;
            for (const selector of selectors) {
              targetElement = document.querySelector(selector);
              if (targetElement) {
                console.log(`[JsonViewerSyncContext goToDiff] ✅ Found target element with selector: "${selector}"`);
                break;
              }
            }
            
            if (targetElement) {
              // Found the element, scroll to it
            console.log(`[JsonViewerSyncContext goToDiff] 📜 Scrolling to target element`);
            console.log(`[JsonViewerSyncContext goToDiff] 🎯 Target element details:`, {
              tagName: targetElement.tagName,
              className: targetElement.className,
              dataPath: targetElement.getAttribute('data-path'),
              textContent: targetElement.textContent?.substring(0, 100) + '...',
              offsetTop: (targetElement as HTMLElement).offsetTop,
              offsetLeft: (targetElement as HTMLElement).offsetLeft,
              clientHeight: (targetElement as HTMLElement).clientHeight,
              scrollTop: (targetElement as HTMLElement).scrollTop
            });
            
            // Use the scroll container for better control
            // SyncScroll components use data-sync-group attribute
            const scrollContainer = targetElement.closest('[data-sync-group]');
            console.log(`[JsonViewerSyncContext goToDiff] 🔍 Scroll container found:`, scrollContainer ? 'YES' : 'NO');
            console.log(`[JsonViewerSyncContext goToDiff] 🔍 Scroll container details:`, {
              tagName: scrollContainer?.tagName,
              className: scrollContainer?.className,
              syncGroup: scrollContainer?.getAttribute('data-sync-group'),
              scrollTop: scrollContainer?.scrollTop,
              scrollHeight: scrollContainer?.scrollHeight,
              clientHeight: scrollContainer?.clientHeight
            });
            
            if (scrollContainer) {
              // Force a reflow to ensure all DOM changes are applied
              targetElement.getBoundingClientRect();
              scrollContainer.getBoundingClientRect();
              
              const containerRect = scrollContainer.getBoundingClientRect();
              const nodeRect = targetElement.getBoundingClientRect();
              
              console.log(`[JsonViewerSyncContext goToDiff] 📦 Container details:`, {
                scrollTop: scrollContainer.scrollTop,
                scrollHeight: scrollContainer.scrollHeight,
                clientHeight: scrollContainer.clientHeight,
                containerRect: {
                  top: containerRect.top,
                  height: containerRect.height
                }
              });
              
              console.log(`[JsonViewerSyncContext goToDiff] 🎯 Node details:`, {
                nodeRect: {
                  top: nodeRect.top,
                  height: nodeRect.height
                }
              });
              
              // Calculate the desired scrollTop to center the node
              const offsetTopInContainer = nodeRect.top - containerRect.top;
              const desiredScrollTop = scrollContainer.scrollTop + offsetTopInContainer - (containerRect.height / 2) + (nodeRect.height / 2);
              
              console.log(`[JsonViewerSyncContext goToDiff] 🧮 Scroll calculation:`, {
                offsetTopInContainer,
                currentScrollTop: scrollContainer.scrollTop,
                desiredScrollTop,
                willScrollBy: desiredScrollTop - scrollContainer.scrollTop
              });
              
              // Try multiple scrolling approaches
              console.log(`[JsonViewerSyncContext goToDiff] 🔄 Trying programmatic scroll (bypass SyncScroll interference)`);
              
              // Approach 1: Direct scrollTop assignment (bypasses SyncScroll debouncing)
              const originalScrollTop = scrollContainer.scrollTop;
              scrollContainer.scrollTop = desiredScrollTop;
              
              console.log(`[JsonViewerSyncContext goToDiff] ✅ Direct scroll executed - from ${originalScrollTop} to ${desiredScrollTop}`);
              
              // Verify immediately
              setTimeout(() => {
                const actualScrollTop = scrollContainer.scrollTop;
                console.log(`[JsonViewerSyncContext goToDiff] 📍 Immediate verification - container scrollTop: ${actualScrollTop}`);
                
                // If direct assignment didn't work, try scrollTo
                if (Math.abs(actualScrollTop - desiredScrollTop) > 50) {
                  console.log(`[JsonViewerSyncContext goToDiff] 🔄 Direct scroll failed, trying scrollTo`);
                  
                  requestAnimationFrame(() => {
                    scrollContainer.scrollTo({
                      top: desiredScrollTop,
                      behavior: 'auto' // Use auto instead of smooth to bypass potential conflicts
                    });
                    
                    setTimeout(() => {
                      console.log(`[JsonViewerSyncContext goToDiff] 📍 Post-scrollTo verification - container scrollTop: ${scrollContainer.scrollTop}`);
                    }, 100);
                  });
                }
              }, 100);
            } else {
              console.log(`[JsonViewerSyncContext goToDiff] ⚠️ Scroll container not found, using fallback scrollIntoView`);
              console.log(`[JsonViewerSyncContext goToDiff] 🔍 Element parent hierarchy:`, {
                parentElement: targetElement.parentElement?.className,
                grandParent: targetElement.parentElement?.parentElement?.className,
                greatGrandParent: targetElement.parentElement?.parentElement?.parentElement?.className
              });
              
              // Try to find any scrollable parent, prioritizing SyncScroll containers
              let scrollableParent = targetElement.closest('[data-sync-group]');
              if (!scrollableParent) {
                scrollableParent = targetElement.parentElement;
                while (scrollableParent) {
                  const style = window.getComputedStyle(scrollableParent);
                  if (style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'scroll') {
                    console.log(`[JsonViewerSyncContext goToDiff] 🔍 Found scrollable parent:`, scrollableParent.className);
                    break;
                  }
                  scrollableParent = scrollableParent.parentElement;
                }
              }
              
              if (scrollableParent) {
                console.log(`[JsonViewerSyncContext goToDiff] 🔍 Using scrollable parent:`, {
                  tagName: scrollableParent.tagName,
                  className: scrollableParent.className,
                  syncGroup: scrollableParent.getAttribute('data-sync-group'),
                  scrollTop: scrollableParent.scrollTop,
                  scrollHeight: scrollableParent.scrollHeight,
                  clientHeight: scrollableParent.clientHeight
                });
                
                // Calculate scroll position to center the target element
                const containerRect = scrollableParent.getBoundingClientRect();
                const nodeRect = targetElement.getBoundingClientRect();
                const offsetTopInContainer = nodeRect.top - containerRect.top;
                const desiredScrollTop = scrollableParent.scrollTop + offsetTopInContainer - (containerRect.height / 2) + (nodeRect.height / 2);
                
                console.log(`[JsonViewerSyncContext goToDiff] 🧠 Fallback scroll calculation:`, {
                  currentScrollTop: scrollableParent.scrollTop,
                  desiredScrollTop,
                  offsetTopInContainer,
                  containerHeight: containerRect.height,
                  nodeHeight: nodeRect.height
                });
                
                // Temporarily disable sync scroll to prevent interference
                const syncScrollElement = scrollableParent.hasAttribute('data-sync-group') ? scrollableParent : scrollableParent.querySelector('[data-sync-group]');
                
                if (syncScrollElement) {
                  // Find the other sync scroll element and disable sync temporarily
                  const syncGroup = syncScrollElement.getAttribute('data-sync-group');
                  const allSyncElements = document.querySelectorAll(`[data-sync-group="${syncGroup}"]`);
                  
                  console.log(`[JsonViewerSyncContext goToDiff] 🔄 Temporarily disabling sync for ${allSyncElements.length} elements`);
                  
                  // Disable sync by adding a temporary class
                  allSyncElements.forEach(el => el.classList.add('temp-disable-sync'));
                  
                  // Perform the scroll
                  scrollableParent.scrollTop = desiredScrollTop;
                  
                  // Re-enable sync after a short delay
                  setTimeout(() => {
                    allSyncElements.forEach(el => el.classList.remove('temp-disable-sync'));
                    console.log(`[JsonViewerSyncContext goToDiff] 🔄 Re-enabled sync for scroll elements`);
                  }, 200);
                } else {
                  // No sync scroll element, just scroll directly
                  scrollableParent.scrollTop = desiredScrollTop;
                }
              }
              
              // Fallback to standard scrollIntoView with more specific options
              targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
              });
            }
            
            // Flash the element after scrolling
            setTimeout(() => {
              console.log(`[JsonViewerSyncContext goToDiff] ✨ Flashing target element`);
              targetElement.classList.add('json-flash');
              setTimeout(() => {
                targetElement.classList.remove('json-flash');
              }, 1000);
            }, 200);
            } else if (attempt < maxAttempts) {
              // Element not found, but we still have attempts left
              console.log(`[JsonViewerSyncContext goToDiff] ⏳ Element not found, retrying in 500ms... (attempt ${attempt}/${maxAttempts})`);
              setTimeout(() => attemptScrollToTarget(attempt + 1, maxAttempts), 500);
            } else {
              // Final attempt failed
              console.log(`[JsonViewerSyncContext goToDiff] ❌ Target element not found after ${maxAttempts} attempts for path: "${targetPath}"`);
              console.log(`[JsonViewerSyncContext goToDiff] 🔍 Also tried with root prefix: "${pathWithRoot}"`);
              console.log(`[JsonViewerSyncContext goToDiff] 🔍 Tried selectors:`, selectors);
              
              // Show what elements are actually available for debugging
              const availableElements = document.querySelectorAll('[data-path]');
              console.log(`[JsonViewerSyncContext goToDiff] 🔍 Currently available elements:`, 
                Array.from(availableElements).slice(0, 10).map(el => el.getAttribute('data-path')));
            }
          };
          
          // Start the scroll attempt process
          attemptScrollToTarget();
        }, 1200); // Increased delay to ensure DOM updates and expansions complete
      }, 50); // A small delay to ensure re-triggering.

    }, [setHighlightPathState]); // Dependencies simplified

    const toggleShowDiffsOnly = useCallback(() => {
        setShowDiffsOnlyState(prev => !prev);
    }, []);

    // Context menu action methods
    const toggleArraySorting = useCallback((arrayPath: string) => {
      setForceSortedArraysState(prev => {
        const newSet = new Set(prev);
        if (newSet.has(arrayPath)) {
          newSet.delete(arrayPath);
            } else {
          newSet.add(arrayPath);
        }
        return newSet;
      });
    }, []);

    const syncToCounterpart = useCallback((nodePath: string, _viewerId: string) => {
      // Normalize the path to remove viewer-specific prefix
      let normalizedPath = nodePath.replace(/^root_(viewer1|viewer2)_/, '');
      
      
      // FORCE perfect alignment - disable scroll sync immediately and keep it disabled
      const wasEnabled = syncScrollRef.current;
      syncScrollRef.current = false;
      
      // First, highlight the target node in both viewers
      goToDiff(normalizedPath);
      
      // Use a more aggressive approach with multiple alignment attempts
      const performAlignment = (attempt: number = 1) => {
        console.log(`[Context] 🎯 Alignment attempt ${attempt}/3`);
        
        // Find the target elements with more precise timing
        const pathWithRoot = normalizedPath.startsWith('root.') ? normalizedPath : `root.${normalizedPath}`;
        
        // More comprehensive selector strategies
        const findElement = (viewerPrefix: string) => {
          const selectors = [
            `[data-path="root_${viewerPrefix}_${pathWithRoot}"]`,
            `[data-path*="${viewerPrefix}"][data-path$="${pathWithRoot}"]`,
            `[data-path*="${viewerPrefix}"][data-path*="${pathWithRoot}"]`,
            `.json-node[data-path*="${viewerPrefix}"][data-path*="${normalizedPath}"]`
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector) as HTMLElement;
            if (element) {
              console.log(`[Context] ✅ Found ${viewerPrefix} element with selector: ${selector}`);
              return element;
            }
          }
          console.log(`[Context] ❌ Failed to find ${viewerPrefix} element`);
          return null;
        };
        
        const viewer1Element = findElement('viewer1');
        const viewer2Element = findElement('viewer2');
        
        if (viewer1Element && viewer2Element) {
          const container1 = viewer1Element.closest('.json-viewer-scroll-container') as HTMLElement;
          const container2 = viewer2Element.closest('.json-viewer-scroll-container') as HTMLElement;
          
          if (container1 && container2) {
            // Force layout calculation to get accurate positions
            viewer1Element.getBoundingClientRect();
            viewer2Element.getBoundingClientRect();
            container1.getBoundingClientRect();
            container2.getBoundingClientRect();
            
            // Calculate positions after forced reflow
            const rect1 = viewer1Element.getBoundingClientRect();
            const rect2 = viewer2Element.getBoundingClientRect();
            const containerRect1 = container1.getBoundingClientRect();
            const containerRect2 = container2.getBoundingClientRect();
            
            console.log(`[Context] 📐 Precise alignment calculation:`, {
              attempt,
              viewer1: { 
                elementTop: rect1.top, 
                containerTop: containerRect1.top, 
                currentScroll: container1.scrollTop,
                elementHeight: rect1.height
              },
              viewer2: { 
                elementTop: rect2.top, 
                containerTop: containerRect2.top, 
                currentScroll: container2.scrollTop,
                elementHeight: rect2.height
              }
            });
            
            // Calculate EXACT center alignment with more precision
            const container1CenterY = containerRect1.top + (containerRect1.height / 2);
            const container2CenterY = containerRect2.top + (containerRect2.height / 2);
            
            // Calculate how much to scroll to center each element
            const element1CenterY = rect1.top + (rect1.height / 2);
            const element2CenterY = rect2.top + (rect2.height / 2);
            
            const scrollAdjustment1 = element1CenterY - container1CenterY;
            const scrollAdjustment2 = element2CenterY - container2CenterY;
            
            const targetScrollTop1 = Math.max(0, container1.scrollTop + scrollAdjustment1);
            const targetScrollTop2 = Math.max(0, container2.scrollTop + scrollAdjustment2);
            
            console.log(`[Context] 🎯 EXACT target positions:`, {
              container1: { current: container1.scrollTop, target: targetScrollTop1, adjustment: scrollAdjustment1 },
              container2: { current: container2.scrollTop, target: targetScrollTop2, adjustment: scrollAdjustment2 }
            });
            
            // Perform immediate, precise scrolling with no animation to avoid timing issues
            container1.scrollTop = targetScrollTop1;
            container2.scrollTop = targetScrollTop2;
            
            // Verify alignment immediately and retry if needed
            setTimeout(() => {
              const actualScroll1 = container1.scrollTop;
              const actualScroll2 = container2.scrollTop;
              const alignmentError1 = Math.abs(actualScroll1 - targetScrollTop1);
              const alignmentError2 = Math.abs(actualScroll2 - targetScrollTop2);
              
              console.log(`[Context] 📊 Alignment verification:`, {
                attempt,
                viewer1: { target: targetScrollTop1, actual: actualScroll1, error: alignmentError1 },
                viewer2: { target: targetScrollTop2, actual: actualScroll2, error: alignmentError2 }
              });
              
              // If alignment is off by more than 5 pixels and we have attempts left, retry
              if ((alignmentError1 > 5 || alignmentError2 > 5) && attempt < 3) {
                console.log(`[Context] 🔄 Alignment not precise enough, retrying...`);
                setTimeout(() => performAlignment(attempt + 1), 300);
              } else {
                // Final alignment achieved or max attempts reached
                console.log(`[Context] ✅ FINAL ALIGNMENT COMPLETE - attempt ${attempt}`);
                
                // Add visual feedback
                viewer1Element.classList.add('json-sync-feedback');
                viewer2Element.classList.add('json-sync-feedback');
                
                // Store the aligned scroll positions for maintaining sync
                const alignedState = {
                  viewer1ScrollTop: container1.scrollTop,
                  viewer2ScrollTop: container2.scrollTop,
                  targetPath: normalizedPath,
                  timestamp: Date.now()
                };
                
                // Store alignment state for maintaining sync
                lastSyncAlignment.current = alignedState;
                console.log(`[Context] 💾 Stored aligned state:`, alignedState);
                
                // Keep scroll sync disabled for a longer period to prevent drift
                setTimeout(() => {
                  // Remove visual feedback
                  viewer1Element.classList.remove('json-sync-feedback');
                  viewer2Element.classList.remove('json-sync-feedback');
                  
                  // Re-enable scroll sync only if it was originally enabled
                  if (wasEnabled) {
                    syncScrollRef.current = true;
                    console.log(`[Context] 🔗 Re-enabled scroll sync after perfect alignment`);
                  }
                }, 2000); // Keep disabled longer to prevent immediate drift
              }
            }, 100); // Quick verification
            
            return true; // Successfully started alignment
          }
        }
        
        // If we reach here, elements weren't found - retry if we have attempts left
        if (attempt < 3) {
          console.log(`[Context] ⏳ Elements not found, retrying in 500ms...`);
          setTimeout(() => performAlignment(attempt + 1), 500);
        } else {
          console.warn(`[Context] ❌ Failed to find target elements after ${attempt} attempts`);
          // Re-enable sync even on failure
          if (wasEnabled) {
            syncScrollRef.current = true;
          }
        }
        
        return false;
      };
      
      // Start alignment with a delay to ensure goToDiff completes
      setTimeout(() => performAlignment(), 1200);
      
    }, [goToDiff, syncScrollRef]);

    // Wildcard pattern matching function
    const matchesPattern = useCallback((path: string, pattern: string): boolean => {
      // Convert pattern to regex:
      // 1. Split pattern by '.' to handle each segment separately
      // 2. For each segment, convert * to match within that segment
      // 3. Reassemble with literal dots
      
      const patternSegments = pattern.split('.');
      const pathSegments = path.split('.');
      
      // If pattern has different number of segments than path, check if pattern uses wildcards
      if (patternSegments.length !== pathSegments.length) {
        // Fall back to full regex matching for complex patterns
        let regexPattern = pattern
          .replace(/[.+?^${}()|\\]/g, '\\$&') // Escape regex special chars except * and []
          .replace(/\[(\d+)\]/g, '\\[$1\\]') // Escape literal array indices like [0]
          .replace(/\[\*\]/g, '\\[[0-9]+\\]') // Convert [*] to match any array index
          .replace(/\*/g, '.*'); // Convert * to match any characters (including dots for complex patterns)
        
        const regex = new RegExp(`^${regexPattern}$`);
        const result = regex.test(path);
        return result;
      }
      
      // Segment-by-segment matching
      for (let i = 0; i < patternSegments.length; i++) {
        const patternSegment = patternSegments[i];
        const pathSegment = pathSegments[i];
        
        if (patternSegment === '*') {
          // * matches any segment
          continue;
        }
        
        if (patternSegment.includes('*')) {
          // Segment contains wildcards - convert to regex
          const segmentRegex = patternSegment
            .replace(/[.+?^${}()|\\]/g, '\\$&') // Escape regex special chars
            .replace(/\[\*\]/g, '\\[[0-9]+\\]') // Handle array wildcards
            .replace(/\*/g, '.*'); // Convert * to match any chars within segment
          
          const regex = new RegExp(`^${segmentRegex}$`);
          if (!regex.test(pathSegment)) {
            return false;
          }
        } else {
          // Exact match required
          if (patternSegment !== pathSegment) {
            return false;
          }
        }
      }
      
      return true;
    }, []);

    // Check if a path is ignored by any pattern
    const isPathIgnoredByPattern = useCallback((path: string): boolean => {
      for (const pattern of ignoredPatterns.values()) {
        if (matchesPattern(path, pattern)) {
          return true;
        }
      }
      return false;
    }, [ignoredPatterns, matchesPattern]);

    // Pattern management functions
    const addIgnoredPattern = useCallback((pattern: string) => {
      const id = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setIgnoredPatternsState(prev => {
        const newMap = new Map(prev).set(id, pattern);
        saveIgnoredPatternsToStorage(newMap);
        return newMap;
      });
    }, [saveIgnoredPatternsToStorage]);

    const addIgnoredPatternFromRightClick = useCallback((path: string) => {
      // Create a pattern that matches the path and all its children
      // For arrays, we need to match both path.* and path[*] patterns
      const pattern = `${path}*`; // This will match path.anything, path[anything], etc.
      const id = `rightclick_${path}`;
      setIgnoredPatternsState(prev => {
        const newMap = new Map(prev).set(id, pattern);
        saveIgnoredPatternsToStorage(newMap);
        return newMap;
      });
      return id;
    }, [saveIgnoredPatternsToStorage]);

    const removeIgnoredPatternByPath = useCallback((path: string) => {
      const id = `rightclick_${path}`;
      setIgnoredPatternsState(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        saveIgnoredPatternsToStorage(newMap);
        return newMap;
      });
    }, [saveIgnoredPatternsToStorage]);

    const removeIgnoredPattern = useCallback((id: string) => {
      setIgnoredPatternsState(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        saveIgnoredPatternsToStorage(newMap);
        return newMap;
      });
    }, [saveIgnoredPatternsToStorage]);

    const updateIgnoredPattern = useCallback((id: string, newPattern: string) => {
      setIgnoredPatternsState(prev => {
        if (prev.has(id)) {
          const newMap = new Map(prev).set(id, newPattern);
          saveIgnoredPatternsToStorage(newMap);
          return newMap;
        }
        return prev;
      });
    }, [saveIgnoredPatternsToStorage]);

    // Update ignoredDiffs to include both specific paths and pattern matches
    const effectiveIgnoredDiffs = useCallback(() => {
      const ignored = new Set(ignoredDiffs);
      
      // Add paths that match any ignored pattern
      for (const diff of diffResults) {
        if (diff.numericPath && isPathIgnoredByPattern(diff.numericPath)) {
          ignored.add(diff.numericPath);
        }
      }
      
      return ignored;
    }, [ignoredDiffs, diffResults, isPathIgnoredByPattern, ignoredPatterns]); // Added ignoredPatterns as dependency

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        viewMode,
        showDiffsOnly,
        showColoredDiff,
        expandedPaths,
        ignoredDiffs: effectiveIgnoredDiffs(),
        rawIgnoredDiffs: ignoredDiffs,
        ignoredPatterns,
        setViewMode: memoizedSetViewMode,
        setShowDiffsOnly: setShowDiffsOnlyState, 
        setShowColoredDiff: memoizedSetShowColoredDiff,
        toggleExpand,
        setExpandAll,
        syncEnabled,
        setSyncEnabled,
        toggleIgnoreDiff,
        addIgnoredPattern,
        addIgnoredPatternFromRightClick,
        removeIgnoredPatternByPath,
        removeIgnoredPattern,
        updateIgnoredPattern,
        isPathIgnoredByPattern,
        goToDiff,
        highlightPath,
        setHighlightPath: memoizedSetHighlightPath,
        persistentHighlightPath,
        setPersistentHighlightPath,
        clearAllIgnoredDiffs,
        diffResults,
        viewerId1, 
        viewerId2,
        toggleShowDiffsOnly,
        // Context menu actions
        forceSortedArrays,
        toggleArraySorting,
        syncToCounterpart,
        // Test function
        testViewportDetection,
    }), [
        viewMode,
        showDiffsOnly,
        showColoredDiff,
        expandedPaths,
        ignoredDiffs, // This is the key dependency
        ignoredPatterns,
        memoizedSetViewMode,
        setShowDiffsOnlyState,
        memoizedSetShowColoredDiff,
        toggleExpand,
        setExpandAll,
        syncEnabled,
        setSyncEnabled,
        toggleIgnoreDiff,
        addIgnoredPattern,
        removeIgnoredPattern,
        updateIgnoredPattern,
        isPathIgnoredByPattern,
        goToDiff,
        highlightPath,
        memoizedSetHighlightPath,
        persistentHighlightPath,
        setPersistentHighlightPath,
        clearAllIgnoredDiffs,
        diffResults,
        viewerId1,
        viewerId2,
        toggleShowDiffsOnly,
        forceSortedArrays,
        toggleArraySorting,
        syncToCounterpart,
        testViewportDetection,
        effectiveIgnoredDiffs,
    ]);

    return (
        <JsonViewerSyncContext.Provider value={contextValue}>
            {children}
        </JsonViewerSyncContext.Provider>
    );
};

// Custom hook to use the JsonViewerSyncContext
export const useJsonViewerSync = () => {
  const context = useContext(JsonViewerSyncContext);
  if (context === undefined) {
    throw new Error('useJsonViewerSync must be used within a JsonViewerSyncProvider');
  }
  return context;
};
