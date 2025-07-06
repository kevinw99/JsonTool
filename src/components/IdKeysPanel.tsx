import React, { useState } from 'react';
import type { IdKeyInfo } from '../utils/jsonCompare';
import { useJsonViewerSync } from './JsonViewerSyncContext';
import { validateAndCreateNumericPath, createViewerPath, validateAndCreateIdBasedPath, validateAndCreateArrayPatternPath } from '../utils/PathTypes';
import type { ViewerPath, ArrayPatternPath, NumericPath } from '../utils/PathTypes';
import './IdKeysPanel.css';

interface IdKeysPanelProps {
  idKeysUsed: IdKeyInfo[];
}

interface ConsolidatedIdKey {
  consolidatedPath: ArrayPatternPath;
  idKey: string;
  isComposite: boolean;
  occurrences: {
    originalPath: NumericPath;
    arraySize1: number;
    arraySize2: number;
  }[];
}

// Function to consolidate idKeys by collapsing parent arrays with the same idKey
export const consolidateIdKeys = (idKeysUsed: IdKeyInfo[]): ConsolidatedIdKey[] => {
  const consolidatedMap = new Map<string, ConsolidatedIdKey>();

  idKeysUsed.forEach(idKeyInfo => {
    let originalPath = idKeyInfo.arrayPath;
    
    // Safety check for undefined path
    if (!originalPath || typeof originalPath !== 'string') {
      return;
    }
    
    // Remove "root." prefix if present
    if (originalPath.startsWith('root.')) {
      originalPath = originalPath.substring(5);
    }
    
    // Replace all specific array indices with [] to generalize the path
    // This handles cases like [0], [1], [636106], etc.
    let consolidatedPath = originalPath.replace(/\[[^\]]*\]/g, '[]');
    
    // For ID key tracking, we want to show the path to the array being compared
    // The array path should be clean: remove [] from parent navigation elements
    // and only keep [] at the end to indicate it's an array
    
    // Split by dots to handle each segment
    const segments = consolidatedPath.split('.');
    const cleanSegments = segments.map(segment => {
      // Remove [] from middle segments, but keep for the last segment if it's an array
      return segment.replace(/\[\]/g, '');
    });
    
    // If the original path contained arrays, add [] to the end to show it's an array
    if (originalPath.includes('[')) {
      const lastSegment = cleanSegments[cleanSegments.length - 1];
      if (!lastSegment.includes('[]')) {
        cleanSegments[cleanSegments.length - 1] = lastSegment + '[]';
      }
    }
    
    consolidatedPath = cleanSegments.join('.');
    
    const consolidatedKey = `${consolidatedPath}::${idKeyInfo.idKey}`;
    const consolidatedArrayPattern = validateAndCreateArrayPatternPath(consolidatedPath, 'consolidateIdKeys');
    
    // Don't validate as numeric path if it contains ID-based segments
    const originalNumericPath = originalPath.includes('[id=') 
      ? originalPath as NumericPath  // Cast without validation for ID-based paths
      : validateAndCreateNumericPath(originalPath, 'consolidateIdKeys.originalPath');

    if (consolidatedMap.has(consolidatedKey)) {
      const existing = consolidatedMap.get(consolidatedKey)!;
      existing.occurrences.push({
        originalPath: originalNumericPath,
        arraySize1: idKeyInfo.arraySize1,
        arraySize2: idKeyInfo.arraySize2
      });
    } else {
      consolidatedMap.set(consolidatedKey, {
        consolidatedPath: consolidatedArrayPattern,
        idKey: idKeyInfo.idKey,
        isComposite: idKeyInfo.isComposite,
        occurrences: [{
          originalPath: originalNumericPath,
          arraySize1: idKeyInfo.arraySize1,
          arraySize2: idKeyInfo.arraySize2
        }]
      });
    }
  });

  return Array.from(consolidatedMap.values()).sort((a, b) => 
    (a.consolidatedPath as string).localeCompare(b.consolidatedPath as string)
  );
};

export const IdKeysPanel: React.FC<IdKeysPanelProps> = ({ idKeysUsed }) => {
  const { goToDiff, setPersistentHighlightPaths } = useJsonViewerSync();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  const consolidatedIdKeys = consolidateIdKeys(idKeysUsed || []);

  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  /**
   * Convert ArrayPatternPath to NumericPath by using the goToDiff function
   * which handles ID-based path resolution
   * Example: "boomerForecastV3Requests.parameters.accountParams.contributions[]" 
   *       → ID-based path that goToDiff can resolve
   */
  const convertArrayPatternToIdBasedPath = (arrayPattern: ArrayPatternPath): IdBasedPath => {
    let targetPath = arrayPattern as string;
    
    // Remove the trailing [] to get the base path
    if (targetPath.endsWith('[]')) {
      targetPath = targetPath.slice(0, -2);
    }
    
    // Find a matching occurrence from the consolidated data
    const consolidated = consolidatedIdKeys.find(item => item.consolidatedPath === arrayPattern);
    if (consolidated && consolidated.occurrences.length > 0) {
      // Use the first occurrence's original path which may have ID-based segments
      let firstOccurrence = consolidated.occurrences[0].originalPath as string;
      
      // Ensure it has root prefix
      if (!firstOccurrence.startsWith('root.')) {
        firstOccurrence = `root.${firstOccurrence}`;
      }
      
      // Return as IdBasedPath without numeric validation since it may contain ID segments
      return validateAndCreateIdBasedPath(firstOccurrence, 'IdKeysPanel.convertArrayPatternToIdBasedPath');
    }
    
    // Fallback: construct a simple numeric path with [0] indices
    const segments = targetPath.split('.');
    let reconstructedPath = '';
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (i === 0) {
        reconstructedPath = segment;
      } else {
        reconstructedPath += `.${segment}`;
      }
      
      // Check if this segment should have an array index
      const pathSoFar = segments.slice(0, i + 1).join('.');
      const hasArrayAtThisLevel = idKeysUsed.some(item => {
        const itemPath = item.arrayPath.startsWith('root.') ? item.arrayPath.substring(5) : item.arrayPath;
        return itemPath.startsWith(pathSoFar) && 
               itemPath.length > pathSoFar.length && 
               itemPath[pathSoFar.length] === '[';
      });
      
      if (hasArrayAtThisLevel) {
        reconstructedPath += '[0]';
      }
    }
    
    // Add root prefix
    reconstructedPath = `root.${reconstructedPath}`;
    
    return validateAndCreateIdBasedPath(reconstructedPath, 'IdKeysPanel.convertArrayPatternToIdBasedPath');
  };

  const handlePathClick = (arrayPatternPath: ArrayPatternPath) => {
    // Convert to ID-based path which goToDiff can handle
    const idBasedPath = convertArrayPatternToIdBasedPath(arrayPatternPath);
    
    // Don't set persistent highlights here - let goToDiff handle it
    // since it will resolve the proper numeric paths for both viewers
    
    // Call goToDiff which will handle ID-based path resolution, expansion and highlighting
    goToDiff(idBasedPath);
  };

  const handleOccurrenceClick = (originalPath: NumericPath) => {
    // For specific occurrences, originalPath may contain ID-based segments
    let pathStr = originalPath as string;
    
    // Add root prefix if missing
    if (!pathStr.startsWith('root.')) {
      pathStr = `root.${pathStr}`;
    }
    
    // Create as IdBasedPath since it may contain ID segments
    const idBasedPath = validateAndCreateIdBasedPath(pathStr, 'IdKeysPanel.handleOccurrenceClick');
    
    // Don't set persistent highlights here - let goToDiff handle it
    // since it will resolve the proper numeric paths for both viewers
    
    // Call goToDiff which will handle ID-based path resolution, expansion and highlighting
    goToDiff(idBasedPath);
  };

  if (!idKeysUsed || idKeysUsed.length === 0) {
    return (
      <div className="id-keys-panel">
        <div className="id-keys-content">
          <div className="id-keys-empty">
            No arrays with ID keys found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="id-keys-panel">
      <div className="id-keys-content">
        {consolidatedIdKeys.map((consolidatedIdKey, index) => (
          <div key={index} className="id-key-item">
            <div className="id-key-main-row">
              <div className="id-key-number">
                {index + 1}.
              </div>
              <div className="id-key-path-section">
                <span className="path-label">Path:</span>
                <code 
                  className="path-value clickable"
                  title={(consolidatedIdKey.consolidatedPath as string).length > 60 ? consolidatedIdKey.consolidatedPath as string : undefined}
                  onClick={() => handlePathClick(consolidatedIdKey.consolidatedPath)}
                >
                  {consolidatedIdKey.consolidatedPath}
                </code>
              </div>
              <div className="id-key-field-section">
                <span className="key-label">ID Key:</span>
                <code className={`key-value ${consolidatedIdKey.isComposite ? 'composite' : 'simple'}`}>
                  {consolidatedIdKey.idKey}
                </code>
                {consolidatedIdKey.isComposite && (
                  <span className="composite-badge">COMPOSITE</span>
                )}
              </div>
              <div className="occurrences-section">
                {consolidatedIdKey.occurrences.length > 1 && (
                  <div className="occurrences-container">
                    <button 
                      className="show-occurrences-button"
                      onClick={() => toggleExpanded(index)}
                      aria-expanded={expandedItems.has(index)}
                    >
                      {expandedItems.has(index) ? '▼' : '▶'} 
                      {expandedItems.has(index) ? 'Hide' : 'Show'} all occurrences ({consolidatedIdKey.occurrences.length})
                    </button>
                    {expandedItems.has(index) && (
                      <div className="occurrences-dropdown">
                        {consolidatedIdKey.occurrences.map((occurrence, occIndex) => (
                          <div key={occIndex} className="occurrence-item">
                            <code 
                              className="occurrence-path clickable"
                              title={(occurrence.originalPath as string).length > 60 ? occurrence.originalPath as string : undefined}
                              onClick={() => handleOccurrenceClick(occurrence.originalPath)}
                            >
                              {occurrence.originalPath}
                            </code>
                            <span className="occurrence-sizes">
                              ({occurrence.arraySize1} ↔ {occurrence.arraySize2})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {consolidatedIdKey.occurrences.length === 1 && (
                  <span className="single-occurrence">
                    ({consolidatedIdKey.occurrences[0].arraySize1} ↔ {consolidatedIdKey.occurrences[0].arraySize2})
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
