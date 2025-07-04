import React from 'react';
import { useJsonViewerSync } from './JsonViewerSyncContext';

export const ViewportTestButton: React.FC = () => {
  const { testViewportDetection } = useJsonViewerSync();

  return (
    <button
      onClick={testViewportDetection}
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold'
      }}
      title="Click to test viewport detection and show debug info in console"
    >
      🧪 Test Viewport
    </button>
  );
};