import { useState, useEffect } from 'react'
import './App.css'
import { jsonCompare } from './utils/jsonCompare'
import type { DiffResult, JsonCompareResult } from './utils/jsonCompare'
import { JsonViewerSyncProvider } from './components/JsonViewerSyncContext'
import { JsonTreeView } from './components/JsonTreeView'
import { ViewControls } from './components/ViewControls'
import { SyncScroll } from './components/SyncScroll'
import { DiffList } from './components/DiffList/DiffList'
import { ResizableDivider } from './components/ResizableDivider'
import { FileDropZone } from './components/FileDropZone';
import './components/JsonLayout.css'
import type { JsonValue } from './components/JsonTreeView';
import { useJsonViewerSync } from './components/JsonViewerSyncContext';

function App() {
  const [json1, setJson1] = useState<JsonValue | null>(null)
  const [json2, setJson2] = useState<JsonValue | null>(null)
  const [diffs, setDiffs] = useState<DiffResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [syncScroll, setSyncScroll] = useState<boolean>(true)
  const [dividerPosition, setDividerPosition] = useState<number>(70)

  const headerAndControlsHeight = 60; // Reduced height

  useEffect(() => {
    async function loadSamples() {
      try {
        const [j1, j2] = await Promise.all([
          fetch('/sample1.json').then(r => r.json()),
          fetch('/sample2.json').then(r => r.json())
        ])
        const comparisonResult: JsonCompareResult = jsonCompare(j1, j2);
        setJson1(comparisonResult.processedJson1);
        setJson2(comparisonResult.processedJson2);
        setDiffs(comparisonResult.diffs);
      } catch (e) {
        setError('Failed to load sample JSON files.')
        console.error("Error loading or comparing JSON:", e);
      }
    }
    loadSamples()
  }, [])

  useEffect(() => {
    if (json1 && json2) {
      const comparisonResult: JsonCompareResult = jsonCompare(json1, json2);
      setDiffs(comparisonResult.diffs);
    }
  }, [json1, json2]);

  const handleFileDrop = (viewer: 'json1' | 'json2') => (jsonData: object) => {
    const newJsonValue = jsonData as JsonValue;
    if (viewer === 'json1') {
      const comparisonResult = jsonCompare(newJsonValue, json2);
      setJson1(comparisonResult.processedJson1);
      setJson2(comparisonResult.processedJson2);
      setDiffs(comparisonResult.diffs);
    } else {
      const comparisonResult = jsonCompare(json1, newJsonValue);
      setJson1(comparisonResult.processedJson1);
      setJson2(comparisonResult.processedJson2);
      setDiffs(comparisonResult.diffs);
    }
  };

  const toggleSyncScroll = () => {
    setSyncScroll(!syncScroll)
  }

  // Inner component to access context
  const MainContent = () => {
    const { showDiffsOnly } = useJsonViewerSync();

    return (
      <div className="app-content-wrapper" style={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        height: `calc(100vh - ${headerAndControlsHeight}px)`,
        overflow: 'hidden'
      }}>
        {json1 && json2 ? (
          <>
            <div className="json-viewers-section" style={{ 
              flexBasis: `${dividerPosition}%`, 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              minHeight: '100px'
            }}>
              {/* ViewControls are now in the header */}
              <div className="json-comparison-container" style={{ 
                flexGrow: 1, 
                display: 'flex', 
                justifyContent: 'space-between', 
                overflow: 'hidden',
                minHeight: 0
              }}>
                <SyncScroll 
                  enabled={syncScroll} 
                  syncGroup="json-viewers" 
                  className="json-viewer-scroll-container"
                  style={{width: "49%", height: "100%", overflowY: 'auto', display: 'flex', flexDirection: 'column'}}
                >
                  <FileDropZone onFileDrop={handleFileDrop('json1')}>
                    <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                      <JsonTreeView
                        data={json1}
                        viewerId="viewer1"
                        jsonSide='left'
                        idKeySetting={null}
                        showDiffsOnly={showDiffsOnly}
                      />
                    </div>
                  </FileDropZone>
                </SyncScroll>
                
                <SyncScroll 
                  enabled={syncScroll} 
                  syncGroup="json-viewers" 
                  className="json-viewer-scroll-container"
                  style={{width: "49%", height: "100%", overflowY: 'auto', display: 'flex', flexDirection: 'column'}}
                >
                  <FileDropZone onFileDrop={handleFileDrop('json2')}>
                    <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                      <JsonTreeView
                        data={json2}
                        viewerId="viewer2"
                        jsonSide='right'
                        idKeySetting={null}
                        showDiffsOnly={showDiffsOnly}
                      />
                    </div>
                  </FileDropZone>
                </SyncScroll>
              </div>
            </div>

            <ResizableDivider 
              direction="horizontal" 
              initialPosition={dividerPosition}
              onPositionChange={(newPosition) => {
                setDividerPosition(newPosition);
              }}
              minPosition={20}
              maxPosition={80}
            />

            <div className="diff-list-section" style={{ 
              flexBasis: `${100 - dividerPosition}%`, 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              minHeight: '100px'
            }}>
              <DiffList 
                diffs={diffs} 
                height="100%"
              />
            </div>
          </>
        ) : (
          <div style={{textAlign: 'center', padding: '20px'}}>
            {error ? 'Error loading data.' : 'Loading JSON data...'}
          </div>
        )}
      </div>
    );
  }

  return (
    <JsonViewerSyncProvider
      initialViewMode="tree"
      initialShowDiffsOnly={false}
      initialSyncEnabled={true} 
      diffResults={diffs}
    >
      <div className="App">
        <header className="app-header">
          <h1 className="app-title">JSON Compare</h1>
          <div className="app-controls">
            <button 
              onClick={toggleSyncScroll} 
              className={`sync-toggle-button ${syncScroll ? 'toggled-on' : ''}`}>
              {syncScroll ? '🔒 Sync' : '🔓 Sync Off'}
            </button>
            <ViewControls />
          </div>
        </header>
        
        {error && <div style={{color: 'red'}}>{error}</div>}
        
        <MainContent />
      </div>
    </JsonViewerSyncProvider>
  )
}

export default App
