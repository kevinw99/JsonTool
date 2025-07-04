// Comprehensive debug system for correlation analysis
export interface CorrelationDebugInfo {
  arrayPath: string;
  leftArray: any[];
  rightArray: any[];
  idKey: string;
  leftIds: string[];
  rightIds: string[];
  correlationMap: Map<string, {leftIndex: number, rightIndex: number}>;
  additions: {id: string, rightIndex: number, item: any}[];
  removals: {id: string, leftIndex: number, item: any}[];
  matches: {id: string, leftIndex: number, rightIndex: number, leftItem: any, rightItem: any}[];
  expectedAlignment: {leftIndex: number, rightIndex: number, reason: string}[];
}

export function debugArrayCorrelation(
  arrayPath: string,
  leftArray: any[],
  rightArray: any[],
  idKey: string
): CorrelationDebugInfo {
  const isComposite = idKey.includes('+');
  const keyParts = isComposite ? idKey.split('+') : [idKey];

  const getIdValue = (item: any) => {
    if (typeof item !== 'object' || item === null) return String(item);
    if (isComposite) {
      return keyParts.map(k => item[k]).join('|');
    } else {
      return item[idKey];
    }
  };

  const leftIds = leftArray.map(getIdValue);
  const rightIds = rightArray.map(getIdValue);

  // Create correlation maps
  const leftMap = new Map();
  const rightMap = new Map();
  
  leftArray.forEach((item, index) => {
    const id = getIdValue(item);
    leftMap.set(id, {item, index});
  });

  rightArray.forEach((item, index) => {
    const id = getIdValue(item);
    rightMap.set(id, {item, index});
  });

  // Analyze correlations
  const correlationMap = new Map();
  const additions = [];
  const removals = [];
  const matches = [];

  // Find removals
  for (const [id, {item, index}] of leftMap) {
    if (!rightMap.has(id)) {
      removals.push({id, leftIndex: index, item});
    }
  }

  // Find additions and matches
  for (const [id, {item, index}] of rightMap) {
    if (!leftMap.has(id)) {
      additions.push({id, rightIndex: index, item});
    } else {
      const leftInfo = leftMap.get(id);
      matches.push({
        id, 
        leftIndex: leftInfo.index, 
        rightIndex: index, 
        leftItem: leftInfo.item, 
        rightItem: item
      });
      correlationMap.set(id, {leftIndex: leftInfo.index, rightIndex: index});
    }
  }

  // Generate expected alignment
  const expectedAlignment = [];
  
  // Sort matches by left array order for consistent alignment
  const sortedMatches = matches.sort((a, b) => a.leftIndex - b.leftIndex);
  
  for (const match of sortedMatches) {
    expectedAlignment.push({
      leftIndex: match.leftIndex,
      rightIndex: match.rightIndex,
      reason: `ID match: ${match.id}`
    });
  }

  return {
    arrayPath,
    leftArray,
    rightArray,
    idKey,
    leftIds,
    rightIds,
    correlationMap,
    additions,
    removals,
    matches,
    expectedAlignment
  };
}

export function logCorrelationDebug(debug: CorrelationDebugInfo) {
  console.group(`🔍 CORRELATION DEBUG: ${debug.arrayPath}`);
  
  console.log('📊 Array Overview:');
  console.log(`  Left array length: ${debug.leftArray.length}`);
  console.log(`  Right array length: ${debug.rightArray.length}`);
  console.log(`  ID Key: ${debug.idKey}`);
  
  console.log('🆔 ID Analysis:');
  console.log('  Left IDs:', debug.leftIds);
  console.log('  Right IDs:', debug.rightIds);
  
  console.log('🔄 Correlation Results:');
  console.log(`  Matches: ${debug.matches.length}`);
  console.log(`  Additions: ${debug.additions.length}`);
  console.log(`  Removals: ${debug.removals.length}`);
  
  if (debug.matches.length > 0) {
    console.log('✅ Matches:');
    debug.matches.forEach(match => {
      console.log(`    ID: ${match.id} → Left[${match.leftIndex}] ↔ Right[${match.rightIndex}]`);
    });
  }
  
  if (debug.additions.length > 0) {
    console.log('➕ Additions (in right only):');
    debug.additions.forEach(add => {
      console.log(`    ID: ${add.id} → Right[${add.rightIndex}] (NEW)`);
    });
  }
  
  if (debug.removals.length > 0) {
    console.log('➖ Removals (in left only):');
    debug.removals.forEach(rem => {
      console.log(`    ID: ${rem.id} → Left[${rem.leftIndex}] (REMOVED)`);
    });
  }
  
  console.log('🎯 Expected Alignment:');
  debug.expectedAlignment.forEach(align => {
    console.log(`    Left[${align.leftIndex}] ↔ Right[${align.rightIndex}] (${align.reason})`);
  });
  
  console.groupEnd();
  
  return debug;
}

// Global debug function for manual invocation
if (typeof window !== 'undefined') {
  (window as any).debugCorrelation = (arrayPath: string) => {
    console.log(`🚀 Manual debug invoked for path: ${arrayPath}`);
    // This will be called manually from the context menu or console
    // The actual implementation will be added to the tree view component
  };
}