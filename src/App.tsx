import { useState, useEffect } from 'react'
import './App.css'
import { compareJSON } from './jsonCompare'
import type { DiffResult } from './jsonCompare'
import { JsonViewerSyncProvider } from './components/JsonViewerSyncContext'
import { FilteredJsonViewer } from './components/FilteredJsonViewer'
import { ViewControls } from './components/ViewControls'
import { SyncScroll } from './components/SyncScroll'
import { DiffList } from './components/DiffList/DiffList'
import { ResizableDivider } from './components/ResizableDivider'
import { useWindowSize } from './hooks/useWindowSize'
import './components/JsonLayout.css'

function App() {
  const [json1, setJson1] = useState<object | null>(null)
  const [json2, setJson2] = useState<object | null>(null)
  const [diffs, setDiffs] = useState<DiffResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [syncScroll, setSyncScroll] = useState<boolean>(true)
  const [dividerPosition, setDividerPosition] = useState<number>(70) // Initial position: 70% for JSON viewers, 30% for diff list
  const { height } = useWindowSize()

  // Calculate heights based on the divider position and window height
  // Subtract space for headers, controls, etc. (approximately 120px)
  const jsonViewerHeight = Math.max(200, (height * (dividerPosition / 100)) - 120)
  const diffListHeight = Math.max(150, (height * ((100 - dividerPosition) / 100)) - 40)

  useEffect(() => {
    async function loadSamples() {
      try {
        const [j1, j2] = await Promise.all([
          fetch('src/sample1.json').then(r => r.json()),
          fetch('src/sample2.json').then(r => r.json())
        ])
        setJson1(j1)
        setJson2(j2)
        setDiffs(compareJSON(j1, j2))
      } catch (e) {
        setError('Failed to load sample JSON files.')
      }
    }
    loadSamples()
  }, [])

  const toggleSyncScroll = () => {
    setSyncScroll(!syncScroll)
  }
   // When syncing is enabled, all other actions are automatically synchronized
  // This is handled by the JsonViewerSyncContext internally

  return (
    <div className="App" style={{ 
      width: "100%", 
      margin: "0 auto", 
      padding: "0",
      height: "100vh",
      display: "flex",
      flexDirection: "column"
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>JSON Comparison Tool</h1>
      {error && <div style={{color: 'red'}}>{error}</div>}
      
      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button 
          onClick={toggleSyncScroll} 
          style={{
            padding: '8px 16px',
            background: syncScroll ? '#e6f7ff' : '#f0f0f0',
            border: '1px solid ' + (syncScroll ? '#1890ff' : '#ddd'),
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: syncScroll ? '#1890ff' : 'inherit'
          }}
        >
          {syncScroll ? '🔒 Synchronized Actions' : '🔓 Independent Actions'}
        </button>
      </div>
      
      <div className="resizable-container">
        {json1 && json2 && (
          <div className="json-viewers-section" style={{ height: `${dividerPosition}%` }}>
            <JsonViewerSyncProvider
              initialViewMode="tree"
              initialShowDiffsOnly={true}
              initialSyncEnabled={true} // Always enable synchronization by default
              diffResults={diffs}
            >
              <ViewControls />
              
              <div className="json-comparison-container" style={{ 
                width: "100%",
                margin: "0 auto", 
                display: "flex",
                justifyContent: "space-between",
                height: `calc(100% - 40px)` // Adjust for ViewControls
              }}>
                <div style={{width: "49%", height: "100%"}}>
                  <SyncScroll enabled={syncScroll} syncGroup="json-viewers">
                    <div className="json-viewer-column" style={{ width: "100%", height: "100%" }}>
                      <h2 style={{ fontSize: '1.5rem', marginTop: 0, marginBottom: '8px' }}>Sample 1</h2>
                      <FilteredJsonViewer 
                        json={json1}
                        diffResults={diffs} 
                        height={jsonViewerHeight} 
                        viewerId="viewer1" 
                      />
                    </div>
                  </SyncScroll>
                </div>
                <div style={{width: "49%", height: "100%"}}>
                  <SyncScroll enabled={syncScroll} syncGroup="json-viewers">
                    <div className="json-viewer-column" style={{ width: "100%", height: "100%" }}>
                      <h2 style={{ fontSize: '1.5rem', marginTop: 0, marginBottom: '8px' }}>Sample 2</h2>
                      <FilteredJsonViewer 
                        json={json2} 
                        diffResults={diffs} 
                        height={jsonViewerHeight}
                        viewerId="viewer2" 
                      />
                    </div>
                  </SyncScroll>
                </div>
              </div>
            </JsonViewerSyncProvider>
          </div>
        )}
        
        <ResizableDivider 
          direction="horizontal" 
          initialPosition={dividerPosition}
          minPosition={30} // Minimum 30% for JSON viewers
          maxPosition={85} // Maximum 85% for JSON viewers
          onPositionChange={setDividerPosition}
        />
        
        <div className="diff-list-section" style={{ height: `${100 - dividerPosition}%` }}>
          <DiffList 
            diffs={diffs} 
            height={diffListHeight}
          />
        </div>
      </div>
    </div>
  )
}

export default App
