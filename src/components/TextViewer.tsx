import React from 'react';
import './TextViewer.css';

interface TextViewerProps {
  text: string;
  fileName?: string;
}

export const TextViewer: React.FC<TextViewerProps> = ({ text, fileName }) => {
  return (
    <div className="text-viewer">
      {fileName && (
        <div className="text-viewer-header">
          <span className="file-name">{fileName}</span>
          <span className="file-mode">Text Mode (JSON parsing failed)</span>
        </div>
      )}
      <pre className="text-content">{text}</pre>
    </div>
  );
};
