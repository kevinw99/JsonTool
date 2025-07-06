/**
 * JSON Text Editor Component using CodeMirror 6
 * Provides a feature-rich JSON text editor with syntax highlighting,
 * line numbers, and search functionality
 */

import React, { useEffect, useRef } from 'react';
import { EditorView, lineNumbers, keymap, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { searchKeymap, search } from '@codemirror/search';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, syntaxHighlighting, HighlightStyle, indentUnit } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { tags } from '@lezer/highlight';
import './JsonTextEditor.css';

interface JsonTextEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  height?: string;
}

export const JsonTextEditor: React.FC<JsonTextEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  theme = 'light',
  height = '400px'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Theme compartment for dynamic theme switching
  const themeCompartment = new Compartment();
  const readOnlyCompartment = new Compartment();

  // Create custom JSON syntax highlighting
  const jsonHighlightStyle = HighlightStyle.define([
    { tag: tags.string, color: '#032f62' }, // Blue for strings
    { tag: tags.number, color: '#1a01cc' }, // Purple for numbers
    { tag: tags.bool, color: '#e36209' }, // Orange for booleans
    { tag: tags.null, color: '#e36209' }, // Orange for null
    { tag: tags.keyword, color: '#d73a49' }, // Red for keywords
    { tag: tags.propertyName, color: '#881391' }, // Purple for object keys
    { tag: tags.punctuation, color: '#333333' }, // Dark gray for punctuation
    { tag: tags.bracket, color: '#333333' }, // Dark gray for brackets
    { tag: tags.brace, color: '#333333' }, // Dark gray for braces
  ]);

  useEffect(() => {
    if (!editorRef.current) return;

    // Clean up existing editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    // Create editor extensions
    const extensions = [
      // Core functionality
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      bracketMatching(),
      // Force 2-space indentation units but preserve existing indentation
      indentUnit.of("  "),
      
      // JSON language support
      json(),
      
      // Custom syntax highlighting
      syntaxHighlighting(jsonHighlightStyle),
      
      // Search functionality
      search({
        top: true,
        caseSensitive: false
      }),
      
      // Folding
      foldGutter({
        openText: '▼',
        closedText: '▶'
      }),
      
      // Keymaps
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap
      ]),
      
      // Theme compartment
      themeCompartment.of(theme === 'dark' ? oneDark : []),
      
      // Read-only compartment
      readOnlyCompartment.of(EditorView.editable.of(!readOnly)),
      
      // Update listener
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          onChange(update.state.doc.toString());
        }
      }),
      
      // Base theme customization with JSON syntax highlighting
      EditorView.baseTheme({
        '&': {
          fontSize: '13px',
          fontFamily: 'SF Mono, Menlo, Ubuntu Mono, Consolas, source-code-pro, Monaco, monospace',
          whiteSpace: 'pre'
        },
        '.cm-content': {
          whiteSpace: 'pre',
          overflowWrap: 'anywhere',
          tabSize: '2',
          textAlign: 'left'
        },
        '.cm-line': {
          whiteSpace: 'pre',
          textAlign: 'left'
        },
        '.cm-editor': {
          height: '100%',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column'
        },
        '.cm-scroller': {
          overflow: 'auto !important',
          maxHeight: '100%',
          flex: '1 1 auto'
        },
        '.cm-focused': {
          outline: 'none'
        },
        '.cm-lineNumbers': {
          backgroundColor: '#f8f8f8',
          borderRight: '1px solid #e1e1e1',
          color: '#999',
          paddingRight: '8px',
          paddingLeft: '4px',
          cursor: 'pointer'
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#e8f4fd'
        },
        '.cm-foldGutter': {
          width: '16px'
        },
        '.cm-searchMatch': {
          backgroundColor: '#ffff00',
          outline: '1px solid #ff6600'
        },
        '.cm-searchMatch-selected': {
          backgroundColor: '#ff6600'
        },
        '.cm-bracket-match': {
          backgroundColor: 'rgba(0, 255, 0, 0.2)',
          outline: '1px solid #00ff00'
        },
        // Make search panel match editor font size
        '.cm-search': {
          fontSize: '13px'
        },
        '.cm-search input': {
          fontSize: '13px',
          fontFamily: 'SF Mono, Menlo, Ubuntu Mono, Consolas, source-code-pro, Monaco, monospace'
        },
        '.cm-search button': {
          fontSize: '13px',
          fontFamily: 'SF Mono, Menlo, Ubuntu Mono, Consolas, source-code-pro, Monaco, monospace'
        },
        '.cm-search label': {
          fontSize: '13px',
          fontFamily: 'SF Mono, Menlo, Ubuntu Mono, Consolas, source-code-pro, Monaco, monospace'
        }
      })
    ];

    // Create initial state
    const safeInitialValue = value || '';
    
    const initialState = EditorState.create({
      doc: safeInitialValue,
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
  }, [value, theme, readOnly, height]); // Re-create editor when these props change

  // Method to focus the editor
  const focus = () => {
    if (viewRef.current) {
      viewRef.current.focus();
    }
  };

  // Method to find and highlight text
  const findText = (query: string) => {
    if (viewRef.current) {
      viewRef.current.focus();
      
      // Programmatically open search (Ctrl+F equivalent)
      const searchCommand = searchKeymap.find(k => k.key === 'Mod-f');
      if (searchCommand?.run) {
        searchCommand.run(viewRef.current);
      }
    }
  };

  return (
    <div className="json-text-editor-container">
      <div className="json-text-editor-toolbar">
        <div className="toolbar-section">
          <button 
            className="toolbar-button"
            onClick={() => findText('')}
            title="Find (Ctrl+F)"
          >
            🔍 Find
          </button>
          <button 
            className="toolbar-button"
            onClick={focus}
            title="Focus Editor"
          >
            📝 Focus
          </button>
        </div>
        <div className="toolbar-section">
          <span className="toolbar-info">
            {readOnly ? '👁️ Read Only' : '✏️ Editable'} | 
            Lines: {viewRef.current?.state.doc.lines || 0}
          </span>
        </div>
      </div>
      
      
      <div 
        ref={editorRef} 
        className={`json-text-editor ${theme}`}
        style={{ 
          height: 'calc(100% - 40px)', // Subtract toolbar height
          minHeight: 0, // Important for flexbox
          display: 'flex', 
          flexDirection: 'column' 
        }}
      />
    </div>
  );
};

export { JsonTextEditor as default };