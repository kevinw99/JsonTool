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

  // Debug logging for taxRates array specifically
  const isTaxRatesArray = arr1.some(item => item && typeof item === 'object' && 'federalMarginalTaxRate' in item) ||
                         arr2.some(item => item && typeof item === 'object' && 'federalMarginalTaxRate' in item);
  
  if (isTaxRatesArray) {
    console.log('[DEBUG] taxRates array detected:', {
      arr1Length: arr1.length,
      arr2Length: arr2.length,
      objArr1Length: objArr1.length,
      objArr2Length: objArr2.length,
      arr1Sample: arr1[0],
      arr2Sample: arr2[0]
    });
  }

  // Heuristic: Only consider idKey if arrays predominantly consist of objects.
  const minObjectProportion = 0.8;
  if (
    (arr1.length > 0 && objArr1.length / arr1.length < minObjectProportion) ||
    (arr2.length > 0 && objArr2.length / arr2.length < minObjectProportion)
  ) {
    if (isTaxRatesArray) {
      console.log('[DEBUG] taxRates failed object proportion check:', {
        arr1Proportion: arr1.length > 0 ? objArr1.length / arr1.length : 0,
        arr2Proportion: arr2.length > 0 ? objArr2.length / arr2.length : 0,
        threshold: minObjectProportion
      });
    }
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
  
  if (isTaxRatesArray) {
    console.log('[DEBUG] taxRates candidateKeys:', candidateKeys);
  }

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
    const keyName = isComposite ? keyOrKeys.join('+') : keyOrKeys;
    
    if (isTaxRatesArray) {
      console.log(`[DEBUG] taxRates testing key: ${keyName}`);
    }

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
          if (isTaxRatesArray) {
            console.log(`[DEBUG] taxRates key ${keyName} failed validation:`, arr.map(item => {
              if (isComposite) {
                const result: any = {};
                (keyOrKeys as string[]).forEach(k => {
                  result[k] = { value: item[k], hasKey: k in item, type: typeof item[k] };
                });
                return result;
              } else {
                return { [keyOrKeys]: item[keyOrKeys], hasKey: keyOrKeys in item, type: typeof item[keyOrKeys] };
              }
            }));
          }
          return false;
        }
      }
    }

    // Test uniqueness within each array
    const valuesSet: Set<string>[] = [new Set(), new Set()];
    const sourceArrays = [objArr1, objArr2];
    
    for (let i = 0; i < 2; i++) {
      const arr = sourceArrays[i];
      if (arr.length > 0) {
        for (const item of arr) {
          const compositeValue = isComposite 
            ? (keyOrKeys as string[]).map(k => String(item[k])).join('|')
            : String(item[keyOrKeys]);
          valuesSet[i].add(compositeValue);
        }
        
        if (valuesSet[i].size !== arr.length) {
          if (isTaxRatesArray) {
            const values = arr.map(item => 
              isComposite 
                ? (keyOrKeys as string[]).map(k => String(item[k])).join('|')
                : String(item[keyOrKeys])
            );
            console.log(`[DEBUG] taxRates key ${keyName} failed uniqueness:`, {
              arrayIndex: i,
              arrayLength: arr.length,
              uniqueValues: valuesSet[i].size,
              values
            });
          }
          return false;
        }
      }
    }

    // Test overlap between arrays
    if (objArr1.length > 0 && objArr2.length > 0) {
      const commonValues = new Set(
        [...valuesSet[0]].filter((v) => valuesSet[1].has(v))
      );
      const minUniqueValues = Math.min(valuesSet[0].size, valuesSet[1].size);

      if (minUniqueValues === 0 && (valuesSet[0].size > 0 || valuesSet[1].size > 0)) {
        if (isTaxRatesArray) {
          console.log(`[DEBUG] taxRates key ${keyName} failed - empty array with non-empty array`);
        }
        return false;
      } else if (minUniqueValues > 0 && (commonValues.size / minUniqueValues) < 0.5) {
        if (isTaxRatesArray) {
          console.log(`[DEBUG] taxRates key ${keyName} failed overlap check:`, {
            commonValues: commonValues.size,
            minUniqueValues,
            overlapRatio: commonValues.size / minUniqueValues,
            threshold: 0.5,
            values1: [...valuesSet[0]],
            values2: [...valuesSet[1]],
            commonValuesList: [...commonValues]
          });
        }
        return false;
      }
    } else if (objArr1.length === 0 && objArr2.length === 0) {
      return false;
    }

    if (isTaxRatesArray) {
      console.log(`[DEBUG] taxRates found valid idKey: ${keyName}`);
    }
    return true;
  };

  // Try single keys first
  for (const key of candidateKeys) {
    if (testKey(key)) {
      return key;
    }
  }

  // If no single key works, try composite keys (combinations of 2-3 keys)
  if (isTaxRatesArray) {
    console.log('[DEBUG] taxRates trying composite keys...');
  }

  // Try combinations of 2 keys
  for (let i = 0; i < candidateKeys.length; i++) {
    for (let j = i + 1; j < candidateKeys.length; j++) {
      const compositeKey = [candidateKeys[i], candidateKeys[j]];
      if (testKey(compositeKey)) {
        return compositeKey.join('+'); // Return as "key1+key2"
      }
    }
  }

  // Try combinations of 3 keys (for more complex scenarios)
  for (let i = 0; i < candidateKeys.length; i++) {
    for (let j = i + 1; j < candidateKeys.length; j++) {
      for (let k = j + 1; k < candidateKeys.length; k++) {
        const compositeKey = [candidateKeys[i], candidateKeys[j], candidateKeys[k]];
        if (testKey(compositeKey)) {
          return compositeKey.join('+'); // Return as "key1+key2+key3"
        }
      }
    }
  }

  if (isTaxRatesArray) {
    console.log('[DEBUG] taxRates no valid idKey found (including composite keys)');
  }
  return null;
}

// ...existing code...

export function jsonCompare(
  originalObj1: any,
  originalObj2: any,
  initialDisplayPath: string = "root",
  initialNumericPath: string = "root"
): JsonCompareResult {
  const diffs: DiffResult[] = [];
  const idKeysUsed: IdKeyInfo[] = [];

  // Deep clone inputs to ensure original objects are not mutated by sorting,
  // and to return the versions of JSON that were actually compared.
  let processedJson1 = JSON.parse(JSON.stringify(originalObj1));
  let processedJson2 = JSON.parse(JSON.stringify(originalObj2));

  // Initial sort for root-level arrays if applicable
  if (Array.isArray(processedJson1) && Array.isArray(processedJson2)) {
    const idKey = findIdKey(processedJson1, processedJson2);
    if (idKey) {
      idKeysUsed.push({
        arrayPath: initialDisplayPath,
        idKey: idKey,
        isComposite: idKey.includes('+'),
        arraySize1: processedJson1.length,
        arraySize2: processedJson2.length
      });
      
      // Helper function to handle both single and composite keys for sorting
      const isCompositeKey = idKey.includes('+');
      const keyParts = isCompositeKey ? idKey.split('+') : [idKey];
      
      const getKeyValue = (item: any): string => {
        if (isCompositeKey) {
          return keyParts.map(k => String(item[k])).join('|');
        } else {
          return String(item[idKey]);
        }
      };
      
      processedJson1.sort((a: any, b: any) => getKeyValue(a).localeCompare(getKeyValue(b)));
      processedJson2.sort((a: any, b: any) => getKeyValue(a).localeCompare(getKeyValue(b)));
    } else if (
      processedJson1.length > 0 || // Allow sorting even if one is empty after clone
      processedJson2.length > 0 
    ) {
        // Check if both (if non-empty) are arrays of primitives
        const isP1PrimitiveArray = processedJson1.length === 0 || processedJson1.every((val: any) => typeof val !== "object" || val === null);
        const isP2PrimitiveArray = processedJson2.length === 0 || processedJson2.every((val: any) => typeof val !== "object" || val === null);

        if (isP1PrimitiveArray && isP2PrimitiveArray) {
            if (processedJson1.length > 0) processedJson1.sort((a: any, b: any) => String(a).localeCompare(String(b)));
            if (processedJson2.length > 0) processedJson2.sort((a: any, b: any) => String(a).localeCompare(String(b)));
        }
    }
  }

  function compareRecursively(
    item1: any,
    item2: any,
    currentDisplayPath: string,
    currentNumericPath: string
  ) {
    const type1 = typeof item1;
    const type2 = typeof item2;

    if (
      type1 !== type2 ||
      (item1 === null && item2 !== null) || (item1 !== null && item2 === null) ||
      (type1 === "undefined" && type2 !== "undefined") || (type1 !== "undefined" && type2 === "undefined")
    ) {
      const diffType =
            item1 === undefined && item2 !== undefined ? "added" :
            item1 !== undefined && item2 === undefined ? "removed" :
            "changed";
      diffs.push({
        displayPath: currentDisplayPath,
        numericPath: currentNumericPath,
        type: diffType,
        value1: item1,
        value2: item2,
      });
      return;
    }

    if (item1 === item2) { // Handles identical primitives, nulls, and same object/array references
      return;
    }

    // At this point, item1 !== item2. Types are the same. Neither is undefined if the other isn't.
    // Both are non-null or both are defined objects/arrays/primitives.

    if (Array.isArray(item1)) { // item2 is also an array
      const arr1 = item1 as any[]; // item1 and item2 are references from processedJson1/2
      const arr2 = item2 as any[];

      const idKey = findIdKey(arr1, arr2);

      if (idKey) {
        // Track this idKey usage
        idKeysUsed.push({
          arrayPath: currentDisplayPath,
          idKey: idKey,
          isComposite: idKey.includes('+'),
          arraySize1: arr1.length,
          arraySize2: arr2.length
        });
        
        // Helper functions to handle both single and composite keys
        const isCompositeKey = idKey.includes('+');
        const keyParts = isCompositeKey ? idKey.split('+') : [idKey];
        
        const getKeyValue = (item: any): string => {
          if (isCompositeKey) {
            return keyParts.map(k => String(item[k])).join('|');
          } else {
            return String(item[idKey]);
          }
        };
        
        const getDisplayKeyValue = (item: any): string => {
          if (isCompositeKey) {
            return keyParts.map(k => `${k}=${item[k]}`).join(',');
          } else {
            return String(item[idKey]);
          }
        };

        // Arrays should already be sorted if they are the root, or sorted here if nested.
        // Ensure nested arrays are sorted if an idKey is found for them.
        // This modifies parts of processedJson1/processedJson2 directly.
        arr1.sort((a: any, b: any) => getKeyValue(a).localeCompare(getKeyValue(b)));
        arr2.sort((a: any, b: any) => getKeyValue(a).localeCompare(getKeyValue(b)));
        
        const map2 = new Map(
          arr2.map((val: any) => [getKeyValue(val), val])
        );
        const consumedFromMap2 = new Set<string>();

        arr1.forEach((val1: any, index1: number) => {
          const keyVal1 = getKeyValue(val1);
          const displayKeyVal1 = getDisplayKeyValue(val1);
          // Correctly use the detected idKey in displayPath
          const childDisplayPath = `${currentDisplayPath}[${displayKeyVal1}]`;
          const childNumericPath = `${currentNumericPath}[${index1}]`;

          if (map2.has(keyVal1)) {
            const val2FromMap = map2.get(keyVal1)!;
            consumedFromMap2.add(keyVal1);
            compareRecursively(
              val1,
              val2FromMap,
              childDisplayPath,
              childNumericPath
            );
          } else {
            diffs.push({
              displayPath: childDisplayPath,
              numericPath: childNumericPath,
              type: "removed",
              value1: val1,
              idKeyUsed: idKey,
            });
          }
        });

        arr2.forEach((val2: any, index2: number) => {
          const keyVal2 = getKeyValue(val2);
          const displayKeyVal2 = getDisplayKeyValue(val2);
          if (!consumedFromMap2.has(keyVal2)) {
            // Correctly use the detected idKey in displayPath
            const childDisplayPath = `${currentDisplayPath}[${displayKeyVal2}]`;
            const childNumericPath = `${currentNumericPath}[${index2}]`;
            diffs.push({
              displayPath: childDisplayPath,
              numericPath: childNumericPath,
              type: "added",
              value2: val2,
              idKeyUsed: idKey,
            });
          }
        });
      } else { // No idKey, numeric comparison for arrays
        // Sort primitive arrays if not already sorted by root-level sort
        const isP1PrimitiveArray = arr1.length === 0 || arr1.every((val: any) => typeof val !== "object" || val === null);
        const isP2PrimitiveArray = arr2.length === 0 || arr2.every((val: any) => typeof val !== "object" || val === null);

        if (isP1PrimitiveArray && isP2PrimitiveArray) {
            if (arr1.length > 0) arr1.sort((a: any, b: any) => String(a).localeCompare(String(b)));
            if (arr2.length > 0) arr2.sort((a: any, b: any) => String(a).localeCompare(String(b)));
        }

        const maxLength = Math.max(arr1.length, arr2.length);
        for (let i = 0; i < maxLength; i++) {
          const v1 = arr1[i];
          const v2 = arr2[i];
          // Ensure displayPath and numericPath are derived from their respective current paths
          const childDisplayPath = `${currentDisplayPath}[${i}]`; 
          const childNumericPath = `${currentNumericPath}[${i}]`;

          if (i < arr1.length && i < arr2.length) {
            compareRecursively(v1, v2, childDisplayPath, childNumericPath);
          } else if (i < arr1.length) {
            diffs.push({
              displayPath: childDisplayPath,
              numericPath: childNumericPath,
              type: "removed",
              value1: v1,
            });
          } else { // i < arr2.length
            diffs.push({
              displayPath: childDisplayPath,
              numericPath: childNumericPath,
              type: "added",
              value2: v2,
            });
          }
        }
      }
      return;
    }

    if (type1 === "object") { // item2 is also an object
      const obj1 = item1 as Record<string, any>;
      const obj2 = item2 as Record<string, any>;
      const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

      allKeys.forEach(key => {
        const v1 = obj1[key];
        const v2 = obj2[key];
        const childDisplayPath = `${currentDisplayPath}.${key}`;
        const childNumericPath = `${currentNumericPath}.${key}`;

        const keyInObj1 = Object.prototype.hasOwnProperty.call(obj1, key);
        const keyInObj2 = Object.prototype.hasOwnProperty.call(obj2, key);

        if (keyInObj1 && keyInObj2) {
          compareRecursively(v1, v2, childDisplayPath, childNumericPath);
        } else if (keyInObj1) {
          diffs.push({
            displayPath: childDisplayPath,
            numericPath: childNumericPath,
            type: "removed",
            value1: v1,
          });
        } else { // keyInObj2
          diffs.push({
            displayPath: childDisplayPath,
            numericPath: childNumericPath,
            type: "added",
            value2: v2,
          });
        }
      });
      return;
    }

    // Primitives of the same type but different values
    diffs.push({
      displayPath: currentDisplayPath,
      numericPath: currentNumericPath,
      type: "changed",
      value1: item1,
      value2: item2,
    });
  }

  compareRecursively(processedJson1, processedJson2, initialDisplayPath, initialNumericPath);

  return {
    diffs,
    processedJson1,
    processedJson2,
    idKeysUsed,
  };
}
