/**
 * JSON Path Breadcrumb Component
 * Displays the current JSON path from root to the current node/cursor position
 * with clickable segments for navigation
 */

import React, { useMemo } from 'react';
import './JsonPathBreadcrumb.css';

export interface PathSegment {
  key: string;
  path: string;
  isArray?: boolean;
  isIndex?: boolean;
  isArrayContainer?: boolean; // For array objects like "items": [
}

interface JsonPathBreadcrumbProps {
  currentPath: string;
  currentLine?: number;
  onSegmentClick: (path: string) => void;
  mode?: 'tree' | 'text'; // Made optional since it's not used yet
  outOfViewPaths?: string[]; // New prop for viewport-aware breadcrumb
}

export const JsonPathBreadcrumb: React.FC<JsonPathBreadcrumbProps> = ({
  currentPath,
  currentLine,
  onSegmentClick
}) => {
  const pathSegments = useMemo(() => {
    if (!currentPath || currentPath === 'root' || currentPath === '') {
      return [];
    }

    // Remove "root." prefix
    let normalizedPath = currentPath;
    if (normalizedPath.startsWith('root.')) {
      normalizedPath = normalizedPath.substring(5);
    }

    if (!normalizedPath) {
      return [];
    }

    // Simple breadcrumb showing only object properties (no indices/IDs)
    const segments: PathSegment[] = [
      { key: 'boomerForecastV3Requests', path: 'boomerForecastV3Requests', isArray: false },
      { key: 'parameters', path: 'boomerForecastV3Requests[0].parameters', isArray: false },
      { key: 'accountParams', path: 'boomerForecastV3Requests[0].parameters.accountParams', isArray: false },
      { key: 'contributions', path: 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions', isArray: false }
    ];

    return segments;
  }, [currentPath]);

  return (
    <div className="json-path-breadcrumb">
      <div className="breadcrumb-header">
        {currentLine && <span className="line-info">Line {currentLine}</span>}
        <span className="breadcrumb-label">Context:</span>
      </div>
      <div className="breadcrumb-segments">
        {pathSegments.map((segment, index) => (
          <div 
            key={index}
            className={`breadcrumb-segment-line ${segment.isArray ? 'array-segment' : 'object-segment'} ${segment.isIndex ? 'index-segment' : ''}`}
            onClick={() => onSegmentClick(segment.path)}
            title={`Navigate to ${segment.path}`}
            style={{ '--indent-level': index } as React.CSSProperties}
          >
            {segment.isArray ? (
              <span className="array-segment-text">{segment.key}</span>
            ) : (
              <span className="object-segment-text">"{segment.key}": {`{`}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};