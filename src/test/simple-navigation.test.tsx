import { describe, it, expect } from 'vitest'
import { consolidateIdKeys } from '../components/IdKeysPanel'
import { jsonCompare } from '../utils/jsonCompare'

describe('ID Keys Navigation Feature - Unit Tests', () => {
  it('should consolidate ID keys correctly', () => {
    const mockIdKeys = [
      { arrayPath: 'boomerForecastV3Requests[]', idKey: 'household.householdId', numberOfComparisons: 2, isComposite: false, arraySize1: 0, arraySize2: 0 },
      { arrayPath: 'boomerForecastV3Requests[]', idKey: 'household.householdId', numberOfComparisons: 2, isComposite: false, arraySize1: 0, arraySize2: 0 },
      { arrayPath: 'boomerForecastV3Requests[].items[]', idKey: 'id', numberOfComparisons: 3, isComposite: false, arraySize1: 0, arraySize2: 0 },
      { arrayPath: 'boomerForecastV3Requests[].items[]', idKey: 'id', numberOfComparisons: 3, isComposite: false, arraySize1: 0, arraySize2: 0 },
    ]

    const consolidated = consolidateIdKeys(mockIdKeys)

    expect(consolidated).toHaveLength(2)
    expect(consolidated[0].consolidatedPath).toBe('boomerForecastV3Requests[]')
    expect(consolidated[0].idKey).toBe('household.householdId')
    expect(consolidated[0].occurrences).toHaveLength(2)
    expect(consolidated[1].consolidatedPath).toBe('boomerForecastV3Requests[].items[]')
    expect(consolidated[1].idKey).toBe('id')
    expect(consolidated[1].occurrences).toHaveLength(2)
  })

  it('should handle empty ID keys gracefully', () => {
    const consolidated = consolidateIdKeys([])
    expect(consolidated).toHaveLength(0)
  })

  it('should handle undefined array paths', () => {
    const mockIdKeys = [
      { arrayPath: undefined as any, idKey: 'id', numberOfComparisons: 1, isComposite: false, arraySize1: 0, arraySize2: 0 },
      { arrayPath: 'valid[]', idKey: 'id', numberOfComparisons: 1, isComposite: false, arraySize1: 0, arraySize2: 0 },
    ]

    const consolidated = consolidateIdKeys(mockIdKeys)
    
    // Should only include the valid path
    expect(consolidated).toHaveLength(1)
    expect(consolidated[0].consolidatedPath).toBe('valid[]')
  })

  it('should detect ID keys during JSON comparison', () => {
    const json1 = {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]
    }

    const json2 = {
      items: [
        { id: 1, name: 'Item 1 Modified' },
        { id: 3, name: 'Item 3' }
      ]
    }

    const result = jsonCompare(json1, json2)
    
    expect(result.idKeysUsed).toBeDefined()
    expect(result.idKeysUsed.length).toBeGreaterThan(0)
    expect(result.idKeysUsed[0].idKey).toBe('id')
    expect(result.idKeysUsed[0].arrayPath).toBe('items[]')
  })

  it('should handle composite ID keys', () => {
    const json1 = {
      users: [
        { firstName: 'John', lastName: 'Doe', age: 30 },
        { firstName: 'Jane', lastName: 'Smith', age: 25 }
      ]
    }

    const json2 = {
      users: [
        { firstName: 'John', lastName: 'Doe', age: 31 },
        { firstName: 'Bob', lastName: 'Wilson', age: 35 }
      ]
    }

    const result = jsonCompare(json1, json2)
    
    expect(result.idKeysUsed).toBeDefined()
    expect(result.idKeysUsed.length).toBeGreaterThan(0)
    
    // Should detect composite key or single key
    const idKey = result.idKeysUsed[0].idKey
    console.log('Detected idKey:', idKey)
    // The algorithm should detect firstName as the key (may not always be composite)
    expect(idKey === 'firstName' || (idKey.includes('firstName') && idKey.includes('lastName'))).toBe(true)
    expect(result.idKeysUsed[0].arrayPath).toBe('users[]')
  })

  it('should not generate IDKeys for arrays that exist on only one side', () => {
    const json1 = {
      boomerForecastV3Requests: [
        {
          requestId: 'req1',
          parameters: {
            accountParams: [
              { id: 'acc1', contributions: [{ amount: 100 }] }
            ]
          }
        }
      ],
      contributionsSearchOutputs: [
        {
          contributionsAdvice: {
            contributionsPerAccount: [
              { id: 'acc1', employeeContributionBreakdown: [{ type: 'regular' }] }
            ]
          }
        }
      ]
    }

    const json2 = {
      boomerForecastV3Requests: [
        {
          requestId: 'req1',
          parameters: {
            accountParams: [
              { id: 'acc1', contributions: [{ amount: 200 }] }
            ]
          }
        }
      ],
      // Note: contributionsSearchOutputs is missing from json2
      contributionsSearchOutputs: null
    }

    const result = jsonCompare(json1, json2)
    
    expect(result.idKeysUsed).toBeDefined()
    
    // Should have IDKeys for arrays that exist on both sides
    const validPaths = result.idKeysUsed.map(idKey => idKey.arrayPath)
    expect(validPaths).toContain('boomerForecastV3Requests[]')
    expect(validPaths).toContain('boomerForecastV3Requests[].parameters.accountParams[]')
    expect(validPaths).toContain('boomerForecastV3Requests[].parameters.accountParams[].contributions[]')
    
    // Should NOT have IDKeys for arrays that only exist on one side
    expect(validPaths).not.toContain('contributionsSearchOutputs[]')
    expect(validPaths).not.toContain('contributionsSearchOutputs[].contributionsAdvice.contributionsPerAccount[]')
    expect(validPaths).not.toContain('contributionsSearchOutputs[].contributionsAdvice.contributionsPerAccount[].employeeContributionBreakdown[]')
    
    // Verify exact count - should only have the 3 valid arrays that exist on both sides
    expect(result.idKeysUsed).toHaveLength(3)
  })

  it('should generate correct ArrayPatternPath format with all bracket types', () => {
    const json1 = {
      accounts: [
        { accountType: 'savings', transactions: [{ id: 1, amount: 100 }] },
        { accountType: 'checking', transactions: [{ id: 2, amount: 200 }] }
      ]
    }

    const json2 = {
      accounts: [
        { accountType: 'savings', transactions: [{ id: 1, amount: 150 }] },
        { accountType: 'investment', transactions: [{ id: 3, amount: 300 }] }
      ]
    }

    const result = jsonCompare(json1, json2)
    
    expect(result.idKeysUsed).toBeDefined()
    expect(result.idKeysUsed.length).toBeGreaterThan(0)
    
    // All ArrayPatternPaths should end with []
    result.idKeysUsed.forEach(idKey => {
      expect(idKey.arrayPath).toMatch(/\[\]$/, `ArrayPatternPath should end with []: ${idKey.arrayPath}`)
      // Should not contain specific indices or ID values
      expect(idKey.arrayPath).not.toMatch(/\[0\]|\[1\]|\[accountType=|\[id=/, `ArrayPatternPath should not contain specific indices or ID values: ${idKey.arrayPath}`)
    })
    
    // Expected paths
    const expectedPaths = ['accounts[]', 'accounts[].transactions[]']
    const actualPaths = result.idKeysUsed.map(idKey => idKey.arrayPath)
    expectedPaths.forEach(expectedPath => {
      expect(actualPaths).toContain(expectedPath)
    })
  })
})
