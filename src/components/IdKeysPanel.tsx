import React, { useState } from 'react';
import type { IdKeyInfo } from '../utils/jsonCompare';
import { useJsonViewerSync } from './JsonViewerSyncContext';
import './IdKeysPanel.css';

interface IdKeysPanelProps {
  idKeysUsed: IdKeyInfo[];
  jsonData: any;
}

interface ConsolidatedIdKey {
  consolidatedPath: string;
  idKey: string;
  isComposite: boolean;
  occurrences: {
    originalPath: string;
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

    if (consolidatedMap.has(consolidatedKey)) {
      const existing = consolidatedMap.get(consolidatedKey)!;
      existing.occurrences.push({
        originalPath: originalPath, // Use the path without "root." prefix
        arraySize1: idKeyInfo.arraySize1,
        arraySize2: idKeyInfo.arraySize2
      });
    } else {
      consolidatedMap.set(consolidatedKey, {
        consolidatedPath,
        idKey: idKeyInfo.idKey,
        isComposite: idKeyInfo.isComposite,
        occurrences: [{
          originalPath: originalPath, // Use the path without "root." prefix
          arraySize1: idKeyInfo.arraySize1,
          arraySize2: idKeyInfo.arraySize2
        }]
      });
    }
  });

  return Array.from(consolidatedMap.values()).sort((a, b) => 
    a.consolidatedPath.localeCompare(b.consolidatedPath)
  );
};

export const IdKeysPanel: React.FC<IdKeysPanelProps> = ({ idKeysUsed, jsonData }) => {
  const { goToDiff, setPersistentHighlightPath } = useJsonViewerSync();
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

  const buildNumericPath = (displayPath: string): string => {
    
    // Remove the trailing [] to get the path to the array container
    let targetPath = displayPath;
    if (targetPath.endsWith('[]')) {
      targetPath = targetPath.slice(0, -2);
    }
    
    // Build the numeric path by inspecting the JSON structure
    const segments = targetPath.split('.');
    let currentData = jsonData;
    let numericPath = 'root';
    
    
    try {
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        if (currentData && typeof currentData === 'object' && segment in currentData) {
          numericPath += `.${segment}`;
          currentData = currentData[segment];
          
          
          // If the current data is an array, navigate to the first element and continue
          // unless this is the last segment (target array)
          if (Array.isArray(currentData) && currentData.length > 0) {
            if (i < segments.length - 1) {
              // This is an intermediate array, pick first element and continue
              numericPath += '[0]';
              currentData = currentData[0];
            } else {
              // This is the target array, DON'T add [0] - we want to target the array itself
            }
          }
        } else {
          // If we can't find the segment, break and use what we have
          numericPath += `.${segment}`;
          break;
        }
      }
      
    } catch (error) {
      console.warn('[IdKeysPanel] Error building numeric path:', error);
      // Fallback to simple path construction
      numericPath = `root.${targetPath}[0]`;
    }
    
    return numericPath;
  };

  const handlePathClick = (pathToExpand: string) => {
    
    const numericPath = buildNumericPath(pathToExpand);
    
    // Set persistent highlight for border highlighting that persists until next navigation
    setPersistentHighlightPath(numericPath);
    
    // Call goToDiff which will handle expansion and highlighting
    goToDiff(numericPath);
  };

  const handleOccurrenceClick = (originalPath: string) => {
    
    // For specific occurrences, we need to build the path differently
    // The originalPath already contains the specific array index
    let numericPath = originalPath;
    
    // Add root prefix if missing
    if (!numericPath.startsWith('root.')) {
      numericPath = `root.${numericPath}`;
    }
    
    
    // Set persistent highlight for border highlighting that persists until next navigation
    setPersistentHighlightPath(numericPath);
    
    // Call goToDiff which will handle expansion and highlighting
    goToDiff(numericPath);
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
                  title={consolidatedIdKey.consolidatedPath.length > 60 ? consolidatedIdKey.consolidatedPath : undefined}
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
                              title={occurrence.originalPath.length > 60 ? occurrence.originalPath : undefined}
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
