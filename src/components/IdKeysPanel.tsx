import React, { useState } from 'react';
import type { IdKeyInfo } from '../utils/jsonCompare';
import { useJsonViewerSync } from './JsonViewerSyncContext';
import { validateAndCreateNumericPath, createViewerPath, validateAndCreateIdBasedPath, createArrayPatternPath } from '../utils/PathTypes';
import type { ViewerPath, IdBasedPath, NumericPath, ArrayPatternPath } from '../utils/PathTypes';
import { convertIdPathToIndexPath, convertArrayPatternToNumericPath, type PathConversionContext } from '../utils/PathConverter';
import './IdKeysPanel.css';

interface IdKeysPanelProps {
  idKeysUsed: IdKeyInfo[];
  jsonData: { left: any; right: any };
}

interface ConsolidatedIdKey {
  consolidatedPath: ArrayPatternPath;
  idKey: string;
  isComposite: boolean;
  occurrences: {
    originalPath: IdBasedPath;
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
    // IMPORTANT: Keep ALL [] markers to show complete array structure
    const consolidatedPathStr = originalPath.replace(/\[[^\]]*\]/g, '[]');
    const consolidatedKey = `${consolidatedPathStr}::${idKeyInfo.idKey}`;

    if (consolidatedMap.has(consolidatedKey)) {
      const existing = consolidatedMap.get(consolidatedKey)!;
      existing.occurrences.push({
        originalPath: validateAndCreateIdBasedPath(originalPath, 'IdKeysPanel.consolidateIdKeys.occurrence'),
        arraySize1: idKeyInfo.arraySize1,
        arraySize2: idKeyInfo.arraySize2
      });
    } else {
      consolidatedMap.set(consolidatedKey, {
        consolidatedPath: createArrayPatternPath(consolidatedPathStr),
        idKey: idKeyInfo.idKey,
        isComposite: idKeyInfo.isComposite,
        occurrences: [{
          originalPath: validateAndCreateIdBasedPath(originalPath, 'IdKeysPanel.consolidateIdKeys.original'),
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


  const handlePathClick = (pathToExpand: ArrayPatternPath) => {
    console.log(`[EXPANSION_DEBUG] 🎯 IdKeysPanel handlePathClick triggered:`);
    console.log(`[EXPANSION_DEBUG] 🎯 ArrayPatternPath: "${pathToExpand}"`);
    
    // Try with left data first, then right as fallback
    const contextLeft: PathConversionContext = {
      jsonData: jsonData.left,
      idKeysUsed: idKeysUsed || []
    };
    
    let numericPath: NumericPath;
    try {
      numericPath = convertArrayPatternToNumericPath(pathToExpand, contextLeft);
    } catch (leftError) {
      console.log(`[EXPANSION_DEBUG] 🎯 Left data conversion failed, trying right data:`, leftError);
      
      const contextRight: PathConversionContext = {
        jsonData: jsonData.right,
        idKeysUsed: idKeysUsed || []
      };
      
      try {
        numericPath = convertArrayPatternToNumericPath(pathToExpand, contextRight);
      } catch (rightError) {
        console.error(`[EXPANSION_DEBUG] 🎯 Failed to convert ArrayPatternPath with both left and right data:`, rightError);
        throw new Error(`Cannot convert ArrayPatternPath "${pathToExpand}": ${rightError.message}`);
      }
    }
    
    console.log(`[EXPANSION_DEBUG] 🎯 converted numericPath: "${numericPath}"`);
    
    // Set persistent highlight for border highlighting that persists until next navigation
    const highlights = new Set<ViewerPath>([
      createViewerPath('left', numericPath),
      createViewerPath('right', numericPath)
    ]);
    setPersistentHighlightPaths(highlights);
    console.log(`[EXPANSION_DEBUG] 🎯 set persistent highlights for both viewers`);
    
    // Call goToDiff which will handle expansion and highlighting
    console.log(`[EXPANSION_DEBUG] 🎯 calling goToDiff with: "${numericPath}"`);
    goToDiff(validateAndCreateIdBasedPath(numericPath, 'IdKeysPanel.handlePathClick.goToDiff'));
  };

  const handleOccurrenceClick = (originalPath: IdBasedPath) => {
    console.log(`[EXPANSION_DEBUG] 🎯 IdKeysPanel handleOccurrenceClick triggered:`);
    console.log(`[EXPANSION_DEBUG] 🎯 originalPath: "${originalPath}"`);
    
    let targetPath = originalPath as string;
    if (!targetPath.startsWith('root.')) {
      targetPath = `root.${targetPath}`;
    }
    
    // Try to convert using left data first, then right
    const contextLeft: PathConversionContext = {
      jsonData: jsonData.left,
      idKeysUsed: idKeysUsed || []
    };
    
    let numericPath: NumericPath;
    try {
      const converted = convertIdPathToIndexPath(
        validateAndCreateIdBasedPath(targetPath, 'IdKeysPanel.handleOccurrenceClick'),
        contextLeft,
        { preservePrefix: true }
      );
      if (!converted) {
        throw new Error('PathConverter returned null');
      }
      numericPath = converted;
      console.log(`[EXPANSION_DEBUG] 🎯 converted using left data: "${numericPath}"`);
    } catch (leftError) {
      console.log(`[EXPANSION_DEBUG] 🎯 Left data conversion failed, trying right data:`, leftError);
      
      const contextRight: PathConversionContext = {
        jsonData: jsonData.right,
        idKeysUsed: idKeysUsed || []
      };
      
      try {
        const converted = convertIdPathToIndexPath(
          validateAndCreateIdBasedPath(targetPath, 'IdKeysPanel.handleOccurrenceClick.right'),
          contextRight,
          { preservePrefix: true }
        );
        if (!converted) {
          throw new Error('PathConverter returned null');
        }
        numericPath = converted;
        console.log(`[EXPANSION_DEBUG] 🎯 converted using right data: "${numericPath}"`);
      } catch (rightError) {
        console.error(`[EXPANSION_DEBUG] 🎯 Failed to convert occurrence path with both left and right data:`, rightError);
        throw new Error(`Cannot convert occurrence path "${originalPath}": ${rightError.message}`);
      }
    }
    
    // Set persistent highlight for border highlighting that persists until next navigation
    const highlights = new Set<ViewerPath>([
      createViewerPath('left', numericPath),
      createViewerPath('right', numericPath)
    ]);
    setPersistentHighlightPaths(highlights);
    console.log(`[EXPANSION_DEBUG] 🎯 set persistent highlights for both viewers`);
    
    // Call goToDiff which will handle expansion and highlighting
    console.log(`[EXPANSION_DEBUG] 🎯 calling goToDiff with: "${numericPath}"`);
    goToDiff(validateAndCreateIdBasedPath(numericPath, 'IdKeysPanel.handleOccurrenceClick.goToDiff'));
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
