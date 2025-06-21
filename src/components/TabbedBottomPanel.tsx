import React from 'react';
import { DiffList } from './DiffList/DiffList';
import { IdKeysPanel } from './IdKeysPanel';
import type { DiffResult, IdKeyInfo } from '../utils/jsonCompare';
import './TabbedBottomPanel.css';

interface TabbedBottomPanelProps {
  diffs: DiffResult[];
  idKeysUsed: IdKeyInfo[];
  height: string;
  activeTab: 'differences' | 'idkeys';
  onTabChange: (tab: 'differences' | 'idkeys') => void;
  jsonData: any;
}

export const TabbedBottomPanel: React.FC<TabbedBottomPanelProps> = ({
  diffs,
  idKeysUsed,
  height,
  activeTab,
  onTabChange,
  jsonData
}) => {
  return (
    <div className="tabbed-bottom-panel" style={{ height }}>
      <div className="tab-header">
        <button
          className={`tab-button ${activeTab === 'differences' ? 'active' : ''}`}
          onClick={() => onTabChange('differences')}
        >
          Differences ({diffs.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'idkeys' ? 'active' : ''}`}
          onClick={() => onTabChange('idkeys')}
        >
          ID Keys ({idKeysUsed.length})
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'differences' ? (
          <DiffList diffs={diffs} height="100%" />
        ) : (
          <IdKeysPanel idKeysUsed={idKeysUsed} jsonData={jsonData} />
        )}
      </div>
    </div>
  );
};
