export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject { [key: string]: JSONValue; }
export interface JSONArray extends Array<JSONValue> {}

export interface DiffResult {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: JSONValue;
  newValue?: JSONValue;
}

// Helper function to find potential ID fields in an array of objects
function findIdField(arr: JSONArray): string | null {
  if (!arr.length || typeof arr[0] !== 'object' || arr[0] === null) return null;
  
  // Common ID field name patterns
  const commonIdFields = [
    'id', 'ID', '_id', 'uuid', 'guid', 'key', 'name', 'type', 'accountId', 'userId', 'code',
    'accountDomainId', 'domainId', 'accountNumber', 'number', 'index', 'position', 'sequence',
    'order', 'rank'
  ];

  // Check exact match fields first
  // First check direct properties
  for (const field of commonIdFields) {
    if (arr.every(item => 
      typeof item === 'object' && 
      item !== null && 
      field in (item as JSONObject) && 
      (typeof (item as JSONObject)[field] === 'string' || typeof (item as JSONObject)[field] === 'number')
    )) {
      return field;
    }
  }

  // Then look for fields with naming patterns that suggest they might be IDs
  if (arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null) {
    const obj = arr[0] as JSONObject;
    const candidateFields: string[] = [];
    
    // Get all properties from the first object
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      // Check if the field name contains 'id' and is not already in commonIdFields
      if ((lowerKey.includes('id') || 
           lowerKey.endsWith('key') || 
           lowerKey.endsWith('name') || 
           lowerKey.endsWith('code') ||
           lowerKey.includes('hash') || 
           lowerKey.includes('ref')) && 
          !commonIdFields.includes(key)) {
        candidateFields.push(key);
      }
    });
    
    // Check if any candidate field exists in all objects and has proper value types
    for (const field of candidateFields) {
      if (arr.every(item => 
        typeof item === 'object' && 
        item !== null && 
        field in (item as JSONObject) && 
        (typeof (item as JSONObject)[field] === 'string' || typeof (item as JSONObject)[field] === 'number')
      )) {
        return field;
      }
    }
  }
  
  // Then check for nested properties (one level deep)
  // First with predefined common fields
  for (const field of commonIdFields) {
    const objKeys = Object.keys((arr[0] as JSONObject));
    for (const nestedKey of objKeys) {
      const nestedPath = `${nestedKey}.${field}`;
      if (arr.every((item): boolean => {
        if (typeof item !== 'object' || item === null) return false;
        const nestedValue: JSONValue = (item as JSONObject)[nestedKey];
        return typeof nestedValue === 'object' && nestedValue !== null && 
              field in (nestedValue as JSONObject) && 
              (typeof (nestedValue as JSONObject)[field] === 'string' || typeof (nestedValue as JSONObject)[field] === 'number');
      })) {
        return nestedPath;
      }
    }
  }
  
  // Then check for nested properties that match ID patterns
  const objKeys = Object.keys((arr[0] as JSONObject));
  for (const nestedKey of objKeys) {
    const nestedObj = (arr[0] as JSONObject)[nestedKey];
    if (typeof nestedObj === 'object' && nestedObj !== null) {
      const nestedFields = Object.keys(nestedObj as JSONObject);
      
      // Filter fields that look like IDs
      const candidateNestedFields = nestedFields.filter(field => {
        const lowerField = field.toLowerCase();
        return lowerField.includes('id') || 
               lowerField.endsWith('key') || 
               lowerField.endsWith('name') || 
               lowerField.endsWith('code') ||
               lowerField.includes('hash') || 
               lowerField.includes('ref');
      });
      
      // Check each candidate nested field
      for (const field of candidateNestedFields) {
        const nestedPath = `${nestedKey}.${field}`;
        if (arr.every((item): boolean => {
          if (typeof item !== 'object' || item === null) return false;
          const nestedValue: JSONValue = (item as JSONObject)[nestedKey];
          return typeof nestedValue === 'object' && nestedValue !== null && 
                field in (nestedValue as JSONObject) && 
                (typeof (nestedValue as JSONObject)[field] === 'string' || typeof (nestedValue as JSONObject)[field] === 'number');
        })) {
          return nestedPath;
        }
      }
    }
  }
  
  // If all items have the same keys and there's only one key, use it
  if (arr.length > 0 && 
      typeof arr[0] === 'object' && 
      arr[0] !== null && 
      Object.keys(arr[0] as JSONObject).length === 1) {
    const onlyKey = Object.keys(arr[0] as JSONObject)[0];
    if (arr.every(item => 
      typeof item === 'object' && 
      item !== null && 
      Object.keys(item as JSONObject).length === 1 && 
      onlyKey in (item as JSONObject)
    )) {
      return onlyKey;
    }
  }
  
  return null;
}

// Helper function to get value from an object using dot notation path
function getValueByPath(obj: JSONObject, path: string): JSONValue | null {
  const parts = path.split('.');
  let current: JSONValue = obj;
  
  for (const part of parts) {
    if (typeof current !== 'object' || current === null || !(part in (current as JSONObject))) {
      return null;
    }
    current = (current as JSONObject)[part];
  }
  
  return current;
}

export function compareJSON(a: JSONValue, b: JSONValue, path = ''): DiffResult[] {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    return [{ path, type: 'changed', oldValue: a, newValue: b }];
  }
  if (typeof a !== 'object' || a === null || b === null) {
    return a === b ? [] : [{ path, type: 'changed', oldValue: a, newValue: b }];
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const diffs: DiffResult[] = [];
    
    // Special case: If arrays have the same length and contain the same elements but in different order
    // and the elements are simple objects with the same structure, we can consider them equal
    if (a.length === b.length && a.length > 0 && 
        a.every(item => typeof item === 'object' && item !== null) &&
        b.every(item => typeof item === 'object' && item !== null)) {
      
      // For simple arrays of objects with consistent structure, we can try to match them
      // by comparing their structure and content without requiring a specific ID field
      
      // First, check if all objects have the same keys structure
      const allSameStructure = a.every((itemA) => {
        if (typeof itemA !== 'object' || itemA === null) return false;
        const keysA = Object.keys(itemA as JSONObject).sort().join(',');
        return b.some((itemB) => {
          if (typeof itemB !== 'object' || itemB === null) return false;
          const keysB = Object.keys(itemB as JSONObject).sort().join(',');
          return keysA === keysB;
        });
      });
      
      if (allSameStructure) {
        console.log(`Arrays at path: ${path} have consistent structure, checking for reordering`);
        
        // Create a deep copy and try to match elements
        const bCopy = [...b];
        let allMatched = true;
        
        for (const itemA of a) {
          let foundMatch = false;
          for (let i = 0; i < bCopy.length; i++) {
            const itemB = bCopy[i];
            // Compare the objects by stringifying (not perfect but works for simple cases)
            if (JSON.stringify(itemA) === JSON.stringify(itemB)) {
              bCopy.splice(i, 1); // Remove the matched item
              foundMatch = true;
              break;
            }
          }
          
          if (!foundMatch) {
            allMatched = false;
            break;
          }
        }
        
        if (allMatched && bCopy.length === 0) {
          // console.log(`Arrays at path: ${path} contain same elements in different order, marking as equal`);
          return []; // Arrays contain the same elements, just in different order
        }
      }
    }
    
    // Try to identify a common ID field for intelligent comparison
    const idField = findIdField(a) || findIdField(b);
    
    // Log the identified ID field for debugging
    if (idField) {
      console.log(`Using '${idField}' as identifier for array at path: ${path}`);
    }
    
    if (idField && a.length > 0 && b.length > 0 && 
        typeof a[0] === 'object' && a[0] !== null &&
        typeof b[0] === 'object' && b[0] !== null) {
      // Use intelligent key-based comparison when ID field is found
      const aMap = new Map<string, JSONValue>();
      const bMap = new Map<string, JSONValue>();
      
      // Build maps of objects by their ID
      a.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          let idValue: JSONValue | null;
          if (idField.includes('.')) {
            idValue = getValueByPath(item as JSONObject, idField);
          } else {
            idValue = (item as JSONObject)[idField];
          }
          
          if (idValue !== null && idValue !== undefined) {
            aMap.set(String(idValue), item);
          }
        }
      });
      
      b.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          let idValue: JSONValue | null;
          if (idField.includes('.')) {
            idValue = getValueByPath(item as JSONObject, idField);
          } else {
            idValue = (item as JSONObject)[idField];
          }
          
          if (idValue !== null && idValue !== undefined) {
            bMap.set(String(idValue), item);
          }
        }
      });
      
      // Find items in a but not in b (removed)
      aMap.forEach((item, id) => {
        if (!bMap.has(id)) {
          diffs.push({
            path: `${path}[${idField}=${id}]`, // Include which field was used as identifier
            type: 'removed',
            oldValue: item
          });
        }
      });
      
      // Find items in b but not in a (added)
      bMap.forEach((item, id) => {
        if (!aMap.has(id)) {
          diffs.push({
            path: `${path}[${idField}=${id}]`, // Include which field was used as identifier
            type: 'added',
            newValue: item
          });
        }
      });
      
      // Compare items present in both arrays
      const commonIds = [...aMap.keys()].filter(id => bMap.has(id));
      for (const id of commonIds) {
        const aItem = aMap.get(id);
        const bItem = bMap.get(id);
        // Ensure items are not undefined
        if (aItem !== undefined && bItem !== undefined) {
          // Only compare the properties, not the container itself
          // This will ensure the differences are properly tracked at the property level
          // and the container itself won't be marked as changed unless it needs to be
          const childDiffs = compareJSON(aItem, bItem, `${path}[${idField}=${id}]`);
          
          // Only add diffs for properties, not for the container node itself
          const propertyDiffs = childDiffs.filter(diff => {
            // Skip diffs that are for the exact container path - we only want property changes
            return diff.path !== `${path}[${idField}=${id}]`;
          });
          
          diffs.push(...propertyDiffs);
        }
      }
      
      return diffs;
    }
    
    // Try another approach for arrays of objects without clear IDs
    // If the arrays have the same length and all objects look structurally similar
    if (a.length === b.length && a.length > 0 &&
        a.every(item => typeof item === 'object' && item !== null) &&
        b.every(item => typeof item === 'object' && item !== null)) {
        
      // Check if we can find reasonable matches for each object based on most similar object
      const matchedIndices = new Set<number>();
      let anyDifferences = false;
      
      // For each item in array A, find the best match in array B
      for (let i = 0; i < a.length; i++) {
        const itemA = a[i];
        let bestMatchIndex = -1;
        let bestMatchScore = -1;
        
        // Find the most similar object in B that hasn't been matched yet
        for (let j = 0; j < b.length; j++) {
          if (matchedIndices.has(j)) continue; // Skip already matched items
          
          const itemB = b[j];
          const keysA = Object.keys(itemA as JSONObject);
          const keysB = Object.keys(itemB as JSONObject);
          
          // Calculate a similarity score based on common keys and values
          let score = 0;
          for (const key of keysA) {
            if (keysB.includes(key)) {
              if (JSON.stringify((itemA as JSONObject)[key]) === JSON.stringify((itemB as JSONObject)[key])) {
                score += 2; // Exact value match
              } else {
                score += 1; // Key exists but value differs
              }
            }
          }
          
          if (score > bestMatchScore) {
            bestMatchScore = score;
            bestMatchIndex = j;
          }
        }
        
        // If we found a reasonable match
        if (bestMatchIndex >= 0) {
          // Mark this B index as used
          matchedIndices.add(bestMatchIndex);
          
          // Compare the objects and add any differences
          const itemDiffs = compareJSON(itemA, b[bestMatchIndex], `${path}[${i}]`);
          if (itemDiffs.length > 0) {
            anyDifferences = true;
            diffs.push(...itemDiffs.filter(diff => diff.path !== `${path}[${i}]`)); // Skip container diffs
          }
        }
      }
      
      // If we successfully matched all items and found any differences
      if (matchedIndices.size === b.length) {
        if (!anyDifferences) {
          console.log(`Arrays at path: ${path} have same content in possibly different order`);
        }
        return diffs;
      }
    }
    
    // Fall back to index-based comparison if no better matching was possible
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= a.length) diffs.push({ path: `${path}[${i}]`, type: 'added', newValue: b[i] });
      else if (i >= b.length) diffs.push({ path: `${path}[${i}]`, type: 'removed', oldValue: a[i] });
      else diffs.push(...compareJSON(a[i], b[i], `${path}[${i}]`));
    }
    return diffs;
  }
  // Both are objects
  const diffs: DiffResult[] = [];
  const aKeys = Object.keys(a as JSONObject);
  const bKeys = Object.keys(b as JSONObject);
  for (const key of aKeys) {
    if (!(key in (b as JSONObject))) {
      diffs.push({ path: path ? `${path}.${key}` : key, type: 'removed', oldValue: (a as JSONObject)[key] });
    } else {
      diffs.push(...compareJSON((a as JSONObject)[key], (b as JSONObject)[key], path ? `${path}.${key}` : key));
    }
  }
  for (const key of bKeys) {
    if (!(key in (a as JSONObject))) {
      diffs.push({ path: path ? `${path}.${key}` : key, type: 'added', newValue: (b as JSONObject)[key] });
    }
  }
  return diffs;
}
