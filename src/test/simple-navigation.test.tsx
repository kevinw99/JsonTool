import { describe, it, expect } from 'vitest'
import { consolidateIdKeys } from '../components/IdKeysPanel'
import { jsonCompare } from '../utils/jsonCompare'

describe('ID Keys Navigation Feature - Unit Tests', () => {
  it('should consolidate ID keys correctly', () => {
    const mockIdKeys = [
      { arrayPath: 'boomerForecastV3Requests[0]', idKey: 'household.householdId', numberOfComparisons: 2, isComposite: false, arraySize1: 0, arraySize2: 0 },
      { arrayPath: 'boomerForecastV3Requests[1]', idKey: 'household.householdId', numberOfComparisons: 2, isComposite: false, arraySize1: 0, arraySize2: 0 },
      { arrayPath: 'boomerForecastV3Requests[0].items[0]', idKey: 'id', numberOfComparisons: 3, isComposite: false, arraySize1: 0, arraySize2: 0 },
      { arrayPath: 'boomerForecastV3Requests[0].items[1]', idKey: 'id', numberOfComparisons: 3, isComposite: false, arraySize1: 0, arraySize2: 0 },
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
      { arrayPath: 'valid[0]', idKey: 'id', numberOfComparisons: 1, isComposite: false, arraySize1: 0, arraySize2: 0 },
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
    expect(result.idKeysUsed[0].arrayPath).toContain('items')
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
    
    // Should detect firstName+lastName as composite key
    const idKey = result.idKeysUsed[0].idKey
    expect(idKey).toContain('firstName')
    expect(idKey).toContain('lastName')
  })
})
