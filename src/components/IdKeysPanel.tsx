import React from 'react';
import type { IdKeyInfo } from '../utils/jsonCompare';
import './IdKeysPanel.css';

interface IdKeysPanelProps {
  idKeysUsed: IdKeyInfo[];
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
const consolidateIdKeys = (idKeysUsed: IdKeyInfo[]): ConsolidatedIdKey[] => {
  const consolidatedMap = new Map<string, ConsolidatedIdKey>();

  idKeysUsed.forEach(idKeyInfo => {
    let originalPath = idKeyInfo.arrayPath;
    
    // Remove "root." prefix if present
    if (originalPath.startsWith('root.')) {
      originalPath = originalPath.substring(5);
    }
    
    // Find the last array with specific values - this is our target array
    const arrayMatches = Array.from(originalPath.matchAll(/\[[^\]]+\]/g));
    let targetArrayIndex = -1;
    
    // Find the last array that contains specific instance identifiers
    for (let i = arrayMatches.length - 1; i >= 0; i--) {
      const arrayValue = arrayMatches[i][0].slice(1, -1); // Remove [ and ]
      const hasSpecificValue = arrayValue.includes('::') || arrayValue.includes('=') || /^-?\d+$/.test(arrayValue);
      
      if (hasSpecificValue) {
        targetArrayIndex = arrayMatches[i].index!;
        break;
      }
    }
    
    let consolidatedPath;
    if (targetArrayIndex >= 0) {
      // Replace the target array's specific value with []
      const beforeTarget = originalPath.substring(0, targetArrayIndex);
      const afterTarget = originalPath.substring(targetArrayIndex);
      const arrayEnd = afterTarget.indexOf(']') + 1;
      const pathAfterArray = afterTarget.substring(arrayEnd);
      
      consolidatedPath = beforeTarget + '[]' + pathAfterArray;
    } else {
      // No specific array found, just remove root prefix
      consolidatedPath = originalPath;
    }
    
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

export const IdKeysPanel: React.FC<IdKeysPanelProps> = ({ idKeysUsed }) => {
  const consolidatedIdKeys = consolidateIdKeys(idKeysUsed || []);

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
              <div className="id-key-path-section">
                <span className="path-label">Path:</span>
                <code className="path-value">{consolidatedIdKey.consolidatedPath}</code>
              </div>
              <div className="id-key-field-section">
                <span className="key-label">ID Key:</span>
                <code className={`key-value ${consolidatedIdKey.isComposite ? 'composite' : 'simple'}`}>
                  {consolidatedIdKey.idKey}
                </code>
                {consolidatedIdKey.isComposite && (
                  <span className="composite-badge">composite</span>
                )}
              </div>
              <div className="occurrences-section">
                {consolidatedIdKey.occurrences.length > 1 && (
                  <details className="occurrences-details">
                    <summary>
                      Show all occurrences ({consolidatedIdKey.occurrences.length})
                    </summary>
                    <div className="occurrences-dropdown">
                      {consolidatedIdKey.occurrences.map((occurrence, occIndex) => (
                        <div key={occIndex} className="occurrence-item">
                          <code className="occurrence-path">{occurrence.originalPath}</code>
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
