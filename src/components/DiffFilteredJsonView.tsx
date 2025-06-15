import React from 'react';
import './DiffFilteredJsonView.css';
import type { DiffResult } from '../jsonCompare';

interface DiffFilteredJsonViewProps {
  originalJson: any;
  diffResults: DiffResult[];
  height?: number | string;
}

// Helper function to filter JSON to only include differences
export const filterJsonByDiffs = (json: any, diffResults: DiffResult[], parentPath = ''): any => {
  // Create a map of all paths that have differences
  const diffPaths = new Set<string>();
  diffResults.forEach(diff => {
    const normalizedPath = diff.path.replace(/\[(\d+)\]/g, '.$1'); // Convert array notation to dot notation
    diffPaths.add(normalizedPath);
    
    // Add parent paths
    let parts = normalizedPath.split('.');
    while (parts.length > 1) {
      parts.pop();
      diffPaths.add(parts.join('.'));
    }
  });
  
  if (json === null || typeof json !== 'object') {
    return json;
  }
  
  if (Array.isArray(json)) {
    const filteredArray = json.map((item, index) => {
      const currentPath = parentPath ? `${parentPath}.${index}` : `${index}`;
      
      if (diffPaths.has(currentPath)) {
        return filterJsonByDiffs(item, diffResults, currentPath);
      }
      
      // Check if any children of this item are in diffPaths
      const hasChildrenInDiff = Array.from(diffPaths).some(path => 
        path.startsWith(`${currentPath}.`)
      );
      
      if (hasChildrenInDiff) {
        return filterJsonByDiffs(item, diffResults, currentPath);
      }
      
      return undefined;
    }).filter(item => item !== undefined);
    
    // Only return non-empty arrays
    return filteredArray.length > 0 ? filteredArray : undefined;
  }
  
  const result: Record<string, any> = {};
  let hasKeys = false;
  
  Object.entries(json).forEach(([key, value]) => {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    
    if (diffPaths.has(currentPath)) {
      result[key] = filterJsonByDiffs(value, diffResults, currentPath);
      hasKeys = true;
    } else {
      // Check if any children of this value are in diffPaths
      const hasChildrenInDiff = Array.from(diffPaths).some(path => 
        path.startsWith(`${currentPath}.`)
      );
      
      if (hasChildrenInDiff) {
        result[key] = filterJsonByDiffs(value, diffResults, currentPath);
        hasKeys = true;
      }
    }
  });
  
  return hasKeys ? result : undefined;
};

export const DiffFilteredJsonView: React.FC<DiffFilteredJsonViewProps> = ({
  originalJson,
  diffResults,
  height = 400
}) => {
  // Create a map of all paths that have differences
  const diffPaths = new Set<string>();
  diffResults.forEach(diff => {
    const normalizedPath = diff.path.replace(/\[(\d+)\]/g, '.$1'); // Convert array notation to dot notation
    diffPaths.add(normalizedPath);
    
    // Add parent paths
    let parts = normalizedPath.split('.');
    while (parts.length > 1) {
      parts.pop();
      diffPaths.add(parts.join('.'));
    }
  });
  
  // Filter JSON to include only differences and their parent nodes
  const filterJson = (json: any, parentPath = ''): any => {
    if (json === null || typeof json !== 'object') {
      return json;
    }
    
    if (Array.isArray(json)) {
      const filteredArray = json.map((item, index) => {
        const currentPath = parentPath ? `${parentPath}.${index}` : `${index}`;
        
        if (diffPaths.has(currentPath)) {
          return filterJson(item, currentPath);
        }
        
        // Check if any children of this item are in diffPaths
        const hasChildrenInDiff = Array.from(diffPaths).some(path => 
          path.startsWith(`${currentPath}.`)
        );
        
        if (hasChildrenInDiff) {
          return filterJson(item, currentPath);
        }
        
        return undefined;
      }).filter(item => item !== undefined);
      
      // Only return non-empty arrays
      return filteredArray.length > 0 ? filteredArray : undefined;
    }
    
    const result: Record<string, any> = {};
    let hasKeys = false;
    
    Object.entries(json).forEach(([key, value]) => {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      
      if (diffPaths.has(currentPath)) {
        result[key] = filterJson(value, currentPath);
        hasKeys = true;
      } else {
        // Check if any children of this value are in diffPaths
        const hasChildrenInDiff = Array.from(diffPaths).some(path => 
          path.startsWith(`${currentPath}.`)
        );
        
        if (hasChildrenInDiff) {
          result[key] = filterJson(value, currentPath);
          hasKeys = true;
        }
      }
    });
    
    return hasKeys ? result : undefined;
  };
  
  const filteredJson = filterJsonByDiffs(originalJson, diffResults);
  
  // Check if filtered result is empty
  const isEmpty = filteredJson === undefined || 
    (typeof filteredJson === 'object' && 
     filteredJson !== null && 
     Object.keys(filteredJson).length === 0);
  
  return (
    <div className="diff-filtered-json-view" style={{ height }}>
      {isEmpty ? (
        <div className="no-differences-message">
          No differences found in this JSON.
        </div>
      ) : (
        <pre className="filtered-json-content">
          {JSON.stringify(filteredJson, null, 2)}
        </pre>
      )}
    </div>
  );
};
