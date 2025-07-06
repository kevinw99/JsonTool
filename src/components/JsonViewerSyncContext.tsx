import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { DiffResult, IdKeyInfo } from '../utils/jsonCompare';
import { NewHighlightingProcessor } from '../utils/NewHighlightingProcessor';
import { convertIdPathToIndexPath, type PathConversionContext } from '../utils/PathConverter';
import type { IdBasedPath, ViewerPath, ViewerId, NumericPath } from '../utils/PathTypes';
import { hasIdBasedSegments, createIdBasedPath, createViewerPath, validateAndCreateNumericPath } from '../utils/PathTypes';
import { resolveIdBasedPathToNumeric } from '../utils/pathResolution'; 

export interface JsonViewerSyncContextProps { // Exporting the interface
  viewMode: 'text' | 'tree';
  showDiffsOnly: boolean;
  showColoredDiff: boolean;
  expandedPaths: Set<ViewerPath>; // Stores viewer-specific numeric paths (e.g., "left_root.some.array[0]") - ID-based paths remain viewer-agnostic
  ignoredDiffs: Set<string>; // All effectively ignored diffs (includes patterns)
  rawIgnoredDiffs: Set<string>; // Only explicitly ignored diffs (for UI display)
  ignoredPatterns: Map<string, string>; // Map<id, pattern> for ignored patterns
  setViewMode: (mode: 'text' | 'tree') => void;
  setShowDiffsOnly: (show: boolean) => void;
  setShowColoredDiff: (show: boolean) => void;
  toggleExpand: (path: IdBasedPath, sourceViewerId?: ViewerId) => void; // Can accept both numeric and ID-based paths
  setExpandAll: (expand: boolean) => void;
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  toggleIgnoreDiff: (diffPath: IdBasedPath) => void; 
  addIgnoredPattern: (pattern: IdBasedPath) => void;
  addIgnoredPatternFromRightClick: (path: IdBasedPath) => string;
  removeIgnoredPatternByPath: (path: IdBasedPath) => void;
  removeIgnoredPattern: (id: string) => void;
  updateIgnoredPattern: (id: string, newPattern: string) => void;
  isPathIgnoredByPattern: (path: IdBasedPath) => boolean;
  goToDiff: (diffPath: IdBasedPath) => void; // Diff paths can be either numeric or ID-based
  goToDiffWithPaths: (leftPath: NumericPath, rightPath: NumericPath) => void; // Navigate with separate paths for each viewer
  highlightPath: NumericPath | null; // Highlighting uses numeric paths
  setHighlightPath: (path: NumericPath | null | ((prevState: NumericPath | null) => NumericPath | null)) => void;
  persistentHighlightPaths: Set<ViewerPath>; // Viewer-specific highlighting using ViewerPath
  setPersistentHighlightPaths: (paths: Set<ViewerPath>) => void;
  clearAllIgnoredDiffs: () => void;
  diffResults: DiffResult[]; 
  highlightingProcessor: NewHighlightingProcessor | null; // New: PathConverter-based highlighting processor
  viewerId1: string; // Still needed for root path construction if JsonNode needs it initially, though generic paths are preferred
  viewerId2: string; 
  toggleShowDiffsOnly: () => void;
  // Context menu actions
  forceSortedArrays: Set<NumericPath>; // Paths of arrays that should be forcibly sorted
  toggleArraySorting: (arrayPath: NumericPath) => void;
  syncToCounterpart: (nodePath: IdBasedPath, viewerId: ViewerId) => void; // Receives ID-based paths from JsonTreeView
  // Manual sync control functions
  disableSyncScrolling: () => void;
  enableSyncScrolling: () => void;
  // Test function for viewport debugging
  testViewportDetection: () => void;
  // PathConverter context data
  jsonData?: { left: any; right: any };
  idKeysUsed?: IdKeyInfo[];
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
  jsonData?: { left: any; right: any }; // Add JSON data for ID-based correlation
  idKeysUsed?: IdKeyInfo[]; // Add ID keys for path conversion
}

export const JsonViewerSyncProvider: React.FC<JsonViewerSyncProviderProps> = ({
  children,
  initialViewMode = 'tree',
  initialShowDiffsOnly = false, 
  initialSyncEnabled = true, 
  diffResults = [], 
  viewerId1 = "left", // Default viewer IDs
  viewerId2 = "right",
  jsonData, // JSON data for ID-based correlation
  idKeysUsed = [] // ID keys for path conversion
}) => {
  // Removed syncToCounterpartRef as manual expansion no longer triggers sync
    const [viewMode, _setViewMode] = useState<'text' | 'tree'>(initialViewMode);
    const [showDiffsOnly, setShowDiffsOnlyState] = useState<boolean>(initialShowDiffsOnly);
    const [showColoredDiff, _setShowColoredDiff] = useState<boolean>(true); 
    // Initialize with a Set including the viewer-specific root paths
    const [expandedPaths, setExpandedPathsState] = useState<Set<ViewerPath>>(
      new Set([
        createViewerPath('left', validateAndCreateNumericPath('root', 'JsonViewerSyncContext.init')),
        createViewerPath('right', validateAndCreateNumericPath('root', 'JsonViewerSyncContext.init'))
      ])
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
    const [highlightPath, setHighlightPathState] = useState<NumericPath | null>(null);
    const [persistentHighlightPaths, setPersistentHighlightPaths] = useState<Set<ViewerPath>>(new Set());
    
    // New: State for PathConverter-based highlighting processor
    const [highlightingProcessor, setHighlightingProcessor] = useState<NewHighlightingProcessor | null>(null);

    // Context menu related state
    const [forceSortedArrays, setForceSortedArraysState] = useState<Set<NumericPath>>(new Set());

    // Ref to track sync scroll state for temporary disabling during alignment
    const syncScrollRef = useRef<boolean>(true);
    

    const memoizedSetViewMode = useCallback((mode: 'text' | 'tree') => {
      _setViewMode(mode);
    }, []);
    
    const memoizedSetShowColoredDiff = useCallback((show: boolean) => {
      _setShowColoredDiff(show);
    }, []);

    const memoizedSetHighlightPath = useCallback((path: NumericPath | null | ((prevState: NumericPath | null) => NumericPath | null)) => {
        setHighlightPathState(path);
    }, []);

    useEffect(() => {
      // Ensure "root" is expanded on initial load or changes to initialShowDiffsOnly
      setExpandedPathsState(prev => new Set(prev).add(createViewerPath('left', validateAndCreateNumericPath('root', 'JsonViewerSyncContext.useEffect'))).add(createViewerPath('right', validateAndCreateNumericPath('root', 'JsonViewerSyncContext.useEffect')))); 
      setShowDiffsOnlyState(initialShowDiffsOnly); 
    }, [initialShowDiffsOnly]); // Dependencies simplified

    // Keep syncScrollRef synchronized with syncEnabled
    useEffect(() => {
      syncScrollRef.current = syncEnabled;
    }, [syncEnabled]);

    // New: Create highlighting processor when diffResults change
    useEffect(() => {
      if (diffResults && diffResults.length > 0) {
        const processor = new NewHighlightingProcessor(diffResults);
        setHighlightingProcessor(processor);
        
        // Enhanced debug logging
        console.log('🎨 Created new highlighting processor:', {
          totalDiffs: diffResults.length,
          diffTypes: diffResults.reduce((acc, diff) => {
            acc[diff.type] = (acc[diff.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        });
      } else {
        setHighlightingProcessor(null);
      }
    }, [diffResults, jsonData, idKeysUsed]);

    const toggleExpand = useCallback((path: string, sourceViewerId?: ViewerId) => {
      console.log(`[JsonViewerSyncContext toggleExpand] Simple path: "${path}"`);
      
      if (!sourceViewerId) {
        console.log(`[JsonViewerSyncContext toggleExpand] No sourceViewerId provided`);
        return;
      }
      
      // Convert viewer-specific path to generic path
      // "root_left_root.boomerForecastV3Requests" -> "root.boomerForecastV3Requests"
      const genericPath = path.replace(/^root_(left|right)_/, '');
      console.log(`[JsonViewerSyncContext toggleExpand] Generic path: "${genericPath}"`);
      
      // Check if this is an ID-based array path that needs sync
      const hasIdBasedSegment = genericPath.includes('[id=');
      console.log(`[JsonViewerSyncContext toggleExpand] Has ID-based segment: ${hasIdBasedSegment}`);
      
      // Convert to numeric path for consistent storage
      let sourceNumericPath = genericPath;
      if (hasIdBasedSegment && jsonData && idKeysUsed) {
        const sourceData = sourceViewerId === 'left' ? jsonData.left : jsonData.right;
        const sourceContext: PathConversionContext = { jsonData: sourceData, idKeysUsed: idKeysUsed };
        
        try {
          const convertedPath = convertIdPathToIndexPath(
            createIdBasedPath(genericPath),
            sourceContext,
            { preservePrefix: true }
          );
          if (convertedPath) {
            sourceNumericPath = convertedPath;
            console.log(`[JsonViewerSyncContext toggleExpand] 🎯 Converted source ID path to numeric: "${sourceNumericPath}"`);
          }
        } catch (error) {
          console.log(`[JsonViewerSyncContext toggleExpand] 🎯 Failed to convert source path, using original:`, error);
        }
      }
      
      // Create viewer-specific path for storage (always numeric)
      const viewerSpecificPath = createViewerPath(sourceViewerId, validateAndCreateNumericPath(sourceNumericPath, 'JsonViewerSyncContext.toggleExpand'));
      console.log(`[JsonViewerSyncContext toggleExpand] Viewer-specific path: "${viewerSpecificPath}"`);
      
      // Always toggle expansion for the source viewer's path
      setExpandedPathsState(prev => {
        const newPaths = new Set(prev);
        const wasExpanded = newPaths.has(viewerSpecificPath);
        
        if (wasExpanded) {
          newPaths.delete(viewerSpecificPath);
        } else {
          newPaths.add(viewerSpecificPath);
        }
        
        console.log(`[JsonViewerSyncContext toggleExpand] Action: ${wasExpanded ? 'collapsed' : 'expanded'} "${viewerSpecificPath}"`);
        console.log(`[expandedPaths] Added to expandedPaths: "${viewerSpecificPath}"`);
        console.log(`[expandedPaths] Current expandedPaths size: ${newPaths.size}`);
        
        // Sync to other viewer (for both simple and ID-based paths)
        if (syncEnabled) {
          const otherViewerId = sourceViewerId === 'left' ? 'right' : 'left';
          
          if (hasIdBasedSegment && jsonData && idKeysUsed) {
            // Handle ID-based path sync (existing logic)
            console.log(`[JsonViewerSyncContext toggleExpand] 🎯 ID-based sync: Finding corresponding path in other viewer`);
            
            // sourceData removed - unused variable
            const otherData = otherViewerId === 'left' ? jsonData.left : jsonData.right;
            
            console.log(`[JsonViewerSyncContext toggleExpand] 🔍 Data selection debug:`);
            console.log(`[JsonViewerSyncContext toggleExpand] 🔍 sourceViewerId: ${sourceViewerId}`);
            console.log(`[JsonViewerSyncContext toggleExpand] 🔍 otherViewerId: ${otherViewerId}`);
            console.log(`[JsonViewerSyncContext toggleExpand] 🔍 Using sourceData: ${sourceViewerId === 'left' ? 'LEFT' : 'RIGHT'}`);
            console.log(`[JsonViewerSyncContext toggleExpand] 🔍 Using otherData: ${otherViewerId === 'left' ? 'LEFT' : 'RIGHT'}`);
            
            // Use PathConverter to find corresponding numeric path in other viewer
            const otherContext: PathConversionContext = { jsonData: otherData, idKeysUsed: idKeysUsed };
            
            try {
              // Convert generic ID-based path to numeric in other viewer
              const otherNumericPath = convertIdPathToIndexPath(
                createIdBasedPath(genericPath),
                otherContext,
                { preservePrefix: true }
              );
              console.log(`[JsonViewerSyncContext toggleExpand] 🎯 Other viewer numeric path: "${otherNumericPath}"`);
              
              // If we found a corresponding path in the other viewer, create viewer-specific path and toggle it
              if (otherNumericPath) {
                const otherViewerSpecificPath = createViewerPath(otherViewerId, validateAndCreateNumericPath(otherNumericPath, 'JsonViewerSyncContext.toggleExpand.other'));
                console.log(`[JsonViewerSyncContext toggleExpand] 🎯 Other viewer-specific path: "${otherViewerSpecificPath}"`);
                
                if (wasExpanded) {
                  newPaths.delete(otherViewerSpecificPath);
                } else {
                  newPaths.add(otherViewerSpecificPath);
                }
                console.log(`[JsonViewerSyncContext toggleExpand] 🎯 Synced to other viewer: ${wasExpanded ? 'collapsed' : 'expanded'} "${otherViewerSpecificPath}"`);
                console.log(`[expandedPaths] Added sync path to expandedPaths: "${otherViewerSpecificPath}"`);
              } else {
                console.log(`[JsonViewerSyncContext toggleExpand] 🎯 No corresponding path found in other viewer`);
              }
            } catch (error) {
              console.log(`[JsonViewerSyncContext toggleExpand] 🎯 Error during ID-based sync:`, error);
            }
          } else {
            // Handle simple path sync (new logic)
            console.log(`[JsonViewerSyncContext toggleExpand] 🎯 Simple path sync: Adding corresponding path in other viewer`);
            const otherViewerSpecificPath = createViewerPath(otherViewerId, validateAndCreateNumericPath(sourceNumericPath, 'JsonViewerSyncContext.toggleExpand.simple'));
            console.log(`[JsonViewerSyncContext toggleExpand] 🎯 Other viewer simple path: "${otherViewerSpecificPath}"`);
            
            if (wasExpanded) {
              newPaths.delete(otherViewerSpecificPath);
            } else {
              newPaths.add(otherViewerSpecificPath);
            }
            console.log(`[JsonViewerSyncContext toggleExpand] 🎯 Synced simple path to other viewer: ${wasExpanded ? 'collapsed' : 'expanded'} "${otherViewerSpecificPath}"`);
            console.log(`[expandedPaths] Added simple sync path to expandedPaths: "${otherViewerSpecificPath}"`);
          }
        }
        
        return newPaths;
      });
    }, [syncEnabled, jsonData, idKeysUsed]); // Dependencies for ID-based sync

    const setExpandAll = useCallback((expand: boolean) => {
      if (expand) {
        // Placeholder for full expansion logic
        // console.log("[JsonViewerSyncContext] setExpandAll(true) - full expansion not yet implemented");
        // For now, can iterate diffResults and add all unique ID-based paths and their ancestors
        const allPathsToExpand = new Set<ViewerPath>();
        
        // Add root for both viewers
        allPathsToExpand.add(createViewerPath('left', validateAndCreateNumericPath('root', 'JsonViewerSyncContext.setExpandAll')));
        allPathsToExpand.add(createViewerPath('right', validateAndCreateNumericPath('root', 'JsonViewerSyncContext.setExpandAll')));
        
        diffResults.forEach(diff => {
          if (diff.idBasedPath) {
            // Add the diff path itself with viewer prefixes
            allPathsToExpand.add(createViewerPath('left', validateAndCreateNumericPath(diff.idBasedPath, 'JsonViewerSyncContext.setExpandAll.diff')));
            allPathsToExpand.add(createViewerPath('right', validateAndCreateNumericPath(diff.idBasedPath, 'JsonViewerSyncContext.setExpandAll.diff')));
            
            // Add all its ancestors
            let currentPath = diff.idBasedPath;
            while (currentPath.includes('.') || currentPath.includes('[')) {
              const lastDot = currentPath.lastIndexOf('.');
              const lastBracket = currentPath.lastIndexOf('[');
              const parentEndIndex = Math.max(lastDot, lastBracket);
              if (parentEndIndex > -1) {
                currentPath = currentPath.substring(0, parentEndIndex);
                if (currentPath && currentPath !== 'root') {
                    allPathsToExpand.add(createViewerPath('left', validateAndCreateNumericPath(currentPath, 'JsonViewerSyncContext.setExpandAll.parent')));
                    allPathsToExpand.add(createViewerPath('right', validateAndCreateNumericPath(currentPath, 'JsonViewerSyncContext.setExpandAll.parent')));
                } else if (currentPath === 'root') {
                    // Already added root paths above
                    break;
                }
              } else {
                break; // No more parents
              }
            }
          }
        });
        setExpandedPathsState(allPathsToExpand);

      } else {
        setExpandedPathsState(new Set([createViewerPath('left', validateAndCreateNumericPath('root', 'JsonViewerSyncContext.setExpandAll.collapse')), createViewerPath('right', validateAndCreateNumericPath('root', 'JsonViewerSyncContext.setExpandAll.collapse'))])); // Collapse to root
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

    const goToDiffWithPaths = useCallback((leftPath: string, rightPath: string) => {
      console.log('[goToDiffWithPaths] 🎯 Navigating to LEFT:', leftPath, 'RIGHT:', rightPath);
      
      // Ensure paths have root prefix
      const leftPathWithRoot = leftPath.startsWith('root.') ? leftPath : `root.${leftPath}`;
      const rightPathWithRoot = rightPath.startsWith('root.') ? rightPath : `root.${rightPath}`;
      
      // Clear existing highlights before setting new ones
      setHighlightPathState(null);
      setPersistentHighlightPaths(new Set<ViewerPath>());
      
      setTimeout(() => {
        setHighlightPathState(validateAndCreateNumericPath(leftPathWithRoot, 'JsonViewerSyncContext.goToDiffWithPaths'));
        
        // Set viewer-specific persistent highlights for both paths
        const highlightPaths = new Set<ViewerPath>();
        highlightPaths.add(createViewerPath('left', validateAndCreateNumericPath(leftPathWithRoot, 'JsonViewerSyncContext.goToDiffWithPaths.left')));
        highlightPaths.add(createViewerPath('right', validateAndCreateNumericPath(rightPathWithRoot, 'JsonViewerSyncContext.goToDiffWithPaths.right')));
        setPersistentHighlightPaths(highlightPaths);
        
        console.log('[goToDiffWithPaths] 🎨 Set dual highlighting for:', Array.from(highlightPaths));
        
        // Expand and navigate both viewers simultaneously
        setExpandedPathsState(currentExpandedPaths => {
          const newExpandedPaths = new Set<ViewerPath>(currentExpandedPaths);
          newExpandedPaths.add(createViewerPath('left', validateAndCreateNumericPath('root', 'JsonViewerSyncContext.goToDiffWithPaths.expand'))); // Ensure root is always expanded
          newExpandedPaths.add(createViewerPath('right', validateAndCreateNumericPath('root', 'JsonViewerSyncContext.goToDiffWithPaths.expand')));
          
          // Helper function to add expansion paths for a given viewer and path
          const addExpansionPaths = (viewerPrefix: string, numericPath: string) => {
            const segments = numericPath.replace(/^root\.?/, '').split(/(?=\[)|\./).filter(Boolean);
            if (numericPath.startsWith('root')) segments.unshift('root');
            
            let currentPath = '';
            for (const segment of segments) {
              if (currentPath === '') {
                currentPath = segment;
              } else if (segment.startsWith('[')) {
                currentPath += segment;
              } else {
                currentPath += `.${segment}`;
              }
              const viewerPath = createViewerPath(viewerPrefix as ViewerId, validateAndCreateNumericPath(currentPath, 'JsonViewerSyncContext.goToDiffWithPaths.expandPath'));
              newExpandedPaths.add(viewerPath);
              console.log(`[goToDiffWithPaths] 📂 Added ${viewerPrefix} path:`, viewerPath);
            }
          };
          
          // Add expansion paths for both viewers
          addExpansionPaths('left', leftPathWithRoot);
          addExpansionPaths('right', rightPathWithRoot);
          
          return newExpandedPaths;
        });
        
        // Scroll to both target elements
        setTimeout(() => {
          const leftElement = document.querySelector(`[data-path="${leftPathWithRoot}"]`);
          const rightElement = document.querySelector(`[data-path="${rightPathWithRoot}"]`);
          
          console.log('[goToDiffWithPaths] 🎯 Found elements - LEFT:', !!leftElement, 'RIGHT:', !!rightElement);
          
          // Scroll left viewer
          if (leftElement) {
            const leftContainer = leftElement.closest('.json-viewer-scroll-container');
            if (leftContainer) {
              const rect = leftElement.getBoundingClientRect();
              const containerRect = leftContainer.getBoundingClientRect();
              const scrollTop = Math.max(0, leftContainer.scrollTop + rect.top - containerRect.top - containerRect.height / 2);
              leftContainer.scrollTop = scrollTop;
              console.log('[goToDiffWithPaths] ⬅️ Scrolled left viewer to:', scrollTop);
            }
          }
          
          // Scroll right viewer
          if (rightElement) {
            const rightContainer = rightElement.closest('.json-viewer-scroll-container');
            if (rightContainer) {
              const rect = rightElement.getBoundingClientRect();
              const containerRect = rightContainer.getBoundingClientRect();
              const scrollTop = Math.max(0, rightContainer.scrollTop + rect.top - containerRect.top - containerRect.height / 2);
              rightContainer.scrollTop = scrollTop;
              console.log('[goToDiffWithPaths] ➡️ Scrolled right viewer to:', scrollTop);
            }
          }
        }, 1200);
      }, 50);
    }, [setHighlightPathState, setPersistentHighlightPaths, setExpandedPathsState]);

    const goToDiff = useCallback((pathToExpand: string) => {
      console.log('[goToDiff] 🎯 Single path navigation:', pathToExpand);
      
      // Check if this is an ID-based path using PathTypes utility
      const isIdPath = hasIdBasedSegments(createIdBasedPath(pathToExpand));
      
      if (isIdPath && jsonData && idKeysUsed) {
        // Convert ID-based path to numeric paths for both viewers
        const result = resolveIdBasedPathToNumeric(
          pathToExpand,
          jsonData,
          idKeysUsed
        );
        
        if (result.leftPath && result.rightPath) {
          // Path exists in both viewers - use the new dual navigation
          console.log('[goToDiff] 🔄 ID path exists in both viewers, using goToDiffWithPaths');
          goToDiffWithPaths(result.leftPath, result.rightPath);
          return;
        } else if (result.leftPath) {
          // Only exists in left viewer
          console.log('[goToDiff] ⬅️ ID path only in LEFT viewer');
          goToDiffWithPaths(result.leftPath, result.leftPath);
          return;
        } else if (result.rightPath) {
          // Only exists in right viewer
          console.log('[goToDiff] ➡️ ID path only in RIGHT viewer');
          goToDiffWithPaths(result.rightPath, result.rightPath);
          return;
        } else {
          console.warn('[goToDiff] ⚠️ Failed to resolve ID-based path:', pathToExpand);
        }
      }
      
      // For non-ID paths (already numeric), navigate to same path in both viewers
      console.log('[goToDiff] 📍 Using numeric path for both viewers:', pathToExpand);
      goToDiffWithPaths(pathToExpand, pathToExpand);
    }, [jsonData, idKeysUsed, goToDiffWithPaths]);

    const toggleShowDiffsOnly = useCallback(() => {
        setShowDiffsOnlyState(prev => !prev);
    }, []);

    // Context menu action methods
    const toggleArraySorting = useCallback((arrayPath: NumericPath) => {
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

    const syncToCounterpart = useCallback((nodePath: IdBasedPath, viewerId: string) => {
      console.log('[syncToCounterpart] 🎯 Input:', nodePath, 'from', viewerId);
      
      // Normalize the path to remove viewer-specific prefix
      let normalizedPath = nodePath.replace(/^root_(left|right)_/, '');
      console.log('[syncToCounterpart] 📍 Normalized path:', normalizedPath);
      
      // Check if this is an ID-based path
      const isIdPath = hasIdBasedSegments(createIdBasedPath(normalizedPath));
      
      if (isIdPath && jsonData && idKeysUsed) {
        console.log('[syncToCounterpart] 🔍 ID-based path detected - using path resolution');
        // Convert ID-based path to numeric paths for both viewers
        const result = resolveIdBasedPathToNumeric(
          normalizedPath,
          jsonData,
          idKeysUsed
        );
        
        if (result.leftPath && result.rightPath) {
          console.log('[syncToCounterpart] ✅ Resolved paths - LEFT:', result.leftPath, 'RIGHT:', result.rightPath);
          // Use dual path highlighting - both source and counterpart should be highlighted
          goToDiffWithPaths(result.leftPath, result.rightPath);
        } else {
          console.log('[syncToCounterpart] ⚠️ Could not resolve ID paths, using simple sync');
          goToDiff(normalizedPath);
        }
      } else {
        console.log('[syncToCounterpart] 📍 Numeric path - using simple navigation');
        // For numeric paths, navigate to same path in both viewers
        goToDiff(normalizedPath);
      }
    }, [jsonData, idKeysUsed, goToDiffWithPaths, goToDiff]);

    // Removed ref update effect as manual expansion no longer triggers sync

    // Helper function to disable sync scrolling
    const disableSyncScrolling = useCallback(() => {
      const syncContainers = document.querySelectorAll('[data-sync-group="json-viewers"]');
      console.log('[Context] 🔧 Disabling sync on', syncContainers.length, 'containers');
      syncContainers.forEach(container => {
        container.classList.add('temp-disable-sync');
      });
      return syncContainers;
    }, []);

    // Helper function to re-enable sync scrolling
    const enableSyncScrolling = useCallback(() => {
      const syncContainers = document.querySelectorAll('[data-sync-group="json-viewers"]');
      console.log('[Context] 🔄 Re-enabling sync on', syncContainers.length, 'containers');
      syncContainers.forEach(container => {
        container.classList.remove('temp-disable-sync');
      });
    }, []);

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
        if (diff.idBasedPath && isPathIgnoredByPattern(diff.idBasedPath)) {
          ignored.add(diff.idBasedPath);
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
        goToDiffWithPaths,
        highlightPath,
        setHighlightPath: memoizedSetHighlightPath,
        persistentHighlightPaths,
        setPersistentHighlightPaths,
        clearAllIgnoredDiffs,
        diffResults,
        highlightingProcessor, // New: PathConverter-based highlighting processor
        viewerId1, 
        viewerId2,
        toggleShowDiffsOnly,
        // Context menu actions
        forceSortedArrays,
        toggleArraySorting,
        syncToCounterpart,
        // Manual sync control functions
        disableSyncScrolling,
        enableSyncScrolling,
        // Test function
        testViewportDetection,
        // PathConverter context data
        jsonData,
        idKeysUsed,
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
        goToDiffWithPaths,
        highlightPath,
        memoizedSetHighlightPath,
        persistentHighlightPaths,
        clearAllIgnoredDiffs,
        diffResults,
        highlightingProcessor, // New dependency
        viewerId1,
        viewerId2,
        toggleShowDiffsOnly,
        forceSortedArrays,
        toggleArraySorting,
        syncToCounterpart,
        disableSyncScrolling,
        enableSyncScrolling,
        testViewportDetection,
        effectiveIgnoredDiffs,
        jsonData,
        idKeysUsed,
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
