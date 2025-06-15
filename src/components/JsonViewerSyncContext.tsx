import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { DiffResult } from '../jsonCompare';

interface JsonViewerSyncContextProps {
  viewMode: 'text' | 'tree';
  showDiffsOnly: boolean;
  showColoredDiff: boolean;
  expandedPaths: Set<string>;
  ignoredDiffs: Set<string>; // New: Tracks paths of diffs that should be ignored
  setViewMode: (mode: 'text' | 'tree') => void;
  setShowDiffsOnly: (show: boolean) => void;
  setShowColoredDiff: (show: boolean) => void;
  toggleExpand: (path: string) => void;
  setExpandAll: (expand: boolean) => void;
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  toggleIgnoreDiff: (diffPath: string) => void; // New: Toggle ignoring a specific diff
  goToDiff: (diffPath: string) => void; // New: Navigate to a specific diff
  highlightPath: string | null; // New: Path to temporarily highlight
  setHighlightPath: (path: string | null) => void; // New: Set the highlighted path
  clearAllIgnoredDiffs: () => void; // New: Clear all ignored differences
}

const JsonViewerSyncContext = createContext<JsonViewerSyncContextProps>({
  viewMode: 'tree',
  showDiffsOnly: true,
  showColoredDiff: true,
  expandedPaths: new Set<string>(),
  ignoredDiffs: new Set<string>(),
  setViewMode: () => {},
  setShowDiffsOnly: () => {},
  setShowColoredDiff: () => {},
  toggleExpand: () => {},
  setExpandAll: () => {},
  syncEnabled: true,
  setSyncEnabled: () => {},
  toggleIgnoreDiff: () => {},
  goToDiff: () => {},
  highlightPath: null,
  setHighlightPath: () => {},
  clearAllIgnoredDiffs: () => {}
});

interface JsonViewerSyncProviderProps {
  children: ReactNode;
  initialViewMode?: 'text' | 'tree';
  initialShowDiffsOnly?: boolean;
  initialSyncEnabled?: boolean;
  diffResults?: DiffResult[];
}

export const JsonViewerSyncProvider: React.FC<JsonViewerSyncProviderProps> = ({
  children,
  initialViewMode = 'tree',
  initialShowDiffsOnly = true,
  initialSyncEnabled = true,
  diffResults = []
}) => {
  const [viewMode, _setViewMode] = useState<'text' | 'tree'>(initialViewMode);
  const [showDiffsOnly, _setShowDiffsOnly] = useState<boolean>(initialShowDiffsOnly);
  const [showColoredDiff, _setShowColoredDiff] = useState<boolean>(true); // Default to show diff highlighting
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set<string>());
  const [syncEnabled, setSyncEnabled] = useState<boolean>(initialSyncEnabled);
  const [ignoredDiffs, setIgnoredDiffs] = useState<Set<string>>(new Set<string>());
  const [highlightPath, setHighlightPath] = useState<string | null>(null);
  
  // Wrap the state setters to respect the sync toggle
  const setViewMode = useCallback((mode: 'text' | 'tree') => {
    // Always apply the change regardless of sync status
    _setViewMode(mode);
  }, []);
  
  const setShowDiffsOnly = useCallback((show: boolean) => {
    // Always apply the change regardless of sync status
    _setShowDiffsOnly(show);
  }, []);
  
  const setShowColoredDiff = useCallback((show: boolean) => {
    // Always apply the change regardless of sync status
    _setShowColoredDiff(show);
  }, []);

  // Expand all paths mentioned in diffResults by default
  useEffect(() => {
    if (diffResults.length > 0) {
      const pathsToExpand = new Set<string>();
      
      diffResults.forEach(diff => {
        const pathParts = diff.path.split(/\.|\[|\]/g).filter(Boolean);
        let currentPath = '';
        
        // Add all parent paths to ensure the full path to the diff is expanded
        pathParts.forEach(part => {
          if (currentPath) {
            currentPath = isNaN(Number(part)) ? `${currentPath}.${part}` : `${currentPath}[${part}]`;
          } else {
            currentPath = part;
          }
          pathsToExpand.add(currentPath);
        });
      });
      
      setExpandedPaths(pathsToExpand);
    }
  }, [diffResults]);

  const toggleExpand = useCallback((path: string) => {
    // Get the actual path without the viewerId prefix
    // We use the id from the path to map between viewers
    let normalizedPath = path;
    const prefixMatch = /^root_(.+?)_(.+)$/.exec(path);
    
    if (prefixMatch) {
      // We have a prefixed path, extract the real path part
      // Extract the actual path part (without the viewer ID)
      const actualPath = prefixMatch[2];
      
      // This maintains the specific path for this node but makes it work
      // with other viewers when actions are synchronized
      normalizedPath = actualPath;
    }
    
    setExpandedPaths(prev => {
      const newPaths = new Set(prev);
      
      // Handle the specific path for this viewer
      if (newPaths.has(path)) {
        newPaths.delete(path);
      } else {
        newPaths.add(path);
      }
      
      // Also handle other viewers with the same structure
      // For each viewer ID (viewer1, viewer2, etc) update their version of this path
      const viewerPrefixes = ['viewer1', 'viewer2'];
      viewerPrefixes.forEach(viewerId => {
        const correspondingPath = `root_${viewerId}_${normalizedPath}`;
        if (path !== correspondingPath) { // Don't duplicate the action on the same path
          if (newPaths.has(correspondingPath)) {
            newPaths.delete(correspondingPath);
          } else {
            newPaths.add(correspondingPath);
          }
        }
      });
      
      return newPaths;
    });
  }, []);

  const setExpandAll = useCallback((expand: boolean) => {
    if (expand) {
      // Expand everything - this would require knowledge of all possible paths
      // Just keeping current expanded paths for now
    } else {
      // Collapse everything except root level
      setExpandedPaths(new Set());
    }
  }, []);

  // Toggle ignoring a diff at a specific path
  const toggleIgnoreDiff = useCallback((diffPath: string) => {
    setIgnoredDiffs(prev => {
      const newIgnoredDiffs = new Set(prev);
      if (newIgnoredDiffs.has(diffPath)) {
        newIgnoredDiffs.delete(diffPath);
      } else {
        newIgnoredDiffs.add(diffPath);
      }
      return newIgnoredDiffs;
    });
  }, []);

  // Clear all ignored diffs
  const clearAllIgnoredDiffs = useCallback(() => {
    setIgnoredDiffs(new Set<string>());
  }, []);

  // Navigate to and highlight a specific diff
  const goToDiff = useCallback((diffPath: string) => {
    // Extract the path parts
    const pathParts = diffPath.split(/\.|\[|\]/g).filter(Boolean);
    let currentPath = '';
    
    // Expand all parent paths to ensure the path is visible
    pathParts.forEach(part => {
      if (currentPath) {
        currentPath = isNaN(Number(part)) ? `${currentPath}.${part}` : `${currentPath}[${part}]`;
      } else {
        currentPath = part;
      }
      
      // Add to expanded paths for each viewer
      const viewer1Path = `root_viewer1_${currentPath}`;
      const viewer2Path = `root_viewer2_${currentPath}`;
      
      setExpandedPaths(prev => {
        const newPaths = new Set(prev);
        newPaths.add(viewer1Path);
        newPaths.add(viewer2Path);
        return newPaths;
      });
    });
    
    // Set the highlight path (will be used by the tree view to flash this node)
    setHighlightPath(diffPath);
    
    // Clear the highlight after a delay
    setTimeout(() => {
      setHighlightPath(null);
    }, 2000); // Flash for 2 seconds
  }, []);

  return (
    <JsonViewerSyncContext.Provider
      value={{
        viewMode,
        showDiffsOnly,
        showColoredDiff,
        expandedPaths,
        ignoredDiffs,
        setViewMode,
        setShowDiffsOnly,
        setShowColoredDiff,
        toggleExpand,
        setExpandAll,
        syncEnabled,
        setSyncEnabled,
        toggleIgnoreDiff,
        clearAllIgnoredDiffs,
        goToDiff,
        highlightPath,
        setHighlightPath
      }}
    >
      {children}
    </JsonViewerSyncContext.Provider>
  );
};

export const useJsonViewerSync = () => useContext(JsonViewerSyncContext);
