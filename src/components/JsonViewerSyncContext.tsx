import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { DiffResult } from '../utils/jsonCompare'; 

export interface JsonViewerSyncContextProps { // Exporting the interface
  viewMode: 'text' | 'tree';
  showDiffsOnly: boolean;
  showColoredDiff: boolean;
  expandedPaths: Set<string>; // Stores generic numeric paths (e.g., "root.some.array[0]")
  ignoredDiffs: Set<string>; 
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
            const selectors = [
              `[data-path="${pathWithRoot}"]`,
              `[data-path="${targetPath}"]`,
              `[data-numeric-path="${pathWithRoot}"]`,
              `[data-numeric-path="${targetPath}"]`,
              `[data-generic-path="${pathWithRoot}"]`,
              `[data-generic-path="${targetPath}"]`,
              `.json-node[data-path="${pathWithRoot}"]`,
              `.json-node[data-path="${targetPath}"]`
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
            const scrollContainer = targetElement.closest('.json-viewer-scroll-container');
            console.log(`[JsonViewerSyncContext goToDiff] 🔍 Scroll container found:`, scrollContainer ? 'YES' : 'NO');
            
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
              
              // Try to find any scrollable parent
              let scrollableParent = targetElement.parentElement;
              while (scrollableParent) {
                const style = window.getComputedStyle(scrollableParent);
                if (style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'scroll') {
                  console.log(`[JsonViewerSyncContext goToDiff] 🔍 Found scrollable parent:`, scrollableParent.className);
                  scrollableParent.scrollTop = scrollableParent.scrollTop + 200; // Test scroll
                  break;
                }
                scrollableParent = scrollableParent.parentElement;
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
          console.log(`[Context] ❌ Removed array from forced sorting: "${arrayPath}"`);
        } else {
          newSet.add(arrayPath);
          console.log(`[Context] ✅ Added array to forced sorting: "${arrayPath}"`);
        }
        return newSet;
      });
    }, []);

    const syncToCounterpart = useCallback((nodePath: string, viewerId: string) => {
      // Normalize the path to remove viewer-specific prefix
      let normalizedPath = nodePath.replace(/^root_(viewer1|viewer2)_/, '');
      
      // Determine the target viewer
      const targetViewerId = viewerId === 'viewer1' ? 'viewer2' : 'viewer1';
      
      console.log(`[Context] Syncing from ${viewerId} to ${targetViewerId}, path: "${normalizedPath}"`);
      
      // Use the existing goToDiff method to navigate to the path in both viewers
      goToDiff(normalizedPath);
    }, [goToDiff]);

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
    }, [ignoredDiffs, diffResults, isPathIgnoredByPattern]);

    return (
        <JsonViewerSyncContext.Provider value={{
            viewMode,
            showDiffsOnly,
            showColoredDiff,
            expandedPaths,
            ignoredDiffs: effectiveIgnoredDiffs(),
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
        }}>
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
