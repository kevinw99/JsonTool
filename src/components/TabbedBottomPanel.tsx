import React, { useState } from 'react';
import { DiffList } from './DiffList/DiffList';
import { IdKeysPanel } from './IdKeysPanel';
import type { DiffResult, IdKeyInfo } from '../utils/jsonCompare';
import './TabbedBottomPanel.css';

interface TabbedBottomPanelProps {
  diffs: DiffResult[];
  idKeysUsed: IdKeyInfo[];
  height: string;
}

export const TabbedBottomPanel: React.FC<TabbedBottomPanelProps> = ({
  diffs,
  idKeysUsed,
  height
}) => {
  const [activeTab, setActiveTab] = useState<'differences' | 'idkeys'>('differences');

  return (
    <div className="tabbed-bottom-panel" style={{ height }}>
      <div className="tab-header">
        <button
          className={`tab-button ${activeTab === 'differences' ? 'active' : ''}`}
          onClick={() => setActiveTab('differences')}
        >
          Differences ({diffs.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'idkeys' ? 'active' : ''}`}
          onClick={() => setActiveTab('idkeys')}
        >
          ID Keys ({idKeysUsed.length})
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'differences' ? (
          <DiffList diffs={diffs} height="100%" />
        ) : (
          <IdKeysPanel idKeysUsed={idKeysUsed} />
        )}
      </div>
    </div>
  );
};
