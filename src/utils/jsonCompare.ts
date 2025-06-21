export interface DiffResult {
  displayPath: string;
  numericPath: string;
  type: "added" | "removed" | "changed";
  value1?: any;
  value2?: any;
  idKeyUsed?: string | null;
}

export interface JsonCompareResult {
  diffs: DiffResult[];
  processedJson1: any;
  processedJson2: any;
}

function findIdKey(arr1: any[], arr2: any[]): string | null {
  if (!arr1.length && !arr2.length) return null;

  const getObjectItems = (arr: any[]) =>
    arr.filter((item) => typeof item === "object" && item !== null);
  const objArr1 = getObjectItems(arr1);
  const objArr2 = getObjectItems(arr2);

  // Heuristic: Only consider idKey if arrays predominantly consist of objects.
  // This threshold can be adjusted.
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

  for (const key of candidateKeys) {
    let keyIsValid = true;

    for (const arr of [objArr1, objArr2]) {
      if (
        arr.length > 0 &&
        !arr.every(
          (item) =>
            key in item &&
            (typeof item[key] === "string" || typeof item[key] === "number")
        )
      ) {
        keyIsValid = false;
        break;
      }
    }
    if (!keyIsValid) continue;

    const valuesSet: Set<any>[] = [new Set(), new Set()];
    const sourceArrays = [objArr1, objArr2];
    for (let i = 0; i < 2; i++) {
      const arr = sourceArrays[i];
      if (arr.length > 0) {
        for (const item of arr) valuesSet[i].add(item[key]);
        if (valuesSet[i].size !== arr.length) {
          keyIsValid = false;
          break;
        }
      }
    }
    if (!keyIsValid) continue;

    if (objArr1.length > 0 && objArr2.length > 0) {
      const commonValues = new Set(
        [...valuesSet[0]].filter((v) => valuesSet[1].has(v))
      );
      const minUniqueValues = Math.min(valuesSet[0].size, valuesSet[1].size);

      if (minUniqueValues === 0 && (valuesSet[0].size > 0 || valuesSet[1].size > 0)) {
        keyIsValid = false; 
      } else if (minUniqueValues > 0 && (commonValues.size / minUniqueValues) < 0.5) { // 50% overlap threshold
        keyIsValid = false;
      }
    } else if (objArr1.length === 0 && objArr2.length === 0) {
      keyIsValid = false; 
    }
    // If one array is empty of objects, key remains valid if it passed checks for the non-empty one.

    if (keyIsValid) {
      return key;
    }
  }
  return null;
}

export function jsonCompare(
  originalObj1: any,
  originalObj2: any,
  initialDisplayPath: string = "root",
  initialNumericPath: string = "root"
): JsonCompareResult {
  const diffs: DiffResult[] = [];

  // Deep clone inputs to ensure original objects are not mutated by sorting,
  // and to return the versions of JSON that were actually compared.
  let processedJson1 = JSON.parse(JSON.stringify(originalObj1));
  let processedJson2 = JSON.parse(JSON.stringify(originalObj2));

  // Initial sort for root-level arrays if applicable
  if (Array.isArray(processedJson1) && Array.isArray(processedJson2)) {
    const idKey = findIdKey(processedJson1, processedJson2);
    if (idKey) {
      processedJson1.sort((a: any, b: any) => String(a[idKey]).localeCompare(String(b[idKey])));
      processedJson2.sort((a: any, b: any) => String(a[idKey]).localeCompare(String(b[idKey])));
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
        // Arrays should already be sorted if they are the root, or sorted here if nested.
        // Ensure nested arrays are sorted if an idKey is found for them.
        // This modifies parts of processedJson1/processedJson2 directly.
        arr1.sort((a: any, b: any) => String(a[idKey]).localeCompare(String(b[idKey])));
        arr2.sort((a: any, b: any) => String(a[idKey]).localeCompare(String(b[idKey])));
        
        const map2 = new Map(
          arr2.map((val: any) => [val[idKey], val])
        );
        const consumedFromMap2 = new Set<any>();

        arr1.forEach((val1: any, index1: number) => {
          const idVal1 = val1[idKey];
          // Correctly use the detected idKey in displayPath
          const childDisplayPath = `${currentDisplayPath}[${idKey}=${idVal1}]`;
          const childNumericPath = `${currentNumericPath}[${index1}]`;

          if (map2.has(idVal1)) {
            const val2FromMap = map2.get(idVal1)!;
            consumedFromMap2.add(idVal1);
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
          const idVal2 = val2[idKey];
          if (!consumedFromMap2.has(idVal2)) {
            // Correctly use the detected idKey in displayPath
            const childDisplayPath = `${currentDisplayPath}[${idKey}=${idVal2}]`;
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
  };
}
