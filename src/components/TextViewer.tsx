import React, { useEffect, useRef } from 'react';
import { EditorView, lineNumbers, highlightSpecialChars, drawSelection, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { foldGutter, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { searchKeymap, search, highlightSelectionMatches } from '@codemirror/search';
import './TextViewer.css';

interface TextViewerProps {
  text: string;
  fileName?: string;
}

export const TextViewer: React.FC<TextViewerProps> = ({ text, fileName }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Function to open search
  const openSearch = () => {
    if (viewRef.current) {
      // Focus the editor first
      viewRef.current.focus();
      // Dispatch the search command
      viewRef.current.dispatch({
        effects: EditorView.updateListener.of(() => {})
      });
      // Programmatically trigger search
      const searchCommand = searchKeymap.find(k => k.key === 'Mod-f');
      if (searchCommand?.run) {
        searchCommand.run(viewRef.current);
      }
    }
  };

  useEffect(() => {
    if (!editorRef.current) return;

    // Clean up existing editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    // Determine if content is JSON for appropriate language support
    let isValidJson = false;
    try {
      JSON.parse(text);
      isValidJson = true;
    } catch {
      isValidJson = false;
    }

    // Create editor extensions - let CodeMirror handle everything
    const extensions = [
      // Line numbers
      lineNumbers(),
      
      // JSON language support with built-in syntax highlighting and folding
      ...(isValidJson ? [json()] : []),
      
      // Folding support for JSON (expand/collapse)
      foldGutter(),
      
      // Default syntax highlighting
      syntaxHighlighting(defaultHighlightStyle),
      
      // Special character highlighting
      highlightSpecialChars(),
      
      // Selection drawing
      drawSelection(),
      
      // Search functionality (Ctrl+F/Cmd+F)
      search({
        top: true
      }),
      highlightSelectionMatches(),
      keymap.of(searchKeymap),
      
      // Read-only editor
      EditorView.editable.of(false),
      
      // Basic theme with essential styles
      EditorView.theme({
        '&': {
          fontSize: '13px',
          fontFamily: 'SF Mono, Menlo, Ubuntu Mono, Consolas, source-code-pro, Monaco, monospace',
        },
        '.cm-editor': {
          height: '100%'
        },
        '.cm-content': {
          textAlign: 'left'
        },
        '.cm-line': {
          textAlign: 'left'
        },
        '.cm-focused': {
          outline: 'none'
        }
      })
    ];

    // Create initial state
    const initialState = EditorState.create({
      doc: text || '',
      extensions
    });

    // Create editor view
    const view = new EditorView({
      state: initialState,
      parent: editorRef.current
    });

    viewRef.current = view;

    // Cleanup function
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [text]); // Re-create editor when text changes

  return (
    <div className="text-viewer">
      {fileName && (
        <div className="text-viewer-header">
          <div className="header-left">
            <span className="file-name">{fileName}</span>
            <span className="file-mode">Text Mode</span>
          </div>
          <div className="header-right">
            <button 
              className="search-button"
              onClick={openSearch}
              title="Find in file (Ctrl+F / Cmd+F)"
            >
              🔍 Find
            </button>
          </div>
        </div>
      )}
      <div 
        ref={editorRef} 
        className="text-viewer-editor"
        style={{ 
          flex: 1,
          height: '100%',
          minHeight: 0
        }}
      />
    </div>
  );
};
