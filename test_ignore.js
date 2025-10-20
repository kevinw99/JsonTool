// Simple test for ignore functionality - run this in browser console
console.log('🧪 Testing ignore functionality...');

// Test substring matching function
function testSubstringMatching() {
  const matchesPattern = (path, pattern) => {
    return path.toLowerCase().includes(pattern.toLowerCase());
  };

  const testCases = [
    // [path, pattern, expected]
    ['legacySavingsSlidersResponse.savingsSliders[0].externalId', 'externalId', true],
    ['legacySavingsSlidersResponse.savingsSliders[0].externalId', 'EXTERNALID', true],
    ['legacySavingsSlidersResponse.savingsSliders[0].externalId', 'external', true],
    ['legacySavingsSlidersResponse.savingsSliders[0].externalId', 'metadata', false],
    ['boomerForecastV3Requests[0].metadata.elapsedTime', 'elapsed', true],
    ['boomerForecastV3Requests[0].metadata.elapsedTime', 'time', true],
    ['boomerForecastV3Requests[0].metadata.elapsedTime', 'xyz', false],
  ];

  console.log('🔍 Testing substring matching:');
  let passed = 0;
  
  testCases.forEach(([path, pattern, expected], i) => {
    const result = matchesPattern(path, pattern);
    const success = result === expected;
    console.log(`  Test ${i + 1}: ${success ? '✅' : '❌'} "${pattern}" in "${path}" = ${result} (expected ${expected})`);
    if (success) passed++;
  });
  
  console.log(`📊 Substring matching tests: ${passed}/${testCases.length} passed`);
  return passed === testCases.length;
}

// Test the actual ignore functionality in the app
function testIgnoreFunctionality() {
  console.log('🔍 Testing ignore functionality in app...');
  
  // Check if ignore context methods are available
  if (typeof window.debugIgnorePattern !== 'function') {
    console.log('⚠️ Ignore test functions not available. You can manually test by:');
    console.log('  1. Add "externalId" to ignore patterns in the Ignored panel');
    console.log('  2. Check if diffs with "externalId" are filtered out');
    console.log('  3. Add "elapsed" to ignore patterns');
    console.log('  4. Check if diffs with "elapsed" are filtered out');
    return false;
  }
  
  // If available, test the ignore functionality
  return true;
}

// Helper to expose ignore testing functions
function exposeIgnoreTestHelpers() {
  console.log('🔧 Exposing ignore test helpers...');
  
  // Helper to manually test ignore patterns
  window.debugIgnorePattern = function(pattern) {
    console.log(`🧪 Testing ignore pattern: "${pattern}"`);
    
    // Add pattern to ignore list
    // This would need to be connected to the actual app context
    console.log('💡 To test: Add this pattern in the Ignored panel and check if diffs are filtered');
  };
  
  window.testIgnoreExamples = function() {
    console.log('🧪 Testing common ignore patterns:');
    const examples = ['externalId', 'elapsed', 'metadata', 'debug', 'uid'];
    examples.forEach(pattern => {
      console.log(`  - Pattern "${pattern}": Add to ignore panel to test`);
    });
  };
}

// Run tests
console.log('🚀 Starting ignore functionality tests...');
const substringTestPassed = testSubstringMatching();
const ignoreFunctionPassed = testIgnoreFunctionality();

exposeIgnoreTestHelpers();

console.log('\n📋 Test Summary:');
console.log(`  ✅ Substring matching: ${substringTestPassed ? 'PASSED' : 'FAILED'}`);
console.log(`  ⚠️ App ignore function: Manual testing required`);
console.log('\n💡 Next steps:');
console.log('  1. Load JSON files in the app');
console.log('  2. Open Ignored panel');
console.log('  3. Add "externalId" as ignore pattern');
console.log('  4. Check if externalId diffs disappear from diff list');
console.log('  5. Try other patterns like "elapsed", "metadata", etc.');

console.log('\n🎯 Available test helpers:');
console.log('  - window.testIgnoreExamples() - Show example patterns to test');
console.log('  - window.debugIgnorePattern("pattern") - Test a specific pattern');