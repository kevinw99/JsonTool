/**
 * JSON Path Breadcrumb Component
 * Displays the current JSON path from root to the current node/cursor position
 * with clickable segments for navigation
 */

import React, { useMemo } from 'react';
import { stripAllPrefixes } from '../utils/PathConverter';
import { createIdBasedPath } from '../utils/PathTypes';
import type { AnyPath } from '../utils/PathTypes';
import './JsonPathBreadcrumb.css';

// Utility function to create breadcrumb segments from out-of-view tree nodes
export const createBreadcrumbFromViewport = (
  outOfViewNodes: Array<{
    key: string;
    path: string;
    lineNumber: number;
    isArray: boolean;
    indentLevel: number;
  }>
): BreadcrumbSegment[] => {
  return outOfViewNodes.map(node => ({
    key: node.key,
    path: node.path,
    lineNumber: node.lineNumber,
    bracket: node.isArray ? '[' : '{',
    indentLevel: node.indentLevel
  }));
};

export interface PathSegment {
  key: string;
  path: string;
  isArray?: boolean;
  isIndex?: boolean;
  isArrayContainer?: boolean; // For array objects like "items": [
  lineNumber?: number;
  bracket?: string;
}

export interface BreadcrumbSegment {
  key: string;
  path: string;
  lineNumber: number;
  bracket: string; // '[' for arrays, '{' for objects
  indentLevel: number;
}

interface JsonPathBreadcrumbProps {
  currentPath?: string; // Made optional for dynamic mode
  currentLine?: number;
  onSegmentClick: (path: AnyPath) => void;
  mode?: 'tree' | 'text';
  outOfViewPaths?: string[];
  // New dynamic props
  segments?: BreadcrumbSegment[]; // Direct segment data
  isDynamic?: boolean; // Toggle between static and dynamic mode
}

export const JsonPathBreadcrumb: React.FC<JsonPathBreadcrumbProps> = ({
  currentPath,
  currentLine,
  onSegmentClick,
  segments,
  isDynamic = false
}) => {
  const pathSegments = useMemo(() => {
    // Dynamic mode: use provided segments
    if (isDynamic && segments) {
      return segments.map(segment => ({
        key: segment.key,
        path: segment.path,
        lineNumber: segment.lineNumber,
        bracket: segment.bracket,
        isArray: segment.bracket === '['
      }));
    }

    // Static mode: fallback to hardcoded segments
    if (!currentPath || currentPath === 'root' || currentPath === '') {
      return [];
    }

    // Use centralized prefix removal
    let normalizedPath = stripAllPrefixes(createIdBasedPath(currentPath));

    if (!normalizedPath) {
      return [];
    }

    // Static fallback - exact copy of tree lines with proper brackets and line numbers
    const staticSegments: PathSegment[] = [
      { key: 'boomerForecastV3Requests', path: 'boomerForecastV3Requests', isArray: true, lineNumber: 2, bracket: '[' },
      { key: 'parameters', path: 'boomerForecastV3Requests[0].parameters', isArray: false, lineNumber: 4, bracket: '{' },
      { key: 'accountParams', path: 'boomerForecastV3Requests[0].parameters.accountParams', isArray: true, lineNumber: 5, bracket: '[' },
      { key: 'contributions', path: 'boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions', isArray: false, lineNumber: 7, bracket: '{' }
    ];

    return staticSegments;
  }, [currentPath, segments, isDynamic]);

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
            className="breadcrumb-segment-line"
            onClick={() => onSegmentClick(createIdBasedPath(segment.path))}
            title={`Navigate to ${segment.path}`}
          >
            {/* Line number (like tree view gutter) */}
            <span className="breadcrumb-line-number">{segment.lineNumber}</span>
            
            {/* Content with proper indentation */}
            <div className="breadcrumb-content" style={{ 
              '--indent-level': isDynamic && segments ? segments[index]?.indentLevel || 0 : index 
            } as React.CSSProperties}>
              <span className="breadcrumb-key">{segment.key}:</span>
              <span className="breadcrumb-bracket">{segment.bracket}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};