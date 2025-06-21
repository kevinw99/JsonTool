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

  const preferredKeyNames = ["id", "key", "uuid", "name", "_id"];
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
      return key;
    }
  }

  // If no single key works, try composite keys (pairs)
  for (let i = 0; i < candidateKeys.length; i++) {
    for (let j = i + 1; j < candidateKeys.length; j++) {
      const compositeKey = [candidateKeys[i], candidateKeys[j]];
      if (testKey(compositeKey)) {
        return compositeKey.join('+');
      }
    }
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
  const isComposite = idKey.includes('+');
  const keyParts = isComposite ? idKey.split('+') : [idKey];

  const getIdValue = (item: any) => {
    if (isComposite) {
      return keyParts.map(k => item[k]).join('|');
    } else {
      return item[idKey];
    }
  };

  const map1 = new Map();
  const map2 = new Map();

  arr1.forEach((item, index) => {
    if (typeof item === "object" && item !== null) {
      const id = getIdValue(item);
      map1.set(id, { item, index });
    }
  });

  arr2.forEach((item, index) => {
    if (typeof item === "object" && item !== null) {
      const id = getIdValue(item);
      map2.set(id, { item, index });
    }
  });

  const allIds = new Set([...map1.keys(), ...map2.keys()]);

  for (const id of allIds) {
    const entry1 = map1.get(id);
    const entry2 = map2.get(id);

    if (!entry1) {
      const newPath = path === "root" ? `[${entry2.index}]` : `${path}[${entry2.index}]`;
      const newNumericPath = numericPath === "root" ? `[${entry2.index}]` : `${numericPath}[${entry2.index}]`;
      result.push({
        displayPath: newPath,
        numericPath: newNumericPath,
        type: "added",
        value2: entry2.item,
        idKeyUsed: idKey,
      });
    } else if (!entry2) {
      const newPath = path === "root" ? `[${entry1.index}]` : `${path}[${entry1.index}]`;
      const newNumericPath = numericPath === "root" ? `[${entry1.index}]` : `${numericPath}[${entry1.index}]`;
      result.push({
        displayPath: newPath,
        numericPath: newNumericPath,
        type: "removed",
        value1: entry1.item,
        idKeyUsed: idKey,
      });
    } else {
      const newPath = path === "root" ? `[${entry1.index}]` : `${path}[${entry1.index}]`;
      const newNumericPath = numericPath === "root" ? `[${entry1.index}]` : `${numericPath}[${entry1.index}]`;
      compareRecursively(entry1.item, entry2.item, newPath, newNumericPath, result, idKeysUsed);
    }
  }
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
