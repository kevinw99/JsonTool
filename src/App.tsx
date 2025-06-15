import { useState, useEffect } from 'react'
import './App.css'
import { compareJSON } from './jsonCompare'
import type { DiffResult } from './jsonCompare'
import { JsonViewerSyncProvider } from './components/JsonViewerSyncContext'
import { FilteredJsonViewer } from './components/FilteredJsonViewer'
import { ViewControls } from './components/ViewControls'
import { SyncScroll } from './components/SyncScroll'
import { DiffList } from './components/DiffList/DiffList'
import { useWindowSize } from './hooks/useWindowSize'
import './components/JsonLayout.css'

function App() {
  const [json1, setJson1] = useState<object | null>(null)
  const [json2, setJson2] = useState<object | null>(null)
  const [diffs, setDiffs] = useState<DiffResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [syncScroll, setSyncScroll] = useState<boolean>(true)
  const { height } = useWindowSize()

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
      padding: "0"
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
      
      {json1 && json2 && (
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
            justifyContent: "space-between"
          }}>
            <div style={{width: "49%"}}>
              <SyncScroll enabled={syncScroll} syncGroup="json-viewers">
                <div className="json-viewer-column" style={{ width: "100%" }}>
                  <h2 style={{ fontSize: '1.5rem', marginTop: 0, marginBottom: '8px' }}>Sample 1</h2>
                  <FilteredJsonViewer 
                    json={json1}
                    diffResults={diffs} 
                    height={Math.max(500, height * 0.7)} 
                    viewerId="viewer1" 
                  />
                </div>
              </SyncScroll>
            </div>
            <div style={{width: "49%"}}>
              <SyncScroll enabled={syncScroll} syncGroup="json-viewers">
                <div className="json-viewer-column" style={{ width: "100%" }}>
                  <h2 style={{ fontSize: '1.5rem', marginTop: 0, marginBottom: '8px' }}>Sample 2</h2>
                  <FilteredJsonViewer 
                    json={json2} 
                    diffResults={diffs} 
                    height={Math.max(500, height * 0.7)}
                    viewerId="viewer2" 
                  />
                </div>
              </SyncScroll>
            </div>
          </div>
        </JsonViewerSyncProvider>
      )}
      
      <DiffList 
        diffs={diffs} 
        height={Math.max(150, height * 0.25)} 
      />
    </div>
  )
}

export default App
