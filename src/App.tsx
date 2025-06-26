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
import { ResizableDivider } from './components/ResizableDivider/ResizableDivider'
import { FileDropZone } from './components/FileDropZone'
import { FileHeader } from './components/FileHeader'
import { GlobalDropZone } from './components/GlobalDropZone'
import './components/JsonLayout.css'
import type { JsonValue } from './components/JsonTreeView'
import { useJsonViewerSync } from './components/JsonViewerSyncContext'

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
  
  // Queue for handling multiple file drops
  const [pendingFiles, setPendingFiles] = useState<Array<{content: JsonValue | string, isTextMode: boolean, fileName?: string}>>([])
  
  // Load divider position from localStorage, default to 70
  const [dividerPosition, setDividerPosition] = useState<number>(() => {
    const saved = localStorage.getItem('jsontool-divider-position');
    return saved ? parseFloat(saved) : 70;
  })
  
  // Load active tab from localStorage, default to 'differences'
  const [activeTab, setActiveTab] = useState<'differences' | 'idkeys' | 'ignored'>(() => {
    const saved = localStorage.getItem('jsontool-active-tab');
    return (saved === 'idkeys' || saved === 'ignored') ? saved as 'differences' | 'idkeys' | 'ignored' : 'differences';
  })

  const headerAndControlsHeight = 60; // Reduced height

  // Persist divider position to localStorage
  useEffect(() => {
    localStorage.setItem('jsontool-divider-position', dividerPosition.toString());
  }, [dividerPosition]);

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('jsontool-active-tab', activeTab);
  }, [activeTab]);

  // Helper function to get the primary ID key from detected ID keys
  const getPrimaryIdKey = (idKeysUsed: IdKeyInfo[]): string | null => {
    if (!idKeysUsed || idKeysUsed.length === 0) return null;
    
    // Count frequency of each ID key
    const keyFrequency = new Map<string, number>();
    idKeysUsed.forEach(info => {
      const count = keyFrequency.get(info.idKey) || 0;
      keyFrequency.set(info.idKey, count + 1);
    });
    
    // Get the most frequent non-composite ID key (prefer simple keys over composite ones)
    let primaryKey: string | null = null;
    let maxCount = 0;
    
    for (const [key, count] of keyFrequency.entries()) {
      if (count > maxCount && !key.includes('+')) { // Prefer non-composite keys
        primaryKey = key;
        maxCount = count;
      }
    }
    
    // If no non-composite key found, use the most frequent one
    if (!primaryKey && keyFrequency.size > 0) {
      for (const [key, count] of keyFrequency.entries()) {
        if (count > maxCount) {
          primaryKey = key;
          maxCount = count;
        }
      }
    }
    
    return primaryKey;
  };

  // Helper function to save files to localStorage
  const saveFilesToStorage = (file1Data: FileData, file2Data: FileData) => {
    try {
      const fileState = {
        file1: {
          content: file1Data.content,
          isTextMode: file1Data.isTextMode,
          fileName: file1Data.fileName
        },
        file2: {
          content: file2Data.content,
          isTextMode: file2Data.isTextMode,
          fileName: file2Data.fileName
        },
        timestamp: Date.now()
      };
      localStorage.setItem('jsontool-saved-files', JSON.stringify(fileState));
      console.log('Files saved to localStorage');
    } catch (e) {
      console.warn('Failed to save files to localStorage:', e);
    }
  };

  // Helper function to load files from localStorage
  const loadFilesFromStorage = (): { file1: FileData, file2: FileData } | null => {
    try {
      const saved = localStorage.getItem('jsontool-saved-files');
      if (!saved) return null;
      
      const fileState = JSON.parse(saved);
      
      // Check if saved files are recent (within 7 days)
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - fileState.timestamp > oneWeek) {
        localStorage.removeItem('jsontool-saved-files');
        return null;
      }
      
      return {
        file1: fileState.file1,
        file2: fileState.file2
      };
    } catch (e) {
      console.warn('Failed to load files from localStorage:', e);
      localStorage.removeItem('jsontool-saved-files');
      return null;
    }
  };

  // Sample data loading function
  const loadSamples = async () => {
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
      setError(null); // Clear any previous errors
    } catch (e) {
      setError('Failed to load sample JSON files.')
      console.error("Error loading or comparing JSON:", e);
    }
  };

  // Initial loading effect - try to load saved files first, then fall back to samples
  useEffect(() => {
    const savedFiles = loadFilesFromStorage();
    if (savedFiles) {
      console.log('Loading previously saved files from localStorage');
      setFile1(savedFiles.file1);
      setFile2(savedFiles.file2);
      setError(null);
    } else {
      console.log('No saved files found, loading default samples');
      loadSamples();
    }
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

  // Save current files to sample1.json and sample2.json in public directory
  const handleSaveFiles = async () => {
    if (!file1 || !file2) {
      alert('Both files must be loaded to save them.');
      return;
    }

    try {
      // Get the original JSON content (not the processed version with IDs)
      let file1Content = file1.content;
      let file2Content = file2.content;
      
      // If files are in text mode, try to parse them back to JSON
      if (file1.isTextMode) {
        try {
          file1Content = JSON.parse(file1.content as string);
        } catch (e) {
          alert('File 1 contains invalid JSON and cannot be saved.');
          return;
        }
      }
      
      if (file2.isTextMode) {
        try {
          file2Content = JSON.parse(file2.content as string);
        } catch (e) {
          alert('File 2 contains invalid JSON and cannot be saved.');
          return;
        }
      }

      // Get the actual filenames, fallback to sample names if not available
      const filename1 = file1.fileName || 'sample1.json';
      const filename2 = file2.fileName || 'sample2.json';

      const response = await fetch('/api/save-samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file1: file1Content,
          file2: file2Content,
          filename1: filename1,
          filename2: filename2
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Files saved successfully to public directory!\n${result.files.join(', ')} have been updated.`);
      } else {
        const error = await response.json();
        alert(`Failed to save files: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving files:', error);
      alert('Error saving files. Make sure the save server is running.\n\nTo start the save server, run: npm run save-server');
    }
  };

  // Handle filename changes
  const handleFileName1Change = (newName: string) => {
    if (file1) {
      setFile1({ ...file1, fileName: newName });
    }
  };

  const handleFileName2Change = (newName: string) => {
    if (file2) {
      setFile2({ ...file2, fileName: newName });
    }
  };

  // Handle view mode toggle
  const handleViewModeToggle = () => {
    if (file1) {
      const newIsTextMode = !file1.isTextMode;
      setFile1({ 
        ...file1, 
        isTextMode: newIsTextMode,
        content: newIsTextMode ? JSON.stringify(file1.content, null, 2) : file1.content
      });
    }
    if (file2) {
      const newIsTextMode = !file2.isTextMode;
      setFile2({ 
        ...file2, 
        isTextMode: newIsTextMode,
        content: newIsTextMode ? JSON.stringify(file2.content, null, 2) : file2.content
      });
    }
  };

  // Handler for multiple files dropped at once
  const handleMultipleFilesDrop = (files: Array<{ content: JsonValue | string; isTextMode: boolean; fileName?: string }>) => {
    if (files.length >= 2) {
      // Load first two files into left and right viewers
      setFile1(files[0]);
      setFile2(files[1]);
      
      // If both are valid JSON, compare them
      if (!files[0].isTextMode && !files[1].isTextMode) {
        const comparisonResult = jsonCompare(files[0].content as JsonValue, files[1].content as JsonValue);
        setFile1({ ...files[0], content: comparisonResult.processedJson1 });
        setFile2({ ...files[1], content: comparisonResult.processedJson2 });
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
      } else {
        // Clear diffs if either file is in text mode
        setDiffs([]);
        setIdKeysUsed([]);
      }
      
      // Show message if more than 2 files were dropped
      if (files.length > 2) {
        alert(`${files.length} files were dropped. Only the first 2 files have been loaded.`);
      }
    } else if (files.length === 1) {
      // Single file, use smart drop logic
      handleSmartFileDrop(files[0]);
    }
  };

  // Smart file drop handler that automatically assigns files to left/right based on availability
  const handleSmartFileDrop = (data: { content: JsonValue | string; isTextMode: boolean; fileName?: string }) => {
    // If both viewers are empty, put the file in the left viewer
    if (!file1 && !file2) {
      setFile1(data);
      return;
    }
    
    // If only left viewer is empty, put it there
    if (!file1) {
      setFile1(data);
      if (!data.isTextMode && file2 && !file2.isTextMode) {
        const comparisonResult = jsonCompare(data.content as JsonValue, file2.content as JsonValue);
        setFile1({ ...data, content: comparisonResult.processedJson1 });
        setFile2({ ...file2, content: comparisonResult.processedJson2 });
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
      }
      return;
    }
    
    // If only right viewer is empty, put it there
    if (!file2) {
      setFile2(data);
      if (!data.isTextMode && file1 && !file1.isTextMode) {
        const comparisonResult = jsonCompare(file1.content as JsonValue, data.content as JsonValue);
        setFile1({ ...file1, content: comparisonResult.processedJson1 });
        setFile2({ ...data, content: comparisonResult.processedJson2 });
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
      }
      return;
    }
    
    // If both viewers are occupied, replace the right viewer (newer file)
    setFile2(data);
    if (!data.isTextMode && file1 && !file1.isTextMode) {
      const comparisonResult = jsonCompare(file1.content as JsonValue, data.content as JsonValue);
      setFile1({ ...file1, content: comparisonResult.processedJson1 });
      setFile2({ ...data, content: comparisonResult.processedJson2 });
      setDiffs(comparisonResult.diffs);
      setIdKeysUsed(comparisonResult.idKeysUsed);
    }
  };

  // Handle global file drops (when files are dropped anywhere on the app)
  const handleGlobalFileDrop = (files: File[]) => {
    const processFile = (file: File, index: number) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result;
          if (typeof text === 'string') {
            try {
              // Try to parse as JSON first
              const jsonData = JSON.parse(text);
              const data = { 
                content: jsonData, 
                isTextMode: false, 
                fileName: file.name 
              };
              
              // If this is the first file and we have no files loaded, put it in left viewer
              if (index === 0 && !file1 && !file2) {
                setFile1(data);
              }
              // If this is the second file or we already have one file, use smart drop logic
              else {
                handleSmartFileDrop(data);
              }
            } catch (jsonError) {
              // If JSON parsing fails, fall back to text mode
              console.warn('JSON parsing failed, displaying as text:', jsonError);
              const data = { 
                content: text, 
                isTextMode: true, 
                fileName: file.name 
              };
              handleSmartFileDrop(data);
            }
          }
        } catch (error) {
          console.error('Error reading file:', error);
          alert(`Error reading file ${file.name}: ${(error as Error).message}`);
        }
      };
      reader.readAsText(file);
    };

    // Process up to 2 files
    files.slice(0, 2).forEach(processFile);
    
    if (files.length > 2) {
      console.warn(`Only processing first 2 files. ${files.length - 2} files ignored.`);
    }
  };

  const handleFileDrop = (viewer: 'file1' | 'file2') => (data: { content: JsonValue | string; isTextMode: boolean; fileName?: string }) => {
    if (viewer === 'file1') {
      const newFile1 = data;
      setFile1(newFile1);
      if (!data.isTextMode && file2 && !file2.isTextMode) {
        const comparisonResult = jsonCompare(data.content as JsonValue, file2.content as JsonValue);
        const updatedFile1 = { ...data, content: comparisonResult.processedJson1 };
        const updatedFile2 = { ...file2, content: comparisonResult.processedJson2 };
        setFile1(updatedFile1);
        setFile2(updatedFile2);
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
        // Auto-save when files are processed
        saveFilesToStorage(updatedFile1, updatedFile2);
      } else if (file2) {
        // Auto-save even if not both JSON files
        saveFilesToStorage(newFile1, file2);
      }
    } else {
      const newFile2 = data;
      setFile2(newFile2);
      if (!data.isTextMode && file1 && !file1.isTextMode) {
        const comparisonResult = jsonCompare(file1.content as JsonValue, data.content as JsonValue);
        const updatedFile1 = { ...file1, content: comparisonResult.processedJson1 };
        const updatedFile2 = { ...data, content: comparisonResult.processedJson2 };
        setFile1(updatedFile1);
        setFile2(updatedFile2);
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
        // Auto-save when files are processed
        saveFilesToStorage(updatedFile1, updatedFile2);
      } else if (file1) {
        // Auto-save even if not both JSON files
        saveFilesToStorage(file1, newFile2);
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
                  <FileDropZone 
                    onFileDrop={handleFileDrop('file1')}
                    onMultipleFilesDrop={handleMultipleFilesDrop}
                  >
                    <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                      <FileHeader 
                        fileName={file1?.fileName}
                        onFileNameChange={handleFileName1Change}
                        side="left"
                      />
                      <div style={{flex: 1, height: '100%', display: 'flex', flexDirection: 'column'}}>
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
                            idKeySetting={getPrimaryIdKey(idKeysUsed)}
                            showDiffsOnly={showDiffsOnly}
                          />
                        )}
                      </div>
                    </div>
                  </FileDropZone>
                </SyncScroll>
                
                <SyncScroll 
                  enabled={syncScroll} 
                  syncGroup="json-viewers" 
                  className="json-viewer-scroll-container"
                  style={{width: "49%", height: "100%", overflowY: 'auto', display: 'flex', flexDirection: 'column'}}
                >
                  <FileDropZone 
                    onFileDrop={handleFileDrop('file2')}
                    onMultipleFilesDrop={handleMultipleFilesDrop}
                  >
                    <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                      <FileHeader 
                        fileName={file2?.fileName}
                        onFileNameChange={handleFileName2Change}
                        side="right"
                      />
                      <div style={{flex: 1, height: '100%', display: 'flex', flexDirection: 'column'}}>
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
                            idKeySetting={getPrimaryIdKey(idKeysUsed)}
                            showDiffsOnly={showDiffsOnly}
                          />
                        )}
                      </div>
                    </div>
                  </FileDropZone>
                </SyncScroll>
              </div>
            </div>

            <ResizableDivider 
              direction="horizontal" 
              onPositionChange={setDividerPosition}
              initialPosition={dividerPosition}
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
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  jsonData={file1.content}
                />
              )}
            </div>
          </>
        ) : (
          <div className="json-viewers-section" style={{ 
            flex: 1,
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            minHeight: '100px'
          }}>
            <div className="json-comparison-container" style={{ 
              flexGrow: 1, 
              display: 'flex', 
              justifyContent: 'space-between', 
              overflow: 'hidden',
              minHeight: 0
            }}>
              <div className="json-viewer-scroll-container"
                style={{width: "49%", height: "100%", display: 'flex', flexDirection: 'column'}}
              >
                <FileDropZone 
                  onFileDrop={handleSmartFileDrop}
                  onMultipleFilesDrop={handleMultipleFilesDrop}
                >
                  <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                    <FileHeader 
                      fileName={file1?.fileName}
                      onFileNameChange={handleFileName1Change}
                      side="left"
                    />
                    <div style={{
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#6c757d',
                      fontSize: '18px',
                      border: '2px dashed #dee2e6',
                      borderRadius: '8px',
                      margin: '10px',
                      background: '#f8f9fa'
                    }}>
                      Drop JSON file here
                    </div>
                  </div>
                </FileDropZone>
              </div>
              
              <div className="json-viewer-scroll-container"
                style={{width: "49%", height: "100%", display: 'flex', flexDirection: 'column'}}
              >
                <FileDropZone 
                  onFileDrop={handleSmartFileDrop}
                  onMultipleFilesDrop={handleMultipleFilesDrop}
                >
                  <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                    <FileHeader 
                      fileName={file2?.fileName}
                      onFileNameChange={handleFileName2Change}
                      side="right"
                    />
                    <div style={{
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#6c757d',
                      fontSize: '18px',
                      border: '2px dashed #dee2e6',
                      borderRadius: '8px',
                      margin: '10px',
                      background: '#f8f9fa'
                    }}>
                      Drop JSON file here
                    </div>
                  </div>
                </FileDropZone>
              </div>
            </div>
            
            <div style={{
              padding: '20px',
              textAlign: 'left',
              color: '#6c757d'
            }}>
              {error ? (
                <div style={{color: 'red'}}>{error}</div>
              ) : (
                <div>
                  <p>Drag and drop JSON files to compare them</p>
                  <button 
                    onClick={loadSamples}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Load Sample Data
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <GlobalDropZone onFileDrop={handleGlobalFileDrop}>
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
                className={`sync-toggle-button ${syncScroll ? 'toggled-on' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  height: '32px',
                  padding: '4px 8px',
                  fontSize: '14px'
                }}
              >
                <span>{syncScroll ? '🔒' : '🔓'}</span>
                <span>Sync</span>
              </button>
              <ViewControls 
                onToggleViewMode={handleViewModeToggle} 
                onSaveFiles={handleSaveFiles}
              />
            </div>
          </header>
          
          {error && <div style={{color: 'red'}}>{error}</div>}
          
          <MainContent />
        </div>
      </JsonViewerSyncProvider>
    </GlobalDropZone>
  )
}

export default App
