import { diffArrays } from 'diff';

export interface DiffResult {
  displayPath: string;
  numericPath: string;
  type: "added" | "removed" | "changed";
  value1?: any;
  value2?: any;
  idKeyUsed?: string | null;
}

export interface IdKeyInfo {
  arrayPath: string;
  idKey: string;
  isComposite: boolean;
  arraySize1: number;
  arraySize2: number;
}

export interface JsonCompareResult {
  diffs: DiffResult[];
  processedJson1: any;
  processedJson2: any;
  idKeysUsed: IdKeyInfo[];
}

function findIdKey(arr1: any[], arr2: any[]): string | null {
  // Skip idKey detection for arrays with 0 or 1 length since there's no meaningful comparison
  if (arr1.length <= 1 && arr2.length <= 1) return null;
  
  // Also skip if either array is empty (original check)
  if (!arr1.length && !arr2.length) return null;

  // DEBUG: Add logging for simulationMixes arrays
  const hasAssetId = arr1.length > 0 && arr1[0] && typeof arr1[0] === 'object' && 'assetId' in arr1[0];
  if (hasAssetId) {
    console.log(`🔍 FIND_ID_KEY DEBUG: Array with assetId detected`);
    console.log(`🔍 arr1 length: ${arr1.length}, arr2 length: ${arr2.length}`);
    console.log(`🔍 Sample arr1[0]:`, arr1[0]);
    console.log(`🔍 Sample arr2[0]:`, arr2[0]);
  }

  const getObjectItems = (arr: any[]) =>
    arr.filter((item) => typeof item === "object" && item !== null);
  const objArr1 = getObjectItems(arr1);
  const objArr2 = getObjectItems(arr2);

  // Heuristic: Only consider idKey if arrays predominantly consist of objects.
  const minObjectProportion = 0.8;
  if (
    (arr1.length > 0 && objArr1.length / arr1.length < minObjectProportion) ||
    (arr2.length > 0 && objArr2.length / arr2.length < minObjectProportion)
  ) {
    return null;
  }
  if (objArr1.length === 0 && objArr2.length === 0) return null;

  const sampleObj = objArr1.length
    ? objArr1[0]
    : objArr2.length
    ? objArr2[0]
    : null;
  if (!sampleObj) return null;

  let candidateKeys = Object.keys(sampleObj);
  
  // For accounts array, prefer accountType over entityId since entityId might change
  if (objArr1.length > 0 && objArr1[0].entityId && objArr1[0].accountType) {
    if (candidateKeys.includes('accountType')) {
      candidateKeys = ['accountType', ...candidateKeys.filter(key => key !== 'accountType')];
    }
  }

  const preferredKeyNames = ["id", "key", "uuid", "name", "_id", "accountType", "assetId"];
  candidateKeys.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aPref = preferredKeyNames.indexOf(aLower);
    const bPref = preferredKeyNames.indexOf(bLower);

    if (aPref !== -1 && bPref !== -1) return aPref - bPref;
    if (aPref !== -1) return -1;
    if (bPref !== -1) return 1;
    return a.localeCompare(b);
  });

  // Helper function to test if a key (single or composite) is valid
  const testKey = (keyOrKeys: string | string[]): boolean => {
    const isComposite = Array.isArray(keyOrKeys);

    // Test if all items have the required key(s) and they are string/number
    for (const arr of [objArr1, objArr2]) {
      if (arr.length > 0) {
        const hasValidKeys = arr.every(item => {
          if (isComposite) {
            return (keyOrKeys as string[]).every(k => 
              k in item && (typeof item[k] === "string" || typeof item[k] === "number")
            );
          } else {
            return keyOrKeys in item && (typeof item[keyOrKeys] === "string" || typeof item[keyOrKeys] === "number");
          }
        });
        
        if (!hasValidKeys) {
          return false;
        }
      }
    }

    // Test uniqueness
    for (let arrayIndex = 0; arrayIndex < 2; arrayIndex++) {
      const arr = arrayIndex === 0 ? objArr1 : objArr2;
      if (arr.length <= 1) continue; // Skip uniqueness check for arrays with 0 or 1 items

      const values = arr.map(item => {
        if (isComposite) {
          return (keyOrKeys as string[]).map(k => item[k]).join('|');
        } else {
          return item[keyOrKeys];
        }
      });

      const uniqueValues = new Set(values);
      if (uniqueValues.size !== values.length) {
        return false;
      }
    }

    // Test overlap between the two arrays
    if (objArr1.length > 0 && objArr2.length > 0) {
      const getValueSet = (arr: any[]) => {
        return new Set(arr.map(item => {
          if (isComposite) {
            return (keyOrKeys as string[]).map(k => item[k]).join('|');
          } else {
            return item[keyOrKeys];
          }
        }));
      };

      const set1 = getValueSet(objArr1);
      const set2 = getValueSet(objArr2);
      
      // Check if arrays have overlapping values
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      if (intersection.size === 0) {
        return false;
      }
    }

    return true;
  };

  // First, try single keys
  for (const key of candidateKeys) {
    if (testKey(key)) {
      // DEBUG: Log when assetId arrays are found
      if (hasAssetId) {
        console.log(`🔍 FIND_ID_KEY DEBUG: Found ID key "${key}" for assetId array`);
      }
      return key;
    }
  }

  // If no single key works, try composite keys (pairs)
  for (let i = 0; i < candidateKeys.length; i++) {
    for (let j = i + 1; j < candidateKeys.length; j++) {
      const compositeKey = [candidateKeys[i], candidateKeys[j]];
      if (testKey(compositeKey)) {
        // DEBUG: Log when assetId arrays are found with composite key
        if (hasAssetId) {
          console.log(`🔍 FIND_ID_KEY DEBUG: Found composite ID key "${compositeKey.join('+')}" for assetId array`);
        }
        return compositeKey.join('+');
      }
    }
  }

  // DEBUG: Log when no ID key is found for assetId arrays
  if (hasAssetId) {
    console.log(`🔍 FIND_ID_KEY DEBUG: No ID key found for assetId array`);
    console.log(`🔍 Candidate keys were:`, candidateKeys);
  }

  return null;
}

function compareRecursively(
  obj1: any,
  obj2: any,
  path: string,
  numericPath: string,
  result: DiffResult[],
  idKeysUsed: IdKeyInfo[]
): void {
  if (obj1 === obj2) return;

  const type1 = getType(obj1);
  const type2 = getType(obj2);

  if (type1 !== type2) {
    result.push({
      displayPath: path,
      numericPath: numericPath,
      type: "changed",
      value1: obj1,
      value2: obj2,
    });
    return;
  }

  if (type1 === "array") {
    const arr1 = obj1 as any[];
    const arr2 = obj2 as any[];

    const idKey = findIdKey(arr1, arr2);
    if (idKey) {
      // DEBUG: Log when ID-based comparison is used
      if (path.includes('simulationMixes')) {
        console.log(`🎯 COMPARE_RECURSIVELY: Using ID-based comparison for ${path} with idKey: ${idKey}`);
      }
      
      // Store the idKey info
      idKeysUsed.push({
        arrayPath: path,
        idKey: idKey,
        isComposite: idKey.includes('+'),
        arraySize1: arr1.length,
        arraySize2: arr2.length
      });

      compareArraysWithIdKey(arr1, arr2, idKey, path, numericPath, result, idKeysUsed);
    } else {
      // DEBUG: Log when index-based comparison is used
      if (path.includes('simulationMixes')) {
        console.log(`❌ COMPARE_RECURSIVELY: Using INDEX-based comparison for ${path} (no idKey found)`);
      }
      compareArraysByIndex(arr1, arr2, path, numericPath, result, idKeysUsed);
    }
  } else if (type1 === "object") {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    const allKeys = new Set([...keys1, ...keys2]);

    for (const key of allKeys) {
      const newPath = path === "root" ? key : `${path}.${key}`;
      const newNumericPath = numericPath === "root" ? key : `${numericPath}.${key}`;

      if (!(key in obj1)) {
        result.push({
          displayPath: newPath,
          numericPath: newNumericPath,
          type: "added",
          value2: obj2[key],
        });
      } else if (!(key in obj2)) {
        result.push({
          displayPath: newPath,
          numericPath: newNumericPath,
          type: "removed",
          value1: obj1[key],
        });
      } else {
        compareRecursively(obj1[key], obj2[key], newPath, newNumericPath, result, idKeysUsed);
      }
    }
  } else {
    result.push({
      displayPath: path,
      numericPath: numericPath,
      type: "changed",
      value1: obj1,
      value2: obj2,
    });
  }
}

function compareArraysWithIdKey(
  arr1: any[],
  arr2: any[],
  idKey: string,
  path: string,
  numericPath: string,
  result: DiffResult[],
  idKeysUsed: IdKeyInfo[]
): void {
  // DEBUG: Check if this is the contributions array we're tracking
  if (path.includes('boomerForecastV3Requests') && path.includes('accountParams') && path.includes('contributions')) {
    console.log(`🔥 DIFF_COMPARE_DEBUG 🔥 Using diff library for path: ${path}`);
    console.log(`Using idKey: ${idKey}`);
    console.log(`arr1 length: ${arr1.length}, arr2 length: ${arr2.length}`);
  }

  // DEBUG: Check if this is a simulationMixes array
  if (path.includes('simulationMixes')) {
    console.log(`🔥 SIMULATION_MIXES_DEBUG 🔥 Using ID-based comparison for path: ${path}`);
    console.log(`🔥 Using idKey: ${idKey}`);
    console.log(`🔥 arr1 length: ${arr1.length}, arr2 length: ${arr2.length}`);
    console.log(`🔥 Sample arr1[0]:`, arr1[0]);
    console.log(`🔥 Sample arr2[0]:`, arr2[0]);
  }

  const isComposite = idKey.includes('+');
  const keyParts = isComposite ? idKey.split('+') : [idKey];

  const getIdValue = (item: any) => {
    if (isComposite) {
      return keyParts.map(k => item[k]).join('|');
    } else {
      return item[idKey];
    }
  };

  // Since arrays are pre-sorted by ID, use diff library for proper comparison
  const diff = diffArrays(arr1, arr2, {
    comparator: (left: any, right: any) => {
      // Compare items by their ID values
      if (typeof left === "object" && left !== null && 
          typeof right === "object" && right !== null) {
        const leftId = getIdValue(left);
        const rightId = getIdValue(right);
        return leftId === rightId;
      }
      // Fallback to JSON comparison for non-objects
      return JSON.stringify(left) === JSON.stringify(right);
    }
  });

  let leftIndex = 0;
  let rightIndex = 0;

  diff.forEach((part) => {
    if (part.removed) {
      // Items removed from left array
      part.value.forEach((item: any) => {
        const id = typeof item === "object" && item !== null ? getIdValue(item) : String(leftIndex);
        const displayPath = path === "root" ? `[${idKey}=${id}]` : `${path}[${idKey}=${id}]`;
        const newNumericPath = numericPath === "root" ? `[${leftIndex}]` : `${numericPath}[${leftIndex}]`;
        
        result.push({
          displayPath: displayPath,
          numericPath: newNumericPath,
          type: "removed",
          value1: item,
          idKeyUsed: idKey,
        });
        leftIndex++;
      });
    } else if (part.added) {
      // Items added to right array
      part.value.forEach((item: any) => {
        const id = typeof item === "object" && item !== null ? getIdValue(item) : String(rightIndex);
        const displayPath = path === "root" ? `[${idKey}=${id}]` : `${path}[${idKey}=${id}]`;
        const newNumericPath = numericPath === "root" ? `[${rightIndex}]` : `${numericPath}[${rightIndex}]`;
        
        result.push({
          displayPath: displayPath,
          numericPath: newNumericPath,
          type: "added",
          value2: item,
          idKeyUsed: idKey,
        });
        rightIndex++;
      });
    } else {
      // Items that are the same (by ID) - compare their content
      part.value.forEach((item: any) => {
        const leftItem = arr1[leftIndex];
        const rightItem = arr2[rightIndex];
        
        const id = typeof item === "object" && item !== null ? getIdValue(item) : String(leftIndex);
        const displayPath = path === "root" ? `[${idKey}=${id}]` : `${path}[${idKey}=${id}]`;
        const newNumericPath = numericPath === "root" ? `[${leftIndex}]` : `${numericPath}[${leftIndex}]`;
        
        // Recursively compare the content of items with same ID
        compareRecursively(leftItem, rightItem, displayPath, newNumericPath, result, idKeysUsed);
        
        leftIndex++;
        rightIndex++;
      });
    }
  });
}

function compareArraysByIndex(
  arr1: any[],
  arr2: any[],
  path: string,
  numericPath: string,
  result: DiffResult[],
  idKeysUsed: IdKeyInfo[]
): void {
  const maxLength = Math.max(arr1.length, arr2.length);

  for (let i = 0; i < maxLength; i++) {
    const newPath = path === "root" ? `[${i}]` : `${path}[${i}]`;
    const newNumericPath = numericPath === "root" ? `[${i}]` : `${numericPath}[${i}]`;

    if (i >= arr1.length) {
      result.push({
        displayPath: newPath,
        numericPath: newNumericPath,
        type: "added",
        value2: arr2[i],
      });
    } else if (i >= arr2.length) {
      result.push({
        displayPath: newPath,
        numericPath: newNumericPath,
        type: "removed",
        value1: arr1[i],
      });
    } else {
      compareRecursively(arr1[i], arr2[i], newPath, newNumericPath, result, idKeysUsed);
    }
  }
}

function getType(value: any): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function jsonCompare(json1: any, json2: any): JsonCompareResult {
  const result: DiffResult[] = [];
  const idKeysUsed: IdKeyInfo[] = [];
  compareRecursively(json1, json2, "root", "root", result, idKeysUsed);
  return {
    diffs: result,
    processedJson1: json1,
    processedJson2: json2,
    idKeysUsed,
  };
}

// Function to detect ID keys in a single JSON structure (for standalone file analysis)
export function detectIdKeysInSingleJson(data: any, basePath: string = ""): IdKeyInfo[] {
  const idKeys: IdKeyInfo[] = [];
  
  function traverse(obj: any, currentPath: string) {
    if (Array.isArray(obj)) {
      // Reuse the existing findIdKey logic by creating a duplicate array for comparison
      const idKey = findIdKey(obj, obj); // Use same array for both parameters
      if (idKey) {
        idKeys.push({
          arrayPath: currentPath,
          idKey: idKey,
          isComposite: idKey.includes('+'),
          arraySize1: obj.length,
          arraySize2: obj.length
        });
      }
      
      // Continue traversing array elements
      obj.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          traverse(item, `${currentPath}[${index}]`);
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      // Traverse object properties
      Object.keys(obj).forEach(key => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        traverse(obj[key], newPath);
      });
    }
  }
  
  traverse(data, basePath);
  return idKeys;
}
