/**
 * JSON Path Calculator for CodeMirror Text Editor
 * Calculates the JSON path from root to the current cursor position
 */

interface JsonPathResult {
  path: string;
  key?: string;
  value?: any;
  type: 'key' | 'value' | 'punctuation' | 'unknown';
}

/**
 * Calculate the JSON path at a specific position in the text
 */
export function calculateJsonPath(text: string, position: number): JsonPathResult | null {
  try {
    // Parse the JSON to validate it's valid
    const jsonData = JSON.parse(text);
    
    // Get the line and column from position
    const beforeCursor = text.substring(0, position);
    const lines = beforeCursor.split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;
    
    // Find the path by analyzing the structure up to the cursor position
    const path = findJsonPathAtPosition(text, position, jsonData);
    return path;
  } catch (error) {
    // If JSON is invalid, return null
    return null;
  }
}

/**
 * Find the JSON path at a specific position by analyzing the text structure
 */
function findJsonPathAtPosition(text: string, position: number, jsonData: any): JsonPathResult | null {
  const beforeCursor = text.substring(0, position);
  const currentChar = text[position];
  
  // Tokenize the JSON up to the cursor position
  const tokens = tokenizeJson(beforeCursor);
  
  // Build the path from tokens
  const pathComponents: string[] = ['root'];
  let currentType: 'key' | 'value' | 'punctuation' | 'unknown' = 'unknown';
  let currentKey: string | undefined;
  let currentValue: any;
  
  // Track the current context (object or array)
  const contextStack: Array<{type: 'object' | 'array', key?: string}> = [{type: 'object'}];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const context = contextStack[contextStack.length - 1];
    
    switch (token.type) {
      case 'string':
        if (context.type === 'object' && tokens[i + 1]?.type === 'colon') {
          // This is a key
          currentKey = token.value.slice(1, -1); // Remove quotes
          pathComponents.push(currentKey);
          currentType = 'key';
        } else {
          // This is a string value
          currentValue = token.value;
          currentType = 'value';
        }
        break;
        
      case 'number':
      case 'boolean':
      case 'null':
        currentValue = token.value;
        currentType = 'value';
        break;
        
      case 'left_brace':
        contextStack.push({type: 'object'});
        break;
        
      case 'right_brace':
        contextStack.pop();
        if (pathComponents.length > 1) {
          pathComponents.pop();
        }
        break;
        
      case 'left_bracket':
        contextStack.push({type: 'array'});
        break;
        
      case 'right_bracket':
        contextStack.pop();
        if (pathComponents.length > 1 && pathComponents[pathComponents.length - 1].startsWith('[')) {
          pathComponents.pop();
        }
        break;
        
      case 'comma':
        if (context.type === 'array') {
          // Increment array index
          const lastComponent = pathComponents[pathComponents.length - 1];
          if (lastComponent.startsWith('[')) {
            const index = parseInt(lastComponent.slice(1, -1)) + 1;
            pathComponents[pathComponents.length - 1] = `[${index}]`;
          } else {
            pathComponents.push('[0]');
          }
        } else if (context.type === 'object' && pathComponents.length > 1) {
          // Remove the last key in object context
          pathComponents.pop();
        }
        break;
        
      case 'colon':
        currentType = 'punctuation';
        break;
    }
  }
  
  // Determine if cursor is on a key or value based on surrounding characters
  const charAtPos = text[position];
  const charBefore = text[position - 1];
  
  if (charAtPos === '"' || charBefore === '"') {
    // Check if this is a key (followed by colon) or value
    const restOfText = text.substring(position);
    const nextColonIndex = restOfText.indexOf(':');
    const nextCommaIndex = restOfText.indexOf(',');
    const nextBraceIndex = restOfText.indexOf('}');
    
    if (nextColonIndex !== -1 && (nextCommaIndex === -1 || nextColonIndex < nextCommaIndex) && (nextBraceIndex === -1 || nextColonIndex < nextBraceIndex)) {
      currentType = 'key';
    } else {
      currentType = 'value';
    }
  }
  
  const fullPath = pathComponents.join('.');
  
  return {
    path: fullPath,
    key: currentKey,
    value: currentValue,
    type: currentType
  };
}

/**
 * Simple JSON tokenizer
 */
interface JsonToken {
  type: 'string' | 'number' | 'boolean' | 'null' | 'left_brace' | 'right_brace' | 'left_bracket' | 'right_bracket' | 'comma' | 'colon' | 'whitespace';
  value: string;
  position: number;
}

function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let i = 0;
  
  while (i < text.length) {
    const char = text[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // String
    if (char === '"') {
      let value = '"';
      i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\') {
          value += text[i] + (text[i + 1] || '');
          i += 2;
        } else {
          value += text[i];
          i++;
        }
      }
      if (i < text.length) value += '"';
      tokens.push({type: 'string', value, position: i - value.length + 1});
      i++;
      continue;
    }
    
    // Number
    if (/[-\d]/.test(char)) {
      let value = '';
      while (i < text.length && /[-\d.eE+]/.test(text[i])) {
        value += text[i];
        i++;
      }
      tokens.push({type: 'number', value, position: i - value.length});
      continue;
    }
    
    // Boolean and null
    if (char === 't' && text.substr(i, 4) === 'true') {
      tokens.push({type: 'boolean', value: 'true', position: i});
      i += 4;
      continue;
    }
    if (char === 'f' && text.substr(i, 5) === 'false') {
      tokens.push({type: 'boolean', value: 'false', position: i});
      i += 5;
      continue;
    }
    if (char === 'n' && text.substr(i, 4) === 'null') {
      tokens.push({type: 'null', value: 'null', position: i});
      i += 4;
      continue;
    }
    
    // Punctuation
    switch (char) {
      case '{':
        tokens.push({type: 'left_brace', value: char, position: i});
        break;
      case '}':
        tokens.push({type: 'right_brace', value: char, position: i});
        break;
      case '[':
        tokens.push({type: 'left_bracket', value: char, position: i});
        break;
      case ']':
        tokens.push({type: 'right_bracket', value: char, position: i});
        break;
      case ',':
        tokens.push({type: 'comma', value: char, position: i});
        break;
      case ':':
        tokens.push({type: 'colon', value: char, position: i});
        break;
    }
    
    i++;
  }
  
  return tokens;
}

/**
 * Get the value at a specific JSON path
 */
export function getValueAtPath(jsonData: any, path: string): any {
  try {
    const pathComponents = path.split('.').slice(1); // Remove 'root'
    let current = jsonData;
    
    for (const component of pathComponents) {
      if (component.startsWith('[') && component.endsWith(']')) {
        // Array index
        const index = parseInt(component.slice(1, -1));
        current = current[index];
      } else {
        // Object key
        current = current[component];
      }
    }
    
    return current;
  } catch (error) {
    return undefined;
  }
}