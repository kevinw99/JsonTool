import React from 'react';
import { DiffList } from './DiffList/DiffList';
import { IdKeysPanel } from './IdKeysPanel';
import { IgnoredPanel } from './IgnoredPanel/IgnoredPanel';
import { useJsonViewerSync } from './JsonViewerSyncContext';
import type { DiffResult, IdKeyInfo } from '../utils/jsonCompare';
import './TabbedBottomPanel.css';

interface TabbedBottomPanelProps {
  diffs?: DiffResult[];
  idKeysUsed?: IdKeyInfo[];
  height: string;
  activeTab: 'differences' | 'idkeys' | 'ignored';
  onTabChange: (tab: 'differences' | 'idkeys' | 'ignored') => void;
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
  const { ignoredPatterns, ignoredDiffs, isPathIgnoredByPattern } = useJsonViewerSync();
  
  // Calculate non-ignored diffs count
  const nonIgnoredDiffsCount = diffs?.filter(diff => 
    diff.numericPath && !ignoredDiffs.has(diff.numericPath) && !isPathIgnoredByPattern(diff.numericPath)
  ).length || 0;
  
  return (
    <div className="tabbed-bottom-panel" style={{ height }}>
      <div className="tab-header">
        <button
          className={`tab-button ${activeTab === 'differences' ? 'active' : ''}`}
          onClick={() => onTabChange('differences')}
        >
          Differences ({nonIgnoredDiffsCount})
        </button>
        <button
          className={`tab-button ${activeTab === 'idkeys' ? 'active' : ''}`}
          onClick={() => onTabChange('idkeys')}
        >
          ID Keys ({idKeysUsed?.length || 0})
        </button>
        <button
          className={`tab-button ${activeTab === 'ignored' ? 'active' : ''}`}
          onClick={() => onTabChange('ignored')}
        >
          Ignored ({ignoredPatterns.size})
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'differences' ? (
          <DiffList diffs={diffs || []} height="100%" />
        ) : activeTab === 'idkeys' ? (
          <IdKeysPanel idKeysUsed={idKeysUsed || []} jsonData={jsonData} />
        ) : (
          <IgnoredPanel height="100%" />
        )}
      </div>
    </div>
  );
};
