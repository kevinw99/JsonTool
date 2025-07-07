import React, { useState } from 'react';
import { JsonTreeView } from './JsonTreeView';
import './JsonViewer.css';

interface JsonViewerProps {
  json: any;
  height?: number | string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ json, height = 400 }) => {
  const [viewMode, setViewMode] = useState<'text' | 'tree'>('tree');

  const toggleViewMode = () => {
    setViewMode(viewMode === 'text' ? 'tree' : 'text');
  };

  return (
    <div className="json-viewer-container" style={{ height }}>
      <div className="json-viewer-controls">
        <button 
          className={`view-mode-toggle ${viewMode === 'text' ? 'active' : ''}`}
          onClick={toggleViewMode}
        >
          {viewMode === 'text' ? '🔄 View as Tree' : '🔄 View as Text'}
        </button>
      </div>
      
      <div className="json-viewer-content">
        {viewMode === 'text' ? (
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
              fontSize: 16,
              overflow: 'auto',
              whiteSpace: 'pre',
              boxSizing: 'border-box',
              tabSize: 2,
              border: '1px solid #ccc'
            }}
            wrap="off"
            spellCheck={false}
          />
        ) : (
          <div className="json-tree-view-container">
            <JsonTreeView data={json} viewerId="left" idKeySetting={null} jsonSide="left" />
          </div>
        )}
      </div>
    </div>
  );
};
