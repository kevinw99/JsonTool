import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JsonViewerSyncProvider, useJsonViewerSync } from '../components/JsonViewerSyncContext';
import { IdKeysPanel } from '../components/IdKeysPanel';
import { JsonTreeView } from '../components/JsonTreeView';
import type { IdKeyInfo } from '../utils/jsonCompare';

// Mock data for testing
const mockJsonData = {
  boomerForecastV3Requests: [
    {
      household: {
        accounts: [
          { id: 'acc1', type: 'savings' },
          { id: 'acc2', type: 'checking' }
        ],
        jobs: [
          { id: 'job1', title: 'Engineer' },
          { id: 'job2', title: 'Manager' }
        ],
        taxRates: [
          { year: 2023, rate: 0.25 },
          { year: 2024, rate: 0.27 }
        ]
      },
      parameters: {
        accountParams: [
          {
            contributions: [
              { amount: 1000, frequency: 'monthly' }
            ]
          }
        ]
      }
    }
  ]
};

const mockIdKeysUsed: IdKeyInfo[] = [
  {
    arrayPath: 'boomerForecastV3Requests.household.accounts[]',
    idKey: 'id',
    isComposite: false,
    arraySize1: 2,
    arraySize2: 2
  },
  {
    arrayPath: 'boomerForecastV3Requests.household.jobs[]',
    idKey: 'id', 
    isComposite: false,
    arraySize1: 2,
    arraySize2: 2
  },
  {
    arrayPath: 'boomerForecastV3Requests.household.taxRates[]',
    idKey: 'year',
    isComposite: false,
    arraySize1: 2,
    arraySize2: 2
  },
  {
    arrayPath: 'boomerForecastV3Requests.parameters.accountParams.contributions[]',
    idKey: '',
    isComposite: false,
    arraySize1: 1,
    arraySize2: 1
  }
];

// Test component that uses the navigation context
const TestNavigationComponent = () => {
  const { /* goToDiff, */ expandedPaths, highlightPath } = useJsonViewerSync();
  
  return (
    <div>
      <div data-testid="expanded-paths">{JSON.stringify(Array.from(expandedPaths))}</div>
      <div data-testid="highlight-path">{highlightPath || 'none'}</div>
      <IdKeysPanel 
        idKeysUsed={mockIdKeysUsed}
        jsonData={mockJsonData}
      />
      <div className="json-viewer-scroll-container" style={{ height: '400px', overflowY: 'auto' }}>
        <JsonTreeView
          data={mockJsonData}
          viewerId="viewer1"
          jsonSide="left"
          idKeySetting={''}
          showDiffsOnly={false}
        />
      </div>
    </div>
  );
};

// Mock scrollTo and other DOM methods
const mockScrollTo = vi.fn();
const mockScrollIntoView = vi.fn();
const mockGetBoundingClientRect = vi.fn(() => ({
  top: 100,
  left: 0,
  right: 200,
  bottom: 150,
  width: 200,
  height: 50
}));

// Mock querySelector to return mock elements
const mockQuerySelector = vi.fn();

describe('Navigation Feature Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock DOM methods
    Object.defineProperty(Element.prototype, 'scrollTo', {
      writable: true,
      value: mockScrollTo,
    });
    
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      writable: true,
      value: mockScrollIntoView,
    });
    
    Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
      writable: true,
      value: mockGetBoundingClientRect,
    });
    
    Object.defineProperty(Element.prototype, 'closest', {
      writable: true,
      value: vi.fn((selector) => {
        if (selector === '.json-viewer-scroll-container') {
          return {
            scrollTop: 100,
            scrollHeight: 1000,
            clientHeight: 400,
            getBoundingClientRect: mockGetBoundingClientRect,
            scrollTo: mockScrollTo,
            querySelector: mockQuerySelector
          };
        }
        return null;
      }),
    });
    
    Object.defineProperty(document, 'querySelector', {
      writable: true,
      value: mockQuerySelector,
    });
    
    // Mock querySelector to return mock elements with data-path attributes
    mockQuerySelector.mockImplementation((selector) => {
      if (selector.includes('[data-path=')) {
        return {
          tagName: 'DIV',
          className: 'json-node',
          getAttribute: (attr: string) => {
            if (attr === 'data-path') {
              return selector.match(/data-path="([^"]+)"/)?.[1] || '';
            }
            return null;
          },
          textContent: '▼array:[...]',
          getBoundingClientRect: mockGetBoundingClientRect,
          closest: vi.fn((sel) => {
            if (sel === '.json-viewer-scroll-container') {
              return {
                scrollTop: 100,
                scrollHeight: 1000,
                clientHeight: 400,
                getBoundingClientRect: mockGetBoundingClientRect,
                scrollTo: mockScrollTo
              };
            }
            return null;
          }),
          classList: {
            add: vi.fn(),
            remove: vi.fn()
          }
        };
      }
      return null;
    });
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Path Building and Navigation', () => {
    it('should build correct numeric paths for different array levels', async () => {
      render(
        <JsonViewerSyncProvider>
          <TestNavigationComponent />
        </JsonViewerSyncProvider>
      );

      // Test clicking on different ID key paths
      const testCases = [
        {
          idBasedPath: 'boomerForecastV3Requests.household.accounts[]',
          expectedNumericPath: 'root.boomerForecastV3Requests[0].household.accounts',
          description: 'simple nested array'
        },
        {
          idBasedPath: 'boomerForecastV3Requests.household.jobs[]',
          expectedNumericPath: 'root.boomerForecastV3Requests[0].household.jobs',
          description: 'another simple nested array'
        },
        {
          idBasedPath: 'boomerForecastV3Requests.parameters.accountParams.contributions[]',
          expectedNumericPath: 'root.boomerForecastV3Requests[0].parameters.accountParams[0].contributions',
          description: 'deeply nested array with intermediate arrays'
        }
      ];

      for (const testCase of testCases) {
        // Find the clickable path element
        const pathElement = screen.getByText(testCase.idBasedPath);
        expect(pathElement).toBeInTheDocument();

        // Click on the path
        fireEvent.click(pathElement);

        // Wait for the navigation to complete
        await waitFor(() => {
          const highlightPath = screen.getByTestId('highlight-path').textContent;
          expect(highlightPath).toBe(testCase.expectedNumericPath);
        }, { timeout: 1000 });
      }
    });

    it('should expand all necessary ancestor paths when navigating', async () => {
      render(
        <JsonViewerSyncProvider>
          <TestNavigationComponent />
        </JsonViewerSyncProvider>
      );

      // Click on a deeply nested path
      const pathElement = screen.getByText('boomerForecastV3Requests.parameters.accountParams.contributions[]');
      fireEvent.click(pathElement);

      // Wait for expansion to complete
      await waitFor(() => {
        const expandedPathsText = screen.getByTestId('expanded-paths').textContent;
        const expandedPaths = JSON.parse(expandedPathsText || '[]');
        
        // Check that all necessary ancestors are expanded
        const expectedPaths = [
          'root',
          'root.boomerForecastV3Requests',
          'root.boomerForecastV3Requests[0]',
          'root.boomerForecastV3Requests[0].parameters',
          'root.boomerForecastV3Requests[0].parameters.accountParams',
          'root.boomerForecastV3Requests[0].parameters.accountParams[0]',
          'root.boomerForecastV3Requests[0].parameters.accountParams[0].contributions'
        ];

        expectedPaths.forEach(path => {
          expect(expandedPaths).toContain(path);
        });
      }, { timeout: 1000 });
    });
  });

  describe('Scrolling Behavior', () => {
    it('should attempt to scroll to target element when path is clicked', async () => {
      render(
        <JsonViewerSyncProvider>
          <TestNavigationComponent />
        </JsonViewerSyncProvider>
      );

      // Click on a path
      const pathElement = screen.getByText('boomerForecastV3Requests.household.accounts[]');
      fireEvent.click(pathElement);

      // Wait for scrolling to be attempted
      await waitFor(() => {
        expect(mockQuerySelector).toHaveBeenCalledWith(
          expect.stringContaining('[data-path="root.boomerForecastV3Requests[0].household.accounts"]')
        );
      }, { timeout: 1000 });
    });

    it('should find scroll container and calculate scroll position', async () => {
      render(
        <JsonViewerSyncProvider>
          <TestNavigationComponent />
        </JsonViewerSyncProvider>
      );

      // Click on a path
      const pathElement = screen.getByText('boomerForecastV3Requests.household.jobs[]');
      fireEvent.click(pathElement);

      // Wait for scroll calculations
      await waitFor(() => {
        expect(mockGetBoundingClientRect).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should handle missing scroll container gracefully', async () => {
      // Mock closest to return null (no scroll container found)
      Object.defineProperty(Element.prototype, 'closest', {
        writable: true,
        value: vi.fn(() => null),
      });

      render(
        <JsonViewerSyncProvider>
          <TestNavigationComponent />
        </JsonViewerSyncProvider>
      );

      // Click on a path
      const pathElement = screen.getByText('boomerForecastV3Requests.household.taxRates[]');
      fireEvent.click(pathElement);

      // Should fall back to scrollIntoView
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, { timeout: 1000 });
    });
  });

  describe('Element Highlighting and Flash Effect', () => {
    it('should highlight the target element when navigating', async () => {
      render(
        <JsonViewerSyncProvider>
          <TestNavigationComponent />
        </JsonViewerSyncProvider>
      );

      // Click on a path
      const pathElement = screen.getByText('boomerForecastV3Requests.household.accounts[]');
      fireEvent.click(pathElement);

      // Wait for highlighting
      await waitFor(() => {
        const highlightPath = screen.getByTestId('highlight-path').textContent;
        expect(highlightPath).toBe('root.boomerForecastV3Requests[0].household.accounts');
      }, { timeout: 1000 });
    });

    it('should add flash effect to target element', async () => {
      const mockElement = {
        tagName: 'DIV',
        className: 'json-node',
        getAttribute: vi.fn((attr) => attr === 'data-path' ? 'root.boomerForecastV3Requests[0].household.accounts' : null),
        textContent: '▼accounts:[...]',
        getBoundingClientRect: mockGetBoundingClientRect,
        closest: vi.fn(() => ({
          scrollTop: 100,
          scrollHeight: 1000,
          clientHeight: 400,
          getBoundingClientRect: mockGetBoundingClientRect,
          scrollTo: mockScrollTo
        })),
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        }
      };

      mockQuerySelector.mockReturnValue(mockElement);

      render(
        <JsonViewerSyncProvider>
          <TestNavigationComponent />
        </JsonViewerSyncProvider>
      );

      // Click on a path
      const pathElement = screen.getByText('boomerForecastV3Requests.household.accounts[]');
      fireEvent.click(pathElement);

      // Wait for flash effect
      await waitFor(() => {
        expect(mockElement.classList.add).toHaveBeenCalledWith('json-flash');
      }, { timeout: 2000 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle paths with no intermediate arrays', async () => {
      const simpleData = {
        simpleArray: ['item1', 'item2']
      };

      const simpleIdKeys: IdKeyInfo[] = [{
        arrayPath: 'simpleArray[]',
        idKey: '',
        isComposite: false,
        arraySize1: 2,
        arraySize2: 2
      }];

      const SimpleTestComponent = () => {
        const { highlightPath } = useJsonViewerSync();
        return (
          <div>
            <div data-testid="highlight-path">{highlightPath || 'none'}</div>
            <IdKeysPanel 
              idKeysUsed={simpleIdKeys}
              jsonData={simpleData}
            />
          </div>
        );
      };

      render(
        <JsonViewerSyncProvider>
          <SimpleTestComponent />
        </JsonViewerSyncProvider>
      );

      const pathElement = screen.getByText('simpleArray[]');
      fireEvent.click(pathElement);

      await waitFor(() => {
        const highlightPath = screen.getByTestId('highlight-path').textContent;
        expect(highlightPath).toBe('root.simpleArray');
      });
    });

    it('should handle clicking the same path multiple times', async () => {
      render(
        <JsonViewerSyncProvider>
          <TestNavigationComponent />
        </JsonViewerSyncProvider>
      );

      const pathElement = screen.getByText('boomerForecastV3Requests.household.accounts[]');
      
      // Click multiple times
      fireEvent.click(pathElement);
      await waitFor(() => {
        expect(screen.getByTestId('highlight-path').textContent).toBe('root.boomerForecastV3Requests[0].household.accounts');
      });

      fireEvent.click(pathElement);
      await waitFor(() => {
        expect(screen.getByTestId('highlight-path').textContent).toBe('root.boomerForecastV3Requests[0].household.accounts');
      });

      // Should still work on second click
      expect(mockQuerySelector).toHaveBeenCalledTimes(4); // 2 clicks × 2 calls each
    });

    it('should handle missing target elements gracefully', async () => {
      // Mock querySelector to return null (element not found)
      mockQuerySelector.mockReturnValue(null);

      render(
        <JsonViewerSyncProvider>
          <TestNavigationComponent />
        </JsonViewerSyncProvider>
      );

      const pathElement = screen.getByText('boomerForecastV3Requests.household.accounts[]');
      fireEvent.click(pathElement);

      // Should not throw error and still update highlight path
      await waitFor(() => {
        const highlightPath = screen.getByTestId('highlight-path').textContent;
        expect(highlightPath).toBe('root.boomerForecastV3Requests[0].household.accounts');
      });
    });
  });
});
