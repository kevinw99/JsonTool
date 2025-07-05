import React from 'react';
import type { DiffResult } from '../utils/jsonCompare';
import './JsonDiffViewer.css';

interface JsonDiffViewerProps {
  json: any;
  diffResults: DiffResult[];
  isOriginal?: boolean;
  height?: number | string;
}

export const JsonDiffViewer: React.FC<JsonDiffViewerProps> = ({ 
  json, 
  diffResults, 
  isOriginal = true, 
  height = 400 
}) => {
  // Prepare a map of paths that have changes for quick lookup
  const diffMap: Record<string, { type: string, changed: boolean }> = {};
  
  diffResults.forEach(diff => {
    // For each diff, mark the path and all its parent paths
    const pathParts = diff.idBasedPath
      .replace(/\[(\d+)\]/g, '.$1') // Convert array notation to dot notation
      .split('.');
    
    let currentPath = '';
    pathParts.forEach(part => {
      currentPath = currentPath ? `${currentPath}.${part}` : part;
      
      // If this path is directly affected by the diff
      if (currentPath === diff.idBasedPath.replace(/\[(\d+)\]/g, '.$1')) {
        diffMap[currentPath] = { 
          type: diff.type,
          changed: true
        };
      } else {
        // If this is a parent path, mark as a parent of a change
        if (!diffMap[currentPath]) {
          diffMap[currentPath] = { 
            type: 'parent',
            changed: false
          };
        }
      }
    });
  });

  // Function to render JSON as a string with HTML spans for highlighting
  const renderJsonWithHighlights = () => {
    // Convert JSON to string with indentation
    const jsonStr = JSON.stringify(json, null, 2);
    const lines = jsonStr.split('\n');
    
    // Process each line
    return lines.map((line, index) => {
      // Check if this line contains a path that has diff
      let classNames = '';
      const lineWithoutQuotes = line.replace(/["']/g, '');
      
      // Try to extract the path from the line
      const keyMatch = lineWithoutQuotes.match(/^\s*([^:]+):/);
      if (keyMatch) {
        const key = keyMatch[1].trim();
        
        // Track if we found a diff for this line
        let found = false;
        
        // Check if this line contains a diff path
        Object.keys(diffMap).forEach(path => {
          const pathEnd = path.split('.').pop() || '';
          
          if (pathEnd === key || pathEnd.includes(key)) {
            const diffInfo = diffMap[path];
            
            if (diffInfo.type === 'added' && !isOriginal) {
              classNames = 'json-added';
              found = true;
            } else if (diffInfo.type === 'removed' && isOriginal) {
              classNames = 'json-removed';
              found = true;
            } else if (diffInfo.type === 'changed') {
              classNames = 'json-changed';
              found = true;
            }
          }
        });
        
        // If no direct match was found, check for parent paths
        if (!found) {
          Object.keys(diffMap).forEach(path => {
            if (diffMap[path].type === 'parent') {
              // More complex check would be needed for nested structures
              // This is a simplified version
            }
          });
        }
      }
      
      // Check for values in the diff on this line
      if (!classNames) {
        diffResults.forEach(diff => {
          if (diff.type === 'changed') {
            const oldValueStr = JSON.stringify(diff.value1);
            const newValueStr = JSON.stringify(diff.value2);
            
            if (line.includes(isOriginal ? oldValueStr : newValueStr)) {
              classNames = 'json-changed-value';
            }
          } else if (diff.type === 'added' && !isOriginal) {
            const newValueStr = JSON.stringify(diff.value2);
            if (line.includes(newValueStr)) {
              classNames = 'json-added-value';
            }
          } else if (diff.type === 'removed' && isOriginal) {
            const oldValueStr = JSON.stringify(diff.value1);
            if (line.includes(oldValueStr)) {
              classNames = 'json-removed-value';
            }
          }
        });
      }
      
      return (
        <div key={index} className={`json-line ${classNames}`}>
          {line}
        </div>
      );
    });
  };

  return (
    <div 
      className="json-diff-viewer"
      style={{ height }}
    >
      <div className="diff-header">
        {isOriginal ? 'Original' : 'Modified'} JSON 
        {isOriginal ? ' (Removals in Red)' : ' (Additions in Green)'}
      </div>
      <pre className="json-diff-content">
        {renderJsonWithHighlights()}
      </pre>
    </div>
  );
};
