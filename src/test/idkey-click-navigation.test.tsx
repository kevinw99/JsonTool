import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import App from '../App'

// Sample test data for direct loading
const sampleData1 = {
  users: [
    { 
      id: 1, 
      name: 'John Doe', 
      profile: { age: 30, city: 'New York' },
      orders: [
        { orderId: 'A001', amount: 100 },
        { orderId: 'A002', amount: 250 }
      ]
    },
    { 
      id: 2, 
      name: 'Jane Smith', 
      profile: { age: 25, city: 'Boston' },
      orders: [
        { orderId: 'B001', amount: 150 }
      ]
    }
  ],
  metadata: {
    version: '1.0',
    timestamp: '2025-01-01'
  }
}

const sampleData2 = {
  users: [
    { 
      id: 1, 
      name: 'John Doe Updated', 
      profile: { age: 31, city: 'New York' },
      orders: [
        { orderId: 'A001', amount: 120 }, // Amount changed
        { orderId: 'A003', amount: 300 }  // New order
      ]
    },
    { 
      id: 3, 
      name: 'Bob Wilson', 
      profile: { age: 35, city: 'Chicago' },
      orders: [
        { orderId: 'C001', amount: 200 }
      ]
    }
  ],
  metadata: {
    version: '1.1', // Version updated
    timestamp: '2025-01-02'
  }
}

// Mock scroll methods
const mockScrollIntoView = vi.fn()
const mockScrollTo = vi.fn()

beforeEach(() => {
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
      right: 300,
      width: 300,
      height: 100
    }),
    writable: true
  })

  // Mock offsetHeight and scrollTop
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    value: 500,
    writable: true
  })

  Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
    value: 0,
    writable: true,
    configurable: true
  })

  // Clear mocks
  mockScrollIntoView.mockClear()
  mockScrollTo.mockClear()
})

describe('ID Key Click Navigation Tests', () => {
  it('should load sample data and display ID Keys panel', async () => {
    const { container } = await act(async () => render(<App />))

    // Directly set the data using the onFileDrop callback
    // First, we need to find the FileDropZone components and simulate data loading
    const app = container.querySelector('.App')
    expect(app).toBeTruthy()

    // Simulate loading data directly by triggering the file drop handlers
    // We'll find the drop zones and simulate file drops with our sample data
    const dropZones = container.querySelectorAll('.file-drop-zone')
    expect(dropZones).toHaveLength(2)

    // Create mock files with our sample data
    const mockFile1 = new File([JSON.stringify(sampleData1)], 'sample1.json', { type: 'application/json' })
    const mockFile2 = new File([JSON.stringify(sampleData2)], 'sample2.json', { type: 'application/json' })

    // Simulate file drops
    const dropEvent1 = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent1, 'dataTransfer', {
      value: { files: [mockFile1] }
    })

    const dropEvent2 = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent2, 'dataTransfer', {
      value: { files: [mockFile2] }
    })

    // Mock FileReader
    const mockFileReader = {
      readAsText: vi.fn(),
      result: '',
      onload: null as any
    }

    vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any)

    // Trigger first file drop
    await act(async () => {
      fireEvent(dropZones[0], dropEvent1)
      mockFileReader.result = JSON.stringify(sampleData1)
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any)
      }
    })

    // Trigger second file drop
    await act(async () => {
      fireEvent(dropZones[1], dropEvent2)
      mockFileReader.result = JSON.stringify(sampleData2)
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any)
      }
    })

    // Wait for comparison to complete
    await waitFor(() => {
      // Check if comparison has occurred by looking for the tabbed panel
      const tabbedPanel = container.querySelector('.tabbed-bottom-panel')
      expect(tabbedPanel).toBeTruthy()
    }, { timeout: 3000 })

    // Click on ID Keys tab to show the panel
    await act(async () => {
      const idKeysTab = screen.getByText('ID Keys')
      fireEvent.click(idKeysTab)
    })

    await waitFor(() => {
      // Verify ID Keys are displayed
      const idKeysPanel = container.querySelector('.id-keys-panel')
      expect(idKeysPanel).toBeTruthy()
    })
  })

  it('should expand nodes and scroll when ID Key path is clicked', async () => {
    const { container } = await act(async () => render(<App />))

    // Load sample data (same as above)
    const dropZones = container.querySelectorAll('.file-drop-zone')
    const mockFile1 = new File([JSON.stringify(sampleData1)], 'sample1.json', { type: 'application/json' })
    const mockFile2 = new File([JSON.stringify(sampleData2)], 'sample2.json', { type: 'application/json' })

    const dropEvent1 = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent1, 'dataTransfer', {
      value: { files: [mockFile1] }
    })

    const dropEvent2 = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent2, 'dataTransfer', {
      value: { files: [mockFile2] }
    })

    const mockFileReader = {
      readAsText: vi.fn(),
      result: '',
      onload: null as any
    }

    vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any)

    // Load first file
    await act(async () => {
      fireEvent(dropZones[0], dropEvent1)
      mockFileReader.result = JSON.stringify(sampleData1)
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any)
      }
    })

    // Load second file
    await act(async () => {
      fireEvent(dropZones[1], dropEvent2)
      mockFileReader.result = JSON.stringify(sampleData2)
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any)
      }
    })

    // Wait for comparison and switch to ID Keys tab
    await waitFor(async () => {
      await act(async () => {
        const idKeysTab = screen.getByText('ID Keys')
        fireEvent.click(idKeysTab)
      })
    }, { timeout: 3000 })

    // Wait for ID Keys panel to be visible
    await waitFor(() => {
      const idKeysPanel = container.querySelector('.id-keys-panel')
      expect(idKeysPanel).toBeTruthy()
    })

    // Look for clickable ID Key paths
    const idKeyItems = container.querySelectorAll('.id-key-item')
    expect(idKeyItems.length).toBeGreaterThan(0)

    // Find a clickable path (should have clickable class)
    const clickablePaths = container.querySelectorAll('.id-key-path.clickable')
    expect(clickablePaths.length).toBeGreaterThan(0)

    // Click on the first clickable ID Key path
    const firstClickablePath = clickablePaths[0] as HTMLElement
    const pathText = firstClickablePath.textContent
    console.log('Clicking on path:', pathText)

    // Before clicking, check initial state of JSON tree
    const initialExpandedCount = container.querySelectorAll('.json-node.expanded').length
    
    // Click the path
    await act(async () => {
      fireEvent.click(firstClickablePath)
    })

    // Wait for navigation to complete
    await waitFor(() => {
      // Check that nodes have been expanded
      const expandedNodes = container.querySelectorAll('.json-node.expanded')
      expect(expandedNodes.length).toBeGreaterThan(initialExpandedCount)
    }, { timeout: 2000 })

    // Verify scrolling was attempted
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalled()
    }, { timeout: 1000 })

    // Check for flash effect
    const flashedNodes = container.querySelectorAll('.json-flash')
    expect(flashedNodes.length).toBeGreaterThan(0)
  })

  it('should handle multiple ID Key path clicks', async () => {
    const { container } = await act(async () => render(<App />))

    // Load sample data (abbreviated version of above)
    const dropZones = container.querySelectorAll('.file-drop-zone')
    const mockFile1 = new File([JSON.stringify(sampleData1)], 'sample1.json', { type: 'application/json' })
    const mockFile2 = new File([JSON.stringify(sampleData2)], 'sample2.json', { type: 'application/json' })

    const mockFileReader = {
      readAsText: vi.fn(),
      result: '',
      onload: null as any
    }

    vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any)

    // Quick data loading
    fireEvent(dropZones[0], Object.assign(new Event('drop', { bubbles: true }), {
      dataTransfer: { files: [mockFile1] }
    }))
    mockFileReader.result = JSON.stringify(sampleData1)
    mockFileReader.onload?.({ target: mockFileReader } as any)

    fireEvent(dropZones[1], Object.assign(new Event('drop', { bubbles: true }), {
      dataTransfer: { files: [mockFile2] }
    }))
    mockFileReader.result = JSON.stringify(sampleData2)
    mockFileReader.onload?.({ target: mockFileReader } as any)

    // Switch to ID Keys tab
    await waitFor(() => {
      const idKeysTab = screen.getByText('ID Keys')
      fireEvent.click(idKeysTab)
    }, { timeout: 3000 })

    await waitFor(() => {
      const clickablePaths = container.querySelectorAll('.id-key-path.clickable')
      expect(clickablePaths.length).toBeGreaterThan(0)

      // Click multiple paths to verify navigation works for each
      const pathsToClick = Math.min(clickablePaths.length, 2)
      
      for (let i = 0; i < pathsToClick; i++) {
        const path = clickablePaths[i] as HTMLElement
        fireEvent.click(path)
        
        // Small delay between clicks
        return new Promise(resolve => setTimeout(resolve, 100))
      }
    })

    // Verify multiple scroll calls were made
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalledTimes(2)
    }, { timeout: 2000 })
  })

  it('should verify specific array paths are navigated correctly', async () => {
    const { container } = await act(async () => render(<App />))

    // Load data and navigate to ID Keys (abbreviated)
    const dropZones = container.querySelectorAll('.file-drop-zone')
    const mockFileReader = {
      readAsText: vi.fn(),
      result: '',
      onload: null as any
    }

    vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any)

    // Load files
    fireEvent(dropZones[0], Object.assign(new Event('drop'), {
      dataTransfer: { files: [new File([JSON.stringify(sampleData1)], 'sample1.json')] }
    }))
    mockFileReader.result = JSON.stringify(sampleData1)
    mockFileReader.onload?.({ target: mockFileReader } as any)

    fireEvent(dropZones[1], Object.assign(new Event('drop'), {
      dataTransfer: { files: [new File([JSON.stringify(sampleData2)], 'sample2.json')] }
    }))
    mockFileReader.result = JSON.stringify(sampleData2)
    mockFileReader.onload?.({ target: mockFileReader } as any)

    await waitFor(() => {
      fireEvent.click(screen.getByText('ID Keys'))
    }, { timeout: 3000 })

    await waitFor(() => {
      // Look for specific paths we expect based on our data structure
      const pathElements = container.querySelectorAll('.id-key-path.clickable')
      const pathTexts = Array.from(pathElements).map(el => el.textContent)
      
      // Verify we have paths for our nested arrays
      expect(pathTexts.some(text => text?.includes('users[]'))).toBe(true)
      expect(pathTexts.some(text => text?.includes('orders[]'))).toBe(true)

      // Click on the users array path
      const usersPath = Array.from(pathElements).find(el => 
        el.textContent?.includes('users[]')
      ) as HTMLElement
      
      if (usersPath) {
        fireEvent.click(usersPath)
        
        // Verify navigation to users array
        setTimeout(() => {
          const targetElement = container.querySelector('[data-path*="users"]') || 
                                  container.querySelector('[data-path^="left_"][data-path*="users"]') ||
                                  container.querySelector('[data-path^="right_"][data-path*="users"]')
          expect(targetElement).toBeTruthy()
        }, 100)
      }
    })
  })
})
