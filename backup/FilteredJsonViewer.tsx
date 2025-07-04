import React from 'react';
import { JsonTreeView } from './JsonTreeView';
import { DiffFilteredJsonView, filterJsonByDiffs } from './DiffFilteredJsonView';
import type { DiffResult } from '../utils/jsonCompare';
import { useJsonViewerSync } from './JsonViewerSyncContext';
import './FilteredJsonViewer.css';

interface FilteredJsonViewerProps {
  json: any;
  diffResults: DiffResult[];
  height?: number | string;
  viewerId?: string;
}

export const FilteredJsonViewer: React.FC<FilteredJsonViewerProps> = ({ 
  json, 
  diffResults, 
  height = '100%',  // Default to 100% to fill parent
  viewerId = 'default'
}) => {
  const { 
    viewMode,
    showDiffsOnly
  } = useJsonViewerSync();

  return (
    <div className="filtered-json-viewer-container" style={{ height, width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      {/* Controls moved to ViewControls component */}
      
      <div className="filtered-json-viewer-content" style={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {viewMode === 'text' ? (
          showDiffsOnly ? (
            <DiffFilteredJsonView
              originalJson={json}
              diffResults={diffResults}
              jsonData={json}
              diffs={diffResults}
              viewerId={viewerId}
              expandedPaths={new Set()}
              setExpandedPaths={() => {}}
              highlightPath={''}   
              renderPath=""
              idKey=""
              height="100%"
            />
          ) : (
            <textarea
              readOnly
              value={JSON.stringify(json, null, 2)}
              style={{
                background: '#fff',
                color: '#222',
                padding: 12,
                width: '100%',
                height: '100%',
                resize: 'none',
                fontFamily: 'monospace',
                fontSize: 14,
                overflow: 'auto',
                whiteSpace: 'pre',
                boxSizing: 'border-box',
                tabSize: 2,
                border: '1px solid #ccc'
              }}
              wrap="off"
              spellCheck={false}
            />
          )
        ) : (
          <div className="tree-view-container" style={{ flexGrow: 1, overflow: 'auto' }}> {/* Ensure this takes up space and scrolls */}
            <JsonTreeView 
              data={showDiffsOnly ? 
                (diffResults.length > 0 ? 
                  filterJsonByDiffs(json, diffResults) || {} : json) 
                : json}
              viewerId={viewerId}
              jsonSide={viewerId === 'viewer1' ? 'left' : 'right'}
              idKeySetting={null}
            />
          </div>
        )}
      </div>
    </div>
  );
};
