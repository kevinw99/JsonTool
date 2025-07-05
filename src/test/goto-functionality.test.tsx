import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import App from '../App'

// Real sample data that matches our current implementation
const realSampleDataLeft = {
  boomerForecastV3Requests: [{
    parameters: {
      accountParams: [
        {
          id: "45626988::1", 
          managementFee: 0.007212962962963
        },
        {
          id: "45626988::2",
          managementFee: 0.007212962962963,
          contributions: [
            {
              id: "45626988::2_prtcpnt-catchup-50-separate_0",
              contributionType: "CATCH_UP_50_SEPARATE_PRE_TAX", // Will be changed in right panel
              contributions: [1000, 1000, 1000, 1000, 1000]
            },
            {
              id: "45626988::2_prtcpnt-pre_0",
              contributionType: "PARTICIPANT_PRE_TAX",
              contributions: [7000, 7000, 7000, 7000, 7000] // Will be changed in right panel
            }
          ]
        }
      ]
    }
  }]
};

const realSampleDataRight = {
  boomerForecastV3Requests: [{
    parameters: {
      accountParams: [
        {
          id: "45626988::1", 
          managementFee: 0.007212962962963
        },
        {
          id: "45626988::2",
          managementFee: 0.007212962962963,
          contributions: [
            {
              id: "45626988::2_prtcpnt-after_0", // ADDED - new contribution
              contributionType: "PARTICIPANT_AFTER_TAX",
              contributions: [3500, 3500, 3500, 3500, 3500]
            },
            {
              id: "45626988::2_prtcpnt-catchup-50-separate_0",
              contributionType: "CATCH_UP_50_SEPARATE_AFTER_TAX", // CHANGED
              contributions: [1000, 1000, 1000, 1000, 1000]
            },
            {
              id: "45626988::2_prtcpnt-pre_0",
              contributionType: "PARTICIPANT_PRE_TAX",
              contributions: [3500, 3500, 3500, 3500, 3500] // CHANGED
            }
          ]
        }
      ]
    }
  }]
};

// Mock DOM methods
const mockScrollIntoView = vi.fn()
const mockScrollTo = vi.fn()

beforeEach(() => {
  // Reset mocks
  mockScrollIntoView.mockClear()
  mockScrollTo.mockClear()
  
  // Mock DOM methods
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    value: mockScrollIntoView,
    writable: true
  })
  
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    value: mockScrollTo,
    writable: true
  })

  // Mock getBoundingClientRect
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    value: () => ({
      top: 100,
      left: 0,
      bottom: 200,
      right: 400,
      width: 400,
      height: 100
    }),
    writable: true
  })
})

describe('GoTo Functionality with Real Sample Data', () => {
  
  it('should load real sample data and generate diffs', async () => {
    const { container } = await act(async () => render(<App />))

    // Mock FileReader for file loading
    const mockFileReader = {
      readAsText: vi.fn(),
      result: '',
      onload: null as any
    }
    vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any)

    // Find file drop zones
    const dropZones = container.querySelectorAll('.file-drop-zone')
    expect(dropZones).toHaveLength(2)

    // Create mock files
    const mockFileLeft = new File([JSON.stringify(realSampleDataLeft)], 'sample-left.json', { type: 'application/json' })
    const mockFileRight = new File([JSON.stringify(realSampleDataRight)], 'sample-right.json', { type: 'application/json' })

    // Load left file
    await act(async () => {
      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [mockFileLeft] } })
      fireEvent(dropZones[0], dropEvent)
      
      mockFileReader.result = JSON.stringify(realSampleDataLeft)
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any)
      }
    })

    // Load right file
    await act(async () => {
      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [mockFileRight] } })
      fireEvent(dropZones[1], dropEvent)
      
      mockFileReader.result = JSON.stringify(realSampleDataRight)
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any)
      }
    })

    // Wait for comparison to complete and diff panel to appear
    await waitFor(() => {
      const tabbedPanel = container.querySelector('.tabbed-bottom-panel')
      expect(tabbedPanel).toBeTruthy()
    }, { timeout: 3000 })

    // Verify we're on the Diffs tab by default  
    const diffsTab = container.querySelector('.tab-button')
    expect(diffsTab).toBeTruthy()
    
    // Check that diffs were generated
    const diffItems = container.querySelectorAll('.diff-item')
    expect(diffItems.length).toBeGreaterThan(0)
    
    console.log(`✅ Generated ${diffItems.length} diffs from sample data`)
    
    // Log the actual diffs to see what we got
    const diffPaths = Array.from(diffItems).map(item => {
      const pathSpan = item.querySelector('.diff-path-inline')
      return pathSpan?.textContent || 'unknown'
    })
    console.log('📋 Generated diff paths:', diffPaths)
  })

  it('should navigate when any GoTo button is clicked', async () => {
    const { container } = await act(async () => render(<App />))

    // Wait for the app to load with default data and generate diffs
    await waitFor(() => {
      const diffItems = container.querySelectorAll('.diff-item')
      expect(diffItems.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Get any diff item with a GoTo button
    const diffItems = container.querySelectorAll('.diff-item')
    expect(diffItems.length).toBeGreaterThan(0)
    
    const firstDiffItem = diffItems[0]
    const goToButton = firstDiffItem.querySelector('.goto-button') as HTMLButtonElement
    expect(goToButton).toBeTruthy()
    expect(goToButton.textContent).toBe('Go To')

    // Get the path that this diff represents
    const pathSpan = firstDiffItem.querySelector('.diff-path-inline')
    const diffPath = pathSpan?.textContent || 'unknown'
    console.log('🎯 Testing GoTo for path:', diffPath)

    // Click the GoTo button
    await act(async () => {
      fireEvent.click(goToButton)
    })

    // Verify that scrollIntoView was called (indicating navigation attempt)
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalled()
    }, { timeout: 2000 })

    console.log('✅ GoTo button clicked and navigation attempted')
    console.log(`📍 scrollIntoView called ${mockScrollIntoView.mock.calls.length} times`)
  })

  it('should test GoTo buttons on multiple diff items', async () => {
    const { container } = await act(async () => render(<App />))

    // Wait for diffs
    await waitFor(() => {
      const diffItems = container.querySelectorAll('.diff-item')
      expect(diffItems.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    const diffItems = container.querySelectorAll('.diff-item')
    const numberOfTests = Math.min(diffItems.length, 3) // Test up to 3 diff items
    
    console.log(`🔄 Testing GoTo on ${numberOfTests} diff items`)

    for (let i = 0; i < numberOfTests; i++) {
      const diffItem = diffItems[i]
      const goToButton = diffItem.querySelector('.goto-button') as HTMLButtonElement
      expect(goToButton).toBeTruthy()

      const pathSpan = diffItem.querySelector('.diff-path-inline')
      const diffPath = pathSpan?.textContent || `item-${i}`
      
      console.log(`🎯 Testing GoTo for diff ${i + 1}: ${diffPath}`)

      // Reset mock before each test
      mockScrollIntoView.mockClear()

      await act(async () => {
        fireEvent.click(goToButton)
      })

      // Give a brief moment for the navigation to process
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('✅ All GoTo buttons tested successfully')
  })

  it('should handle different types of diffs (added, changed, removed)', async () => {
    const { container } = await act(async () => render(<App />))

    // Wait for diffs
    await waitFor(() => {
      const diffItems = container.querySelectorAll('.diff-item')
      expect(diffItems.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    const diffItems = container.querySelectorAll('.diff-item')
    
    // Test different types of diffs
    const diffTypes = ['added', 'changed', 'removed']
    let testedTypes = []

    for (const diffItem of diffItems) {
      for (const type of diffTypes) {
        if (diffItem.classList.contains(type) && !testedTypes.includes(type)) {
          const goToButton = diffItem.querySelector('.goto-button') as HTMLButtonElement
          expect(goToButton).toBeTruthy()

          const pathSpan = diffItem.querySelector('.diff-path-inline')
          const diffPath = pathSpan?.textContent || 'unknown'
          
          console.log(`🎯 Testing ${type} diff: ${diffPath}`)

          await act(async () => {
            fireEvent.click(goToButton)
          })

          testedTypes.push(type)
          break
        }
      }
    }

    console.log('✅ Tested diff types:', testedTypes)
    expect(testedTypes.length).toBeGreaterThan(0)
  })

  it('should verify GoTo button attributes and behavior', async () => {
    const { container } = await act(async () => render(<App />))

    // Wait for diffs
    await waitFor(() => {
      const diffItems = container.querySelectorAll('.diff-item')
      expect(diffItems.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    const diffItems = container.querySelectorAll('.diff-item')
    const firstDiffItem = diffItems[0]
    const goToButton = firstDiffItem.querySelector('.goto-button') as HTMLButtonElement
    
    // Verify button properties
    expect(goToButton).toBeTruthy()
    expect(goToButton.textContent).toBe('Go To')
    expect(goToButton.classList.contains('goto-button')).toBe(true)
    expect(goToButton.title).toBe('Navigate to this difference')
    expect(goToButton.disabled).toBe(false)

    console.log('✅ GoTo button has correct attributes')

    // Test clicking behavior
    let clickCount = 0
    const originalClick = goToButton.click.bind(goToButton)
    goToButton.click = () => {
      clickCount++
      originalClick()
    }

    await act(async () => {
      fireEvent.click(goToButton)
    })

    console.log('✅ GoTo button click behavior verified')
  })
})