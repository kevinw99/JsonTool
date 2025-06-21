import React from 'react';
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
  const { goToDiff } = useJsonViewerSync();
  const consolidatedIdKeys = consolidateIdKeys(idKeysUsed || []);

  const buildNumericPath = (displayPath: string): string => {
    console.log('[IdKeysPanel] 🔍 Building numeric path for display path:', displayPath);
    
    // Remove the trailing [] to get the path to the array container
    let targetPath = displayPath;
    if (targetPath.endsWith('[]')) {
      targetPath = targetPath.slice(0, -2);
      console.log('[IdKeysPanel] 📝 Removed [] suffix, target path:', targetPath);
    }
    
    // Build the numeric path by inspecting the JSON structure
    const segments = targetPath.split('.');
    let currentData = jsonData;
    let numericPath = 'root';
    
    console.log('[IdKeysPanel] 🧩 Path segments to navigate:', segments);
    
    try {
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        console.log(`[IdKeysPanel] 🚶 Step ${i + 1}/${segments.length}: Processing segment "${segment}"`);
        
        if (currentData && typeof currentData === 'object' && segment in currentData) {
          numericPath += `.${segment}`;
          currentData = currentData[segment];
          
          console.log(`[IdKeysPanel] ✅ Found segment "${segment}", currentData type:`, Array.isArray(currentData) ? 'array' : typeof currentData);
          console.log(`[IdKeysPanel] 📍 Current numeric path: "${numericPath}"`);
          
          // If the current data is an array, navigate to the first element and continue
          // unless this is the last segment (target array)
          if (Array.isArray(currentData) && currentData.length > 0) {
            if (i < segments.length - 1) {
              // This is an intermediate array, pick first element and continue
              numericPath += '[0]';
              currentData = currentData[0];
              console.log(`[IdKeysPanel] 🔄 Intermediate array: added [0], continuing with first element`);
              console.log(`[IdKeysPanel] 📍 Updated numeric path: "${numericPath}"`);
            } else {
              // This is the target array, DON'T add [0] - we want to target the array itself
              console.log(`[IdKeysPanel] 🎯 Target array reached: stopping at array level (no [0] added)`);
            }
          }
        } else {
          // If we can't find the segment, break and use what we have
          console.log(`[IdKeysPanel] ❌ Segment "${segment}" not found in current data, using fallback`);
          numericPath += `.${segment}`;
          break;
        }
      }
      
    } catch (error) {
      console.warn('[IdKeysPanel] Error building numeric path:', error);
      // Fallback to simple path construction
      numericPath = `root.${targetPath}[0]`;
    }
    
    console.log('[IdKeysPanel] 🏁 Final numeric path:', numericPath);
    return numericPath;
  };

  const handlePathClick = (pathToExpand: string) => {
    console.log('[IdKeysPanel] 🖱️ Path clicked:', pathToExpand);
    console.log('[IdKeysPanel] 📊 Available JSON data:', jsonData ? 'Available' : 'Not available');
    
    const numericPath = buildNumericPath(pathToExpand);
    console.log('[IdKeysPanel] 🎯 Calling goToDiff with numeric path:', numericPath);
    
    // Call goToDiff which will handle expansion and highlighting
    goToDiff(numericPath);
  };

  if (!idKeysUsed || idKeysUsed.length === 0) {
    return (
      <div className="id-keys-panel">
        <div className="id-keys-header">
          <h3>Array ID Keys</h3>
        </div>
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
      <div className="id-keys-header">
        <h3>Array ID Keys</h3>
        <span className="id-keys-count">
          ({consolidatedIdKeys.length} unique, {idKeysUsed.length} total)
        </span>
      </div>
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
                  <details className="occurrences-details">
                    <summary>
                      ▶ Show all occurrences ({consolidatedIdKey.occurrences.length})
                    </summary>
                    <div className="occurrences-dropdown">
                      {consolidatedIdKey.occurrences.map((occurrence, occIndex) => (
                        <div key={occIndex} className="occurrence-item">
                          <code 
                            className="occurrence-path"
                            title={occurrence.originalPath.length > 60 ? occurrence.originalPath : undefined}
                          >
                            {occurrence.originalPath}
                          </code>
                          <span className="occurrence-sizes">
                            ({occurrence.arraySize1} ↔ {occurrence.arraySize2})
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
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
