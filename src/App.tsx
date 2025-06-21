import { useState, useEffect } from 'react'
import './App.css'
import { jsonCompare } from './utils/jsonCompare'
import type { DiffResult, JsonCompareResult, IdKeyInfo } from './utils/jsonCompare'
import { JsonViewerSyncProvider } from './components/JsonViewerSyncContext'
import { JsonTreeView } from './components/JsonTreeView'
import { TextViewer } from './components/TextViewer'
import { ViewControls } from './components/ViewControls'
import { SyncScroll } from './components/SyncScroll'
import { TabbedBottomPanel } from './components/TabbedBottomPanel'
import { ResizableDivider } from './components/ResizableDivider'
import { FileDropZone } from './components/FileDropZone';
import './components/JsonLayout.css'
import type { JsonValue } from './components/JsonTreeView';
import { useJsonViewerSync } from './components/JsonViewerSyncContext';

interface FileData {
  content: JsonValue | string;
  isTextMode: boolean;
  fileName?: string;
}

function App() {
  const [file1, setFile1] = useState<FileData | null>(null)
  const [file2, setFile2] = useState<FileData | null>(null)
  const [diffs, setDiffs] = useState<DiffResult[]>([])
  const [idKeysUsed, setIdKeysUsed] = useState<IdKeyInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [syncScroll, setSyncScroll] = useState<boolean>(true)
  const [dividerPosition, setDividerPosition] = useState<number>(70)

  // Debug dividerPosition changes
  useEffect(() => {
    console.log('[App] dividerPosition state changed to:', dividerPosition);
  }, [dividerPosition]);

  const headerAndControlsHeight = 60; // Reduced height

  useEffect(() => {
    async function loadSamples() {
      try {
        const [j1, j2] = await Promise.all([
          fetch('/sample1.json').then(r => r.json()),
          fetch('/sample2.json').then(r => r.json())
        ])
        const comparisonResult: JsonCompareResult = jsonCompare(j1, j2);
        setFile1({ 
          content: comparisonResult.processedJson1, 
          isTextMode: false, 
          fileName: 'sample1.json' 
        });
        setFile2({ 
          content: comparisonResult.processedJson2, 
          isTextMode: false, 
          fileName: 'sample2.json' 
        });
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
      } catch (e) {
        setError('Failed to load sample JSON files.')
        console.error("Error loading or comparing JSON:", e);
      }
    }
    loadSamples()
  }, [])

  useEffect(() => {
    if (file1 && file2 && !file1.isTextMode && !file2.isTextMode) {
      const comparisonResult: JsonCompareResult = jsonCompare(file1.content as JsonValue, file2.content as JsonValue);
      setDiffs(comparisonResult.diffs);
      setIdKeysUsed(comparisonResult.idKeysUsed);
    } else {
      // Clear diffs and idKeys if either file is in text mode
      setDiffs([]);
      setIdKeysUsed([]);
    }
  }, [file1, file2]);

  const handleFileDrop = (viewer: 'file1' | 'file2') => (data: { content: JsonValue | string; isTextMode: boolean; fileName?: string }) => {
    if (viewer === 'file1') {
      setFile1(data);
      if (!data.isTextMode && file2 && !file2.isTextMode) {
        const comparisonResult = jsonCompare(data.content as JsonValue, file2.content as JsonValue);
        setFile1({ ...data, content: comparisonResult.processedJson1 });
        setFile2({ ...file2, content: comparisonResult.processedJson2 });
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
      }
    } else {
      setFile2(data);
      if (!data.isTextMode && file1 && !file1.isTextMode) {
        const comparisonResult = jsonCompare(file1.content as JsonValue, data.content as JsonValue);
        setFile1({ ...file1, content: comparisonResult.processedJson1 });
        setFile2({ ...data, content: comparisonResult.processedJson2 });
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
      }
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
        {file1 && file2 ? (
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
                  <FileDropZone onFileDrop={handleFileDrop('file1')}>
                    <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                      {file1.isTextMode ? (
                        <TextViewer 
                          text={file1.content as string} 
                          fileName={file1.fileName}
                        />
                      ) : (
                        <JsonTreeView
                          data={file1.content as JsonValue}
                          viewerId="viewer1"
                          jsonSide='left'
                          idKeySetting={null}
                          showDiffsOnly={showDiffsOnly}
                        />
                      )}
                    </div>
                  </FileDropZone>
                </SyncScroll>
                
                <SyncScroll 
                  enabled={syncScroll} 
                  syncGroup="json-viewers" 
                  className="json-viewer-scroll-container"
                  style={{width: "49%", height: "100%", overflowY: 'auto', display: 'flex', flexDirection: 'column'}}
                >
                  <FileDropZone onFileDrop={handleFileDrop('file2')}>
                    <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                      {file2.isTextMode ? (
                        <TextViewer 
                          text={file2.content as string} 
                          fileName={file2.fileName}
                        />
                      ) : (
                        <JsonTreeView
                          data={file2.content as JsonValue}
                          viewerId="viewer2"
                          jsonSide='right'
                          idKeySetting={null}
                          showDiffsOnly={showDiffsOnly}
                        />
                      )}
                    </div>
                  </FileDropZone>
                </SyncScroll>
              </div>
            </div>

            <ResizableDivider 
              direction="horizontal" 
              initialPosition={dividerPosition}
              onPositionChange={(newPosition) => {
                console.log('[App] ResizableDivider onPositionChange called:', {
                  oldDividerPosition: dividerPosition,
                  newPosition
                });
                setDividerPosition(newPosition);
                console.log('[App] setDividerPosition called with:', newPosition);
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
              {file1.isTextMode || file2.isTextMode ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%', 
                  color: '#6c757d',
                  fontStyle: 'italic'
                }}>
                  Diff comparison not available in text mode
                </div>
              ) : (
                <TabbedBottomPanel 
                  diffs={diffs}
                  idKeysUsed={idKeysUsed}
                  height="100%"
                />
              )}
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
