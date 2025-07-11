import { useState, useEffect } from 'react'
import './App.css'
import { jsonCompare, detectIdKeysInSingleJson } from './utils/jsonCompare'
import type { DiffResult, JsonCompareResult, IdKeyInfo } from './utils/jsonCompare'
import { JsonViewerSyncProvider } from './components/JsonViewerSyncContext'
import { JsonTreeView } from './components/JsonTreeView'
import { TextViewer } from './components/TextViewer'
import JsonTextEditor from './components/JsonTextEditor'
import { ViewControls } from './components/ViewControls'
import { ScrollService } from './services/ScrollService'
import { TabbedBottomPanel } from './components/TabbedBottomPanel'
import { ResizableDivider } from './components/ResizableDivider/ResizableDivider'
import { FileDropZone } from './components/FileDropZone'
import { FileHeader } from './components/FileHeader'
import { FileSelector } from './components/FileSelector'
import { GlobalDropZone } from './components/GlobalDropZone'
// ViewportTestButton removed - not used in this component
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
  // const [pendingFiles, setPendingFiles] = useState<Array<{content: JsonValue | string, isTextMode: boolean, fileName?: string}>>([])
  
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


  // Helper function to save a single filename to localStorage
  const saveFilenameToStorage = (fileKey: 'file1' | 'file2', fileName: string) => {
    try {
      
      // Get existing saved state or create a new one
      const existingSaved = localStorage.getItem('jsontool-saved-filenames');
      let fileState: any = existingSaved ? JSON.parse(existingSaved) : {};
      
      // Update the specific file
      if (fileKey === 'file1') {
        fileState.file1Name = fileName;
      } else {
        fileState.file2Name = fileName;
      }
      fileState.timestamp = Date.now();
      
      localStorage.setItem('jsontool-saved-filenames', JSON.stringify(fileState));
    } catch (e) {
      console.warn(`Failed to save ${fileKey} filename to localStorage:`, e);
    }
  };

  // Helper function to save filenames to localStorage (only if files are from public dir)
  // Helper function to get available JSON files from public directory
  const getPublicJsonFiles = (): string[] => {
    // This would ideally be dynamic, but for now we'll hardcode the known files
    return [
      'sample1.json',
      'sample2.json', 
      'sort-test-1.json',
      'sort-test-2.json',
      'test-sync-1.json',
      'test-sync-2.json',
      'Test1RG_request_BM.json',
      'Test1RG_request_SUT.json',
      'Test1NRG_contributions_optimizer_mvpbm_Response_decompressedDebugOutputBM.json',
      'Test1NRG_contributions_optimizer_mvpbm_Response_decompressedDebugOutputSUT.json'
    ];
  };

  // Helper function to load a specific file from public directory
  const loadFileFromPublic = async (fileName: string): Promise<FileData | null> => {
    try {
      const response = await fetch(`/${fileName}`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return {
        content: data,
        isTextMode: false,
        fileName: fileName
      };
    } catch (error) {
      return null;
    }
  };

  // Handle file selection from public directory
  const handleFileSelect = (viewer: 'file1' | 'file2') => async (fileName: string) => {
    const fileData = await loadFileFromPublic(fileName);
    if (!fileData) {
      setError(`Failed to load ${fileName} from public directory`);
      return;
    }

    if (viewer === 'file1') {
      setFile1(fileData);
      if (file2 && !file2.isTextMode) {
        // Re-run comparison with new file1
        const comparisonResult = jsonCompare(fileData.content as JsonValue, file2.content as JsonValue);
        const updatedFile1 = { ...fileData, content: comparisonResult.processedJson1 };
        const updatedFile2 = { ...file2, content: comparisonResult.processedJson2 };
        setFile1(updatedFile1);
        setFile2(updatedFile2);
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
        saveFilenamesFromData(updatedFile1, updatedFile2);
      } else {
        // Single file loaded - detect ID keys for visual sorting
        detectAndSetIdKeysForSingleFile(fileData);
        if (file2) {
          if (fileData.fileName) {
            saveFilenameToStorage('file1', fileData.fileName);
          }
          if (file2.fileName) {
            saveFilenameToStorage('file2', file2.fileName);
          }
        }
      }
    } else {
      setFile2(fileData);
      if (file1 && !file1.isTextMode) {
        // Re-run comparison with new file2
        const comparisonResult = jsonCompare(file1.content as JsonValue, fileData.content as JsonValue);
        const updatedFile1 = { ...file1, content: comparisonResult.processedJson1 };
        const updatedFile2 = { ...fileData, content: comparisonResult.processedJson2 };
        setFile1(updatedFile1);
        setFile2(updatedFile2);
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
        saveFilenamesFromData(updatedFile1, updatedFile2);
      } else {
        // Single file loaded - detect ID keys for visual sorting
        detectAndSetIdKeysForSingleFile(fileData);
        if (file1) {
          if (file1.fileName) {
            saveFilenameToStorage('file1', file1.fileName);
          }
          if (fileData.fileName) {
            saveFilenameToStorage('file2', fileData.fileName);
          }
        }
      }
    }
    setError(null);
  };

  // Function to save both filenames from FileData objects
  const saveFilenamesFromData = (file1Data: FileData, file2Data: FileData) => {
    try {
      
      // Only save if both files have names (indicating they were loaded from public dir or uploaded)
      if (file1Data.fileName && file2Data.fileName) {
        const fileState = {
          file1Name: file1Data.fileName,
          file2Name: file2Data.fileName,
          timestamp: Date.now()
        };
        localStorage.setItem('jsontool-saved-filenames', JSON.stringify(fileState));
      } else {
      }
    } catch (e) {
      console.warn('Failed to save filenames to localStorage:', e);
    }
  };

  // Helper function to load files by filename from public directory
  const loadFilesByNames = async (): Promise<{ file1: FileData, file2: FileData } | null> => {
    try {
      const saved = localStorage.getItem('jsontool-saved-filenames');
      
      if (!saved) {
        return null;
      }
      
      const fileState = JSON.parse(saved);
      
      // Check if saved filenames are recent (within 7 days)
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - fileState.timestamp > oneWeek) {
        localStorage.removeItem('jsontool-saved-filenames');
        return null;
      }
      
      console.log(`- File 1: /${fileState.file1Name}`);
      console.log(`- File 2: /${fileState.file2Name}`);
      
      // Try to load both files from public directory
      const [file1Response, file2Response] = await Promise.all([
        fetch(`/${fileState.file1Name}`).catch(() => {
          return null;
        }),
        fetch(`/${fileState.file2Name}`).catch(() => {
          return null;
        })
      ]);
      
      // If either file fails to load, remove from storage and return null
      if (!file1Response?.ok || !file2Response?.ok) {
        console.log(`- File 1 response: ${file1Response?.status} ${file1Response?.statusText}`);
        console.log(`- File 2 response: ${file2Response?.status} ${file2Response?.statusText}`);
        localStorage.removeItem('jsontool-saved-filenames');
        return null;
      }
      
      const [file1Data, file2Data] = await Promise.all([
        file1Response.json(),
        file2Response.json()
      ]);
      
      
      return {
        file1: {
          content: file1Data,
          isTextMode: false,
          fileName: fileState.file1Name
        },
        file2: {
          content: file2Data,
          isTextMode: false,
          fileName: fileState.file2Name
        }
      };
    } catch (e) {
      console.warn('❌ Failed to load files by names:', e);
      localStorage.removeItem('jsontool-saved-filenames');
      return null;
    }
  };

  // Sample data loading function
  const loadSamples = async () => {
    try {
      console.log('🔍 [loadSamples] Starting to load sample files...');
      const [response1, response2] = await Promise.all([
        fetch('/simple1.json'),
        fetch('/simple2.json')
      ]);
      
      console.log('📡 [loadSamples] Fetch responses:', { 
        simple1Status: response1.status, 
        simple2Status: response2.status 
      });
      
      if (!response1.ok) {
        console.error('❌ [loadSamples] Failed to fetch simple1.json:', response1.status, response1.statusText);
        throw new Error(`Failed to fetch simple1.json: ${response1.status}`);
      }
      
      if (!response2.ok) {
        console.error('❌ [loadSamples] Failed to fetch simple2.json:', response2.status, response2.statusText);
        throw new Error(`Failed to fetch simple2.json: ${response2.status}`);
      }
      
      const [j1, j2] = await Promise.all([
        response1.json(),
        response2.json()
      ]);
      
      console.log('✅ [loadSamples] Successfully parsed JSON files');
      console.log('📄 [loadSamples] simple1.json keys:', Object.keys(j1));
      console.log('📄 [loadSamples] simple2.json keys:', Object.keys(j2));
      
      const comparisonResult: JsonCompareResult = jsonCompare(j1, j2);
      const file1Data = { 
        content: comparisonResult.processedJson1, 
        isTextMode: false, 
        fileName: 'simple1.json' 
      };
      const file2Data = { 
        content: comparisonResult.processedJson2, 
        isTextMode: false, 
        fileName: 'simple2.json' 
      };
      
      console.log('🎯 [loadSamples] Setting file data with isTextMode: false');
      setFile1(file1Data);
      setFile2(file2Data);
      setDiffs(comparisonResult.diffs);
      setIdKeysUsed(comparisonResult.idKeysUsed);
      setError(null); // Clear any previous errors
      
      // Auto-save the sample filenames so they persist on reload
      saveFilenamesFromData(file1Data, file2Data);
      console.log('✅ [loadSamples] Sample files loaded and filenames saved');
    } catch (e) {
      console.error('❌ [loadSamples] Error loading sample files:', e);
      setError('Failed to load sample JSON files.')
      console.error("Error loading or comparing JSON:", e);
    }
  };

  // Initial loading effect - try to load saved filenames first, then fall back to samples
  useEffect(() => {
    const loadInitialFiles = async () => {
      const savedFiles = await loadFilesByNames();
      if (savedFiles) {
        setFile1(savedFiles.file1);
        setFile2(savedFiles.file2);
        
        // If both files are JSON, immediately compare them to generate diffs
        if (!savedFiles.file1.isTextMode && !savedFiles.file2.isTextMode) {
          try {
            const comparisonResult: JsonCompareResult = jsonCompare(
              savedFiles.file1.content as JsonValue, 
              savedFiles.file2.content as JsonValue
            );
            // Update files with processed content that includes any IDs
            const updatedFile1 = { ...savedFiles.file1, content: comparisonResult.processedJson1 };
            const updatedFile2 = { ...savedFiles.file2, content: comparisonResult.processedJson2 };
            setFile1(updatedFile1);
            setFile2(updatedFile2);
            setDiffs(comparisonResult.diffs);
            setIdKeysUsed(comparisonResult.idKeysUsed);
            
            // Don't re-save the same filenames we just loaded
            console.log('ℹ️ Skipping filename save during initial restore');
          } catch (e) {
            console.error('❌ Error comparing restored files:', e);
            setError('Error comparing restored files');
          }
        }
        setError(null);
      } else {
        loadSamples();
      }
    };
    
    loadInitialFiles();
  }, [])

  // Expose testing methods globally for e2e tests
  useEffect(() => {
    // Only in development/test environment
    if (process.env.NODE_ENV !== 'production') {
      (window as any).setTestFiles = (file1Data: FileData, file2Data: FileData) => {
        console.log('📝 [Testing] Setting test files programmatically:', { file1Data, file2Data });
        setFile1(file1Data);
        setFile2(file2Data);
        
        // If both files are JSON, immediately compare them to generate diffs
        if (!file1Data.isTextMode && !file2Data.isTextMode) {
          try {
            const comparisonResult: JsonCompareResult = jsonCompare(
              file1Data.content as JsonValue, 
              file2Data.content as JsonValue
            );
            // Update files with processed content that includes any IDs
            const updatedFile1 = { ...file1Data, content: comparisonResult.processedJson1 };
            const updatedFile2 = { ...file2Data, content: comparisonResult.processedJson2 };
            setFile1(updatedFile1);
            setFile2(updatedFile2);
            setDiffs(comparisonResult.diffs);
            setIdKeysUsed(comparisonResult.idKeysUsed);
            setError(null);
            console.log(`✅ [Testing] Generated ${comparisonResult.diffs.length} diffs`);
          } catch (e) {
            console.error('❌ [Testing] Error comparing test files:', e);
            setError('Error comparing test files');
          }
        }
      };
    }
  }, []);

  useEffect(() => {
    if (file1 && file2 && !file1.isTextMode && !file2.isTextMode) {
      // Use jsonCompare to detect IDKeys and generate diffs
      const comparisonResult: JsonCompareResult = jsonCompare(file1.content, file2.content);
      setDiffs(comparisonResult.diffs);
      
      // Use all IDKeys generated by jsonCompare since it already filters out arrays that don't exist on both sides
      setIdKeysUsed(comparisonResult.idKeysUsed);
      
      // Store idKeysUsed globally for debug access
      if (typeof window !== 'undefined') {
        (window as any).currentIdKeysUsed = comparisonResult.idKeysUsed;
        (window as any).currentDiffs = comparisonResult.diffs;
      }
      
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
      const updatedFile1 = { ...file1, fileName: newName };
      setFile1(updatedFile1);
      // Auto-save filenames when changed
      if (file2) {
        saveFilenamesFromData(updatedFile1, file2);
      } else {
        saveFilenameToStorage('file1', newName);
      }
    }
  };

  const handleFileName2Change = (newName: string) => {
    if (file2) {
      const updatedFile2 = { ...file2, fileName: newName };
      setFile2(updatedFile2);
      // Auto-save filenames when changed
      if (file1) {
        saveFilenamesFromData(file1, updatedFile2);
      } else {
        saveFilenameToStorage('file2', newName);
      }
    }
  };

  // Handle view mode toggle
  // View mode is now handled by JsonViewerSyncContext

  // Handler for multiple files dropped at once
  const handleMultipleFilesDrop = (files: Array<{ content: JsonValue | string; isTextMode: boolean; fileName?: string }>) => {
    if (files.length >= 2) {
      // Load first two files into left and right viewers
      setFile1(files[0]);
      setFile2(files[1]);
      
      // Save filenames to localStorage
      if (files[0].fileName) {
        saveFilenameToStorage('file1', files[0].fileName);
      }
      if (files[1].fileName) {
        saveFilenameToStorage('file2', files[1].fileName);
      }
      
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
      // Save only the left filename since right is still empty
      if (data.fileName) {
        saveFilenameToStorage('file1', data.fileName);
      }
      return;
    }
    
    // If only left viewer is empty, put it there
    if (!file1) {
      setFile1(data);
      if (!data.isTextMode && file2 && !file2.isTextMode) {
        const comparisonResult = jsonCompare(data.content as JsonValue, file2.content as JsonValue);
        const updatedFile1 = { ...data, content: comparisonResult.processedJson1 };
        const updatedFile2 = { ...file2, content: comparisonResult.processedJson2 };
        setFile1(updatedFile1);
        setFile2(updatedFile2);
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
        if (updatedFile1.fileName) {
          saveFilenameToStorage('file1', updatedFile1.fileName);
        }
        if (updatedFile2.fileName) {
          saveFilenameToStorage('file2', updatedFile2.fileName);
        }
      } else if (file2) {
        if (data.fileName) {
          saveFilenameToStorage('file1', data.fileName);
        }
        if (file2.fileName) {
          saveFilenameToStorage('file2', file2.fileName);
        }
      }
      return;
    }
    
    // If only right viewer is empty, put it there
    if (!file2) {
      setFile2(data);
      if (!data.isTextMode && file1 && !file1.isTextMode) {
        const comparisonResult = jsonCompare(file1.content as JsonValue, data.content as JsonValue);
        const updatedFile1 = { ...file1, content: comparisonResult.processedJson1 };
        const updatedFile2 = { ...data, content: comparisonResult.processedJson2 };
        setFile1(updatedFile1);
        setFile2(updatedFile2);
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
        if (updatedFile1.fileName) {
          saveFilenameToStorage('file1', updatedFile1.fileName);
        }
        if (updatedFile2.fileName) {
          saveFilenameToStorage('file2', updatedFile2.fileName);
        }
      } else if (file1) {
        if (file1.fileName) {
          saveFilenameToStorage('file1', file1.fileName);
        }
        if (data.fileName) {
          saveFilenameToStorage('file2', data.fileName);
        }
      }
      return;
    }
    
    // If both viewers are occupied, replace the right viewer (newer file)
    setFile2(data);
    if (!data.isTextMode && file1 && !file1.isTextMode) {
      const comparisonResult = jsonCompare(file1.content as JsonValue, data.content as JsonValue);
      const updatedFile1 = { ...file1, content: comparisonResult.processedJson1 };
      const updatedFile2 = { ...data, content: comparisonResult.processedJson2 };
      setFile1(updatedFile1);
      setFile2(updatedFile2);
      setDiffs(comparisonResult.diffs);
      setIdKeysUsed(comparisonResult.idKeysUsed);
      if (updatedFile1.fileName) {
        saveFilenameToStorage('file1', updatedFile1.fileName);
      }
      if (updatedFile2.fileName) {
        saveFilenameToStorage('file2', updatedFile2.fileName);
      }
    } else if (file1) {
      if (file1.fileName) {
        saveFilenameToStorage('file1', file1.fileName);
      }
      if (data.fileName) {
        saveFilenameToStorage('file2', data.fileName);
      }
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
              console.log(`🔍 [App-GlobalDrop] Attempting to parse JSON for file: ${file.name}`);
              console.log(`📄 [App-GlobalDrop] File content length: ${text.length} characters`);
              console.log(`📝 [App-GlobalDrop] First 200 chars:`, text.substring(0, 200));
              const jsonData = JSON.parse(text);
              console.log(`✅ [App-GlobalDrop] JSON parsing successful for: ${file.name}`);
              const data = { 
                content: jsonData, 
                isTextMode: false, 
                fileName: file.name 
              };
              
              
              // If this is the first file and we have no files loaded, put it in left viewer
              if (index === 0 && !file1 && !file2) {
                setFile1(data);
                // Save filename to localStorage
                if (data.fileName) {
                  saveFilenameToStorage('file1', data.fileName);
                }
              }
              // If this is the second file or we already have one file, use smart drop logic
              else {
                handleSmartFileDrop(data);
              }
            } catch (jsonError) {
              // If JSON parsing fails, fall back to text mode
              console.error(`❌ [App-GlobalDrop] JSON parsing failed for ${file.name}:`, jsonError);
              console.log(`📄 [App-GlobalDrop] Raw text content:`, text);
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
    console.log(`🎯 [handleFileDrop-${viewer}] Received data:`, {
      fileName: data.fileName,
      isTextMode: data.isTextMode,
      contentType: typeof data.content,
      contentLength: typeof data.content === 'string' ? data.content.length : 'object'
    });
    
    if (viewer === 'file1') {
      const newFile1 = data;
      console.log(`📝 [handleFileDrop-file1] Setting file1 with isTextMode:`, data.isTextMode);
      setFile1(newFile1);
      
      if (!data.isTextMode && file2 && !file2.isTextMode) {
        const comparisonResult = jsonCompare(data.content as JsonValue, file2.content as JsonValue);
        const updatedFile1 = { ...data, content: comparisonResult.processedJson1 };
        const updatedFile2 = { ...file2, content: comparisonResult.processedJson2 };
        setFile1(updatedFile1);
        setFile2(updatedFile2);
        setDiffs(comparisonResult.diffs);
        setIdKeysUsed(comparisonResult.idKeysUsed);
        // Auto-save filenames when files are processed (only if they have names)
        if (updatedFile1.fileName) {
          saveFilenameToStorage('file1', updatedFile1.fileName);
        }
        if (updatedFile2.fileName) {
          saveFilenameToStorage('file2', updatedFile2.fileName);
        }
      } else if (file2) {
        // Auto-save filenames even if not both JSON files (only if they have names)
        if (newFile1.fileName) {
          saveFilenameToStorage('file1', newFile1.fileName);
        }
        if (file2.fileName) {
          saveFilenameToStorage('file2', file2.fileName);
        }
      } else {
        // Save just file1 name if file2 is null
        if (newFile1.fileName) {
          saveFilenameToStorage('file1', newFile1.fileName);
        }
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
        // Auto-save filenames when files are processed (only if they have names)
        if (updatedFile1.fileName) {
          saveFilenameToStorage('file1', updatedFile1.fileName);
        }
        if (updatedFile2.fileName) {
          saveFilenameToStorage('file2', updatedFile2.fileName);
        }
      } else if (file1) {
        // Auto-save filenames even if not both JSON files (only if they have names)
        if (file1.fileName) {
          saveFilenameToStorage('file1', file1.fileName);
        }
        if (newFile2.fileName) {
          saveFilenameToStorage('file2', newFile2.fileName);
        }
      } else {
        // Save just file2 name if file1 is null
        if (newFile2.fileName) {
          saveFilenameToStorage('file2', newFile2.fileName);
        }
      }
    }
  };

  // Debug: log mount/unmount
  useEffect(() => {
    console.log('[App] Component mounted, initial syncScroll:', syncScroll);
    return () => {
      console.log('[App] Component unmounting');
    };
  }, []);

  
  const toggleSyncScroll = () => {
    setSyncScroll(prev => {
      const newValue = !prev;
      console.log('[App] Sync scrolling:', newValue ? 'ENABLED' : 'DISABLED');
      
      if (newValue) {
        // When re-enabling, perform alignment after state updates
        setTimeout(() => {
          performSmartSyncAlignment();
        }, 50);
      }
      
      return newValue;
    });
  };

  // Smart sync alignment when re-enabling sync
  const performSmartSyncAlignment = async () => {
    console.log('[App] 🎯 Starting smart sync alignment');
    
    try {
      // Use ScrollService for alignment
      await ScrollService.navigate({
        type: 'alignment',
        scrollBehavior: 'smooth',
        alignment: 'center'
      });
      
      // Enable sync after alignment
      setSyncScroll(true);
      console.log('[App] ✅ Smart alignment completed via ScrollService');
      
    } catch (error) {
      console.error('[App] ❌ Smart alignment failed:', error);
      // Fallback - just enable sync without alignment
      setSyncScroll(true);
    }
  };

  // Inner component to access context
  const MainContent = () => {
    const { showDiffsOnly, viewMode } = useJsonViewerSync();

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
                <div 
                  className="json-viewer-scroll-container"
                  style={{width: "49%", height: "100%", display: 'flex', flexDirection: 'column'}}
                >
                  <FileDropZone 
                    onFileDrop={handleFileDrop('file1')}
                    onMultipleFilesDrop={handleMultipleFilesDrop}
                  >
                    <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5px'}}>
                        <FileHeader 
                          fileName={file1?.fileName}
                          onFileNameChange={handleFileName1Change}
                          side="left"
                        />
                        <FileSelector
                          onFileSelect={handleFileDrop('file1')}
                          side="left"
                          currentFileName={file1?.fileName}
                        />
                      </div>
                      <div style={{flex: 1, height: '100%', display: 'flex', flexDirection: 'column'}}>
                        {(() => {
                          console.log(`🎨 [Render-file1] viewMode: ${viewMode}, isTextMode: ${file1.isTextMode}, fileName: ${file1.fileName}`);
                          return viewMode === 'text';
                        })() ? (
                          <JsonTextEditor 
                            key="file1-text-editor"
                            value={typeof file1.content === 'string' ? file1.content : JSON.stringify(file1.content, null, 2)} 
                            onChange={(newContent) => {
                              // For read-only mode, we don't update the content
                              console.log('Text editor is in read-only mode');
                            }}
                            readOnly={true}
                            height="100%"
                            theme="light"
                          />
                        ) : (
                          <JsonTreeView
                            data={file1.content as JsonValue}
                            viewerId="left"
                            jsonSide='left'
                            idKeySetting={null}
                            idKeysUsed={idKeysUsed}
                            showDiffsOnly={showDiffsOnly}
                            isCompareMode={true}
                            syncScrollEnabled={syncScroll}
                          />
                        )}
                      </div>
                    </div>
                  </FileDropZone>
                </div>
                
                <div 
                  className="json-viewer-scroll-container"
                  style={{width: "49%", height: "100%", display: 'flex', flexDirection: 'column'}}
                >
                  <FileDropZone 
                    onFileDrop={handleFileDrop('file2')}
                    onMultipleFilesDrop={handleMultipleFilesDrop}
                  >
                    <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5px'}}>
                        <FileHeader 
                          fileName={file2?.fileName}
                          onFileNameChange={handleFileName2Change}
                          side="right"
                        />
                        <FileSelector
                          onFileSelect={handleFileDrop('file2')}
                          side="right"
                          currentFileName={file2?.fileName}
                        />
                      </div>
                      <div style={{flex: 1, height: '100%', display: 'flex', flexDirection: 'column'}}>
                        {(() => {
                          console.log(`🎨 [Render-file2] viewMode: ${viewMode}, isTextMode: ${file2.isTextMode}, fileName: ${file2.fileName}`);
                          return viewMode === 'text';
                        })() ? (
                          <JsonTextEditor 
                            key="file2-text-editor"
                            value={typeof file2.content === 'string' ? file2.content : JSON.stringify(file2.content, null, 2)} 
                            onChange={(newContent) => {
                              // For read-only mode, we don't update the content
                              console.log('Text editor is in read-only mode');
                            }}
                            readOnly={true}
                            height="100%"
                            theme="light"
                          />
                        ) : (
                          <JsonTreeView
                            data={file2.content as JsonValue}
                            viewerId="right"
                            jsonSide='right'
                            idKeySetting={null}
                            idKeysUsed={idKeysUsed}
                            showDiffsOnly={showDiffsOnly}
                            isCompareMode={true}
                            syncScrollEnabled={syncScroll}
                          />
                        )}
                      </div>
                    </div>
                  </FileDropZone>
                </div>
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
                  jsonData={{ 
                    left: file1.content, 
                    right: file2.content 
                  }}
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
              <div 
                className="json-viewer-scroll-container"
                style={{width: "49%", height: "100%", display: 'flex', flexDirection: 'column'}}
              >
                <FileDropZone 
                  onFileDrop={handleSmartFileDrop}
                  onMultipleFilesDrop={handleMultipleFilesDrop}
                >
                  <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5px'}}>
                      <FileHeader 
                        fileName={file1?.fileName}
                        onFileNameChange={handleFileName1Change}
                        side="left"
                      />
                      <FileSelector
                        onFileSelect={handleFileDrop('file1')}
                        side="left"
                        currentFileName={file1?.fileName}
                      />
                    </div>
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
              
              <div 
                className="json-viewer-scroll-container"
                style={{width: "49%", height: "100%", display: 'flex', flexDirection: 'column'}}
              >
                <FileDropZone 
                  onFileDrop={handleSmartFileDrop}
                  onMultipleFilesDrop={handleMultipleFilesDrop}
                >
                  <div className="json-viewer-column" style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5px'}}>
                      <FileHeader 
                        fileName={file2?.fileName}
                        onFileNameChange={handleFileName2Change}
                        side="right"
                      />
                      <FileSelector
                        onFileSelect={handleFileDrop('file2')}
                        side="right"
                        currentFileName={file2?.fileName}
                      />
                    </div>
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

  // Helper function to detect ID keys in a single file
  const detectAndSetIdKeysForSingleFile = (fileData: FileData) => {
    if (fileData.isTextMode) return;
    
    try {
      const detectedIdKeys = detectIdKeysInSingleJson(fileData.content as JsonValue);
      console.log(`[detectAndSetIdKeysForSingleFile] Detected ${detectedIdKeys.length} ID keys:`, detectedIdKeys);
      
      if (detectedIdKeys.length > 0) {
        setIdKeysUsed(detectedIdKeys);
      } else {
        setIdKeysUsed([]);
      }
    } catch (err) {
      console.warn('Failed to detect ID keys in single file:', err);
      setIdKeysUsed([]);
    }
  };

  // NOTE: Auto-load test files disabled for manual testing
  // useEffect(() => {
  //   const autoLoadTestFiles = async () => {
  //     try {
  //       // Wait a bit for the app to initialize
  //       await new Promise(resolve => setTimeout(resolve, 1000));
        
        
  //       // Load both test files
  //       await handlePublicFileSelection('sort-test-1.json', 'file1');
  //       await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
  //       await handlePublicFileSelection('sort-test-2.json', 'file2');
        
  //     } catch (err) {
  //       console.error('❌ Failed to auto-load test files:', err);
  //     }
  //   };
    
  //   // Only run auto-load if no files are currently loaded
  //   if (!file1 && !file2) {
  //     autoLoadTestFiles();
  //   }
  // }, []); // Run only once on mount

  // DEBUG: Show current ID key setting in UI
  // const currentIdKeySetting = getPrimaryIdKey(idKeysUsed);
  // const debugInfo = {
  //   idKeysUsed: idKeysUsed.length,
  //   primaryIdKey: currentIdKeySetting,
  //   file1HasArrays: file1 && !file1.isTextMode ? JSON.stringify(file1.content).includes('[') : false,
  //   file2HasArrays: file2 && !file2.isTextMode ? JSON.stringify(file2.content).includes('[') : false
  // };

  return (
    <GlobalDropZone onFileDrop={handleGlobalFileDrop}>
      <JsonViewerSyncProvider
        initialViewMode="tree"
        initialShowDiffsOnly={false}
        initialSyncEnabled={syncScroll} 
        diffResults={diffs}
        jsonData={{ left: file1?.content, right: file2?.content }}
        idKeysUsed={idKeysUsed}
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
                <span>{syncScroll ? 'Sync ON' : 'Sync OFF'}</span>
              </button>
              <ViewControls 
                onSaveFiles={handleSaveFiles}
              />
              <button
                className="load-samples-button"
                onClick={loadSamples}
                title="Load sample JSON files (simple1.json and simple2.json)"
                style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                📄 Load Samples
              </button>
            </div>
          </header>
          
          {error && <div style={{color: 'red'}}>{error}</div>}
          
          <MainContent />
        </div>
      </JsonViewerSyncProvider>
    </GlobalDropZone>
  );
}

export default App
