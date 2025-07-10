import React, { useRef } from 'react';
import './FileSelector.css';

interface FileSelectorProps {
  onFileSelect: (data: { content: any; isTextMode: boolean; fileName?: string }) => void;
  side: 'left' | 'right';
  currentFileName?: string;
}

export const FileSelector: React.FC<FileSelectorProps> = ({
  onFileSelect,
  side,
  currentFileName
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log(`🔍 [FileSelector-${side}] Selected file: ${file.name}`);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          try {
            // Try to parse as JSON first
            console.log(`🔍 [FileSelector-${side}] Attempting to parse JSON for: ${file.name}`);
            console.log(`📄 [FileSelector-${side}] File content length: ${text.length} characters`);
            const jsonData = JSON.parse(text);
            console.log(`✅ [FileSelector-${side}] JSON parsing successful for: ${file.name}`);
            onFileSelect({
              content: jsonData,
              isTextMode: false,
              fileName: file.name
            });
          } catch (jsonError) {
            // If JSON parsing fails, fall back to text mode
            console.error(`❌ [FileSelector-${side}] JSON parsing failed for ${file.name}:`, jsonError);
            console.log(`📄 [FileSelector-${side}] Raw text content:`, text);
            onFileSelect({
              content: text,
              isTextMode: true,
              fileName: file.name
            });
          }
        } else {
          console.error(`❌ [FileSelector-${side}] File content is not a string`);
          alert('Error: Could not read file content as text.');
        }
      } catch (error) {
        console.error(`❌ [FileSelector-${side}] Error reading file:`, error);
        alert(`Error reading file: ${(error as Error).message}`);
      }
    };

    reader.onerror = () => {
      console.error(`❌ [FileSelector-${side}] FileReader error:`, reader.error);
      alert('An error occurred while reading the file.');
    };

    reader.readAsText(file);
    
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  return (
    <div className={`file-selector ${side}`}>
      <button
        className="file-selector-toggle"
        onClick={handleButtonClick}
        title="Choose a file from your computer"
      >
        📁 Browse Files
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt,.js,.ts,.jsx,.tsx"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};
