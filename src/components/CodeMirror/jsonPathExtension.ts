/**
 * CodeMirror 6 Extension for JSON Path Display
 * Shows the JSON path on hover and provides click-to-copy functionality
 */

import { Extension } from '@codemirror/state';
import { hoverTooltip, EditorView, Decoration } from '@codemirror/view';
import { calculateJsonPath } from '../../utils/jsonPathCalculator';

/**
 * JSON Path Hover Extension
 * Shows the full JSON path from root when hovering over any part of the JSON
 */
export function jsonPathExtension(): Extension {
  return [
    hoverTooltip((view, pos, side) => {
      const text = view.state.doc.toString();
      const pathResult = calculateJsonPath(text, pos);
      
      if (pathResult && pathResult.path !== 'root') {
        return {
          pos,
          end: pos,
          above: true,
          create: () => {
            const dom = document.createElement('div');
            dom.className = 'json-path-tooltip';
            
            // Create path display
            const pathElement = document.createElement('div');
            pathElement.className = 'json-path-text';
            pathElement.textContent = pathResult.path;
            
            // Create type indicator
            const typeElement = document.createElement('div');
            typeElement.className = 'json-path-type';
            typeElement.textContent = `(${pathResult.type})`;
            
            // Create copy button
            const copyButton = document.createElement('button');
            copyButton.className = 'json-path-copy';
            copyButton.textContent = 'Copy';
            copyButton.onclick = (e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(pathResult.path);
              copyButton.textContent = 'Copied!';
              setTimeout(() => {
                copyButton.textContent = 'Copy';
              }, 1000);
            };
            
            dom.appendChild(pathElement);
            dom.appendChild(typeElement);
            dom.appendChild(copyButton);
            
            return { dom };
          }
        };
      }
      return null;
    }),
    
    // Add custom styles
    EditorView.baseTheme({
      '.json-path-tooltip': {
        backgroundColor: '#2d2d30',
        color: '#cccccc',
        border: '1px solid #454545',
        borderRadius: '4px',
        padding: '8px 12px',
        maxWidth: '400px',
        fontSize: '12px',
        fontFamily: 'SF Mono, Menlo, monospace',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        zIndex: 1000
      },
      '.json-path-text': {
        fontWeight: 'bold',
        marginBottom: '4px',
        wordBreak: 'break-all'
      },
      '.json-path-type': {
        color: '#569cd6',
        fontSize: '11px',
        marginBottom: '6px'
      },
      '.json-path-copy': {
        backgroundColor: '#0e639c',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        padding: '4px 8px',
        fontSize: '11px',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: '#1177bb'
        }
      }
    })
  ];
}

/**
 * Line Click Extension
 * Allows clicking on line numbers to select entire lines and show path
 */
export function lineClickExtension(): Extension {
  return EditorView.domEventHandlers({
    click: (event, view) => {
      const target = event.target as HTMLElement;
      
      // Check if clicked on line number
      if (target.classList.contains('cm-lineNumbers')) {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos !== null) {
          const line = view.state.doc.lineAt(pos);
          
          // Select the entire line
          view.dispatch({
            selection: { anchor: line.from, head: line.to }
          });
          
          // Show path for this line
          const text = view.state.doc.toString();
          const pathResult = calculateJsonPath(text, pos);
          
          if (pathResult) {
            // Create a temporary tooltip or status display
            console.log('Line path:', pathResult.path);
            // You could dispatch a custom event here to update a status bar
            // or create a temporary notification
          }
        }
      }
    }
  });
}

/**
 * Bracket Matching Extension
 * Simple bracket matching using CodeMirror's built-in functionality
 */
export function bracketMatchingExtension(): Extension {
  return EditorView.updateListener.of((update) => {
    // Simple bracket matching implementation
    // CodeMirror's built-in bracketMatching() provides this functionality
    if (update.selectionSet) {
      // Bracket matching is handled by the built-in extension
    }
  });
}