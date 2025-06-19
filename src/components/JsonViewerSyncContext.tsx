import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { DiffResult } from '../utils/jsonCompare'; 

export interface JsonViewerSyncContextProps { // Exporting the interface
  viewMode: 'text' | 'tree';
  showDiffsOnly: boolean;
  showColoredDiff: boolean;
  expandedPaths: Set<string>; // Stores generic numeric paths (e.g., "root.some.array[0]")
  ignoredDiffs: Set<string>; 
  setViewMode: (mode: 'text' | 'tree') => void;
  setShowDiffsOnly: (show: boolean) => void;
  setShowColoredDiff: (show: boolean) => void;
  toggleExpand: (genericPath: string) => void; // Path is generic numeric path
  setExpandAll: (expand: boolean) => void;
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  toggleIgnoreDiff: (diffPath: string) => void; 
  goToDiff: (diffPath: string) => void; 
  highlightPath: string | null;
  setHighlightPath: (path: string | null | ((prevState: string | null) => string | null)) => void;
  clearAllIgnoredDiffs: () => void;
  diffResults: DiffResult[]; 
  viewerId1: string; // Still needed for root path construction if JsonNode needs it initially, though generic paths are preferred
  viewerId2: string; 
  toggleShowDiffsOnly: () => void; 
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
    const [highlightPath, setHighlightPathState] = useState<string | null>(null);

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
      // console.log(`[JsonViewerSyncContext goToDiff] CALLED with NUMERIC path: \"${numericPathToExpand}\"`);
      
      // Reset highlight to re-trigger the effect in JsonNode, even for the same path.
      setHighlightPathState(null);

      // Use a timeout to allow the null state to propagate before setting the new path.
      // This ensures the `isHighlighted && !prevIsHighlighted` condition in JsonNode's useEffect fires correctly.
      setTimeout(() => {
        setHighlightPathState(numericPathToExpand); // highlightPath is generic numeric

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

          const ancestorGenericPaths: string[] = [];
          let currentAncestorPath = '';
          // Iterate up to segments.length - 1 to get only strict ancestors for expansion.
          // The final node itself will be handled by JsonNode's highlight + auto-expand effect if it's an object/array.
          for (let i = 0; i < segments.length - 1; i++) { 
            const segment = segments[i];
            if (currentAncestorPath === '') {
              currentAncestorPath = segment;
            } else {
              if (segment.startsWith('[') && segment.endsWith(']')) {
                currentAncestorPath += segment; 
              } else {
                currentAncestorPath += `.${segment}`;
              }
            }
            ancestorGenericPaths.push(currentAncestorPath);
          }
          
          // console.log(`[JsonViewerSyncContext goToDiff] GENERIC ancestor paths to expand (derived from \"${numericPathToExpand}\"):`, ancestorGenericPaths);

          ancestorGenericPaths.forEach(genericAncestor => {
            if (genericAncestor) { 
              newExpandedPaths.add(genericAncestor);
            }
          });
          
          // console.log(`[JsonViewerSyncContext goToDiff] Setting expandedPaths to:`, Array.from(newExpandedPaths));
          return newExpandedPaths;
        });
      }, 50); // A small delay to ensure re-triggering.

    }, [setHighlightPathState]); // Dependencies simplified

    const toggleShowDiffsOnly = useCallback(() => {
        setShowDiffsOnlyState(prev => !prev);
    }, []);

    return (
        <JsonViewerSyncContext.Provider value={{
            viewMode,
            showDiffsOnly,
            showColoredDiff,
            expandedPaths,
            ignoredDiffs,
            setViewMode: memoizedSetViewMode,
            setShowDiffsOnly: setShowDiffsOnlyState, 
            setShowColoredDiff: memoizedSetShowColoredDiff,
            toggleExpand,
            setExpandAll,
            syncEnabled,
            setSyncEnabled,
            toggleIgnoreDiff,
            goToDiff,
            highlightPath,
            setHighlightPath: memoizedSetHighlightPath,
            clearAllIgnoredDiffs,
            diffResults,
            viewerId1, 
            viewerId2,
            toggleShowDiffsOnly,
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
