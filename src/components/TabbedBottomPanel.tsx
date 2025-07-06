import React from 'react';
import { DiffList } from './DiffList/DiffList';
import { IdKeysPanel } from './IdKeysPanel';
import { IgnoredPanel } from './IgnoredPanel/IgnoredPanel';
import { useJsonViewerSync } from './JsonViewerSyncContext';
import type { DiffResult, IdKeyInfo } from '../utils/jsonCompare';
import { validateAndCreateIdBasedPath } from '../utils/PathTypes';
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
  const { ignoredPatterns, ignoredDiffs, /* rawIgnoredDiffs, */ isPathIgnoredByPattern } = useJsonViewerSync();
  
  // Calculate non-ignored diffs count
  const nonIgnoredDiffsCount = diffs?.filter(diff => 
    diff.idBasedPath && !ignoredDiffs.has(diff.idBasedPath) && !isPathIgnoredByPattern(validateAndCreateIdBasedPath(diff.idBasedPath, 'TabbedBottomPanel.filter'))
  ).length || 0;
  
  // Calculate total ignored count (manual patterns + right-click patterns)
  const rightClickIgnoredCount = Array.from(ignoredPatterns.keys()).filter(id => id.startsWith('rightclick_')).length;
  const manualPatternsCount = Array.from(ignoredPatterns.keys()).filter(id => !id.startsWith('rightclick_')).length;
  const totalIgnoredCount = rightClickIgnoredCount + manualPatternsCount;
  
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
          Ignored ({totalIgnoredCount})
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'differences' ? (
          <DiffList diffs={diffs || []} height="100%" jsonData={jsonData} />
        ) : activeTab === 'idkeys' ? (
          <IdKeysPanel idKeysUsed={idKeysUsed || []} />
        ) : (
          <IgnoredPanel height="100%" />
        )}
      </div>
    </div>
  );
};
