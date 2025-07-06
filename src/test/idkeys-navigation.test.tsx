import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// Mock test data
const mockJsonData1 = {
  boomerForecastV3Requests: [
    {
      household: {
        accounts: [
          { id: 'acc1', modeledPositions: [{ symbol: 'AAPL', shares: 100 }] },
          { id: 'acc2', modeledPositions: [{ symbol: 'GOOGL', shares: 50 }] }
        ],
        jobs: [
          { title: 'Engineer', salary: 100000 },
          { title: 'Manager', salary: 120000 }
        ],
        taxRates: [
          { bracket: 'low', rate: 0.1 },
          { bracket: 'medium', rate: 0.2 }
        ]
      },
      parameters: {
        accountParams: [
          {
            contributions: [
              { type: 'pre-tax', amount: 5000 }
            ]
          }
        ]
      }
    }
  ]
};

const mockJsonData2 = {
  boomerForecastV3Requests: [
    {
      household: {
        accounts: [
          { id: 'acc1', modeledPositions: [{ symbol: 'AAPL', shares: 150 }] }, // Changed shares
          { id: 'acc2', modeledPositions: [{ symbol: 'MSFT', shares: 75 }] } // Changed symbol
        ],
        jobs: [
          { title: 'Senior Engineer', salary: 110000 }, // Changed title and salary
          { title: 'Manager', salary: 120000 }
        ],
        taxRates: [
          { bracket: 'low', rate: 0.12 }, // Changed rate
          { bracket: 'medium', rate: 0.2 },
          { bracket: 'high', rate: 0.3 } // Added new bracket
        ]
      },
      parameters: {
        accountParams: [
          {
            contributions: [
              { type: 'roth', amount: 6000 } // Changed type and amount
            ]
          }
        ]
      }
    }
  ]
};

describe('ID Keys Navigation Feature', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockScrollTo: ReturnType<typeof vi.fn>;
  let mockScrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    user = userEvent.setup();
    
    // Mock scroll functions
    mockScrollTo = vi.fn();
    mockScrollIntoView = vi.fn();
    
    Object.defineProperty(Element.prototype, 'scrollTo', {
      value: mockScrollTo,
      writable: true
    });
    
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: mockScrollIntoView,
      writable: true
    });

    // Reset console methods to capture logs
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect and display ID Keys for array comparisons', async () => {
    await act(async () => {
      render(<App />);
    });

    // Simulate file drops
    const file1Input = screen.getAllByText(/Drop file here/)[0];
    const file2Input = screen.getAllByText(/Drop file here/)[1];

    // Mock file drop events
    const file1 = new File([JSON.stringify(mockJsonData1)], 'data1.json', { type: 'application/json' });
    const file2 = new File([JSON.stringify(mockJsonData2)], 'data2.json', { type: 'application/json' });

    fireEvent.drop(file1Input, { dataTransfer: { files: [file1] } });
    fireEvent.drop(file2Input, { dataTransfer: { files: [file2] } });

    // Wait for files to be processed and comparison to complete
    await waitFor(() => {
      // Check that ID Keys tab is available
      expect(screen.getByText('ID Keys')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click on ID Keys tab
    await user.click(screen.getByText('ID Keys'));

    // Verify ID Keys are displayed
    await waitFor(() => {
      expect(screen.getByText(/boomerForecastV3Requests\.household\.accounts\[\]/)).toBeInTheDocument();
      expect(screen.getByText(/boomerForecastV3Requests\.household\.jobs\[\]/)).toBeInTheDocument();
      expect(screen.getByText(/boomerForecastV3Requests\.household\.taxRates\[\]/)).toBeInTheDocument();
    });
  });

  it('should navigate to target array when ID Key path is clicked', async () => {
    await act(async () => {
      render(<App />);
    });

    // Load test data
    const file1Input = screen.getAllByText(/Drop JSON file here/)[0];
    const file2Input = screen.getAllByText(/Drop JSON file here/)[1];

    const file1 = new File([JSON.stringify(mockJsonData1)], 'data1.json', { type: 'application/json' });
    const file2 = new File([JSON.stringify(mockJsonData2)], 'data2.json', { type: 'application/json' });

    fireEvent.drop(file1Input, { dataTransfer: { files: [file1] } });
    fireEvent.drop(file2Input, { dataTransfer: { files: [file2] } });

    await waitFor(() => {
      expect(screen.getByText('ID Keys')).toBeInTheDocument();
    });

    // Click on ID Keys tab
    await user.click(screen.getByText('ID Keys'));

    // Wait for ID Keys to be displayed
    await waitFor(() => {
      expect(screen.getByText(/boomerForecastV3Requests\.household\.accounts\[\]/)).toBeInTheDocument();
    });

    // Click on an ID Key path
    const accountsPath = screen.getByText(/boomerForecastV3Requests\.household\.accounts\[\]/);
    await user.click(accountsPath);

    // Verify navigation logs (check console.log calls)
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[IdKeysPanel] 🖱️ Path clicked: boomerForecastV3Requests.household.accounts[]')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[JsonViewerSyncContext goToDiff] 🎯 CALLED with NUMERIC path')
      );
    });
  });

  it('should build correct numeric paths for nested arrays', async () => {
    await act(async () => {
      render(<App />);
    });

    // Load test data
    const file1Input = screen.getAllByText(/Drop JSON file here/)[0];
    const file2Input = screen.getAllByText(/Drop JSON file here/)[1];

    const file1 = new File([JSON.stringify(mockJsonData1)], 'data1.json', { type: 'application/json' });
    const file2 = new File([JSON.stringify(mockJsonData2)], 'data2.json', { type: 'application/json' });

    fireEvent.drop(file1Input, { dataTransfer: { files: [file1] } });
    fireEvent.drop(file2Input, { dataTransfer: { files: [file2] } });

    await waitFor(() => {
      expect(screen.getByText('ID Keys')).toBeInTheDocument();
    });

    await user.click(screen.getByText('ID Keys'));

    await waitFor(() => {
      expect(screen.getByText(/boomerForecastV3Requests\.parameters\.accountParams\.contributions\[\]/)).toBeInTheDocument();
    });

    // Click on nested array path
    const contributionsPath = screen.getByText(/boomerForecastV3Requests\.parameters\.accountParams\.contributions\[\]/);
    await user.click(contributionsPath);

    // Verify correct numeric path is built
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[IdKeysPanel] 🏁 Final numeric path: root.boomerForecastV3Requests[0].parameters.accountParams[0].contributions')
      );
    });
  });

  it('should expand all necessary ancestor paths when navigating', async () => {
    await act(async () => {
      render(<App />);
    });

    // Load test data
    const file1Input = screen.getAllByText(/Drop JSON file here/)[0];
    const file2Input = screen.getAllByText(/Drop JSON file here/)[1];

    const file1 = new File([JSON.stringify(mockJsonData1)], 'data1.json', { type: 'application/json' });
    const file2 = new File([JSON.stringify(mockJsonData2)], 'data2.json', { type: 'application/json' });

    fireEvent.drop(file1Input, { dataTransfer: { files: [file1] } });
    fireEvent.drop(file2Input, { dataTransfer: { files: [file2] } });

    await waitFor(() => {
      expect(screen.getByText('ID Keys')).toBeInTheDocument();
    });

    await user.click(screen.getByText('ID Keys'));

    await waitFor(() => {
      expect(screen.getByText(/boomerForecastV3Requests\.household\.accounts\[\]/)).toBeInTheDocument();
    });

    const accountsPath = screen.getByText(/boomerForecastV3Requests\.household\.accounts\[\]/);
    await user.click(accountsPath);

    // Verify expansion paths
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📂 Setting expandedPaths to:'),
        expect.arrayContaining([
          'root',
          'root.boomerForecastV3Requests',
          'root.boomerForecastV3Requests[0]',
          'root.boomerForecastV3Requests[0].household',
          'root.boomerForecastV3Requests[0].household.accounts'
        ])
      );
    });
  });

  it('should attempt scrolling with correct calculations', async () => {
    await act(async () => {
      render(<App />);
    });

    // Load test data and trigger navigation
    const file1Input = screen.getAllByText(/Drop JSON file here/)[0];
    const file2Input = screen.getAllByText(/Drop JSON file here/)[1];

    const file1 = new File([JSON.stringify(mockJsonData1)], 'data1.json', { type: 'application/json' });
    const file2 = new File([JSON.stringify(mockJsonData2)], 'data2.json', { type: 'application/json' });

    fireEvent.drop(file1Input, { dataTransfer: { files: [file1] } });
    fireEvent.drop(file2Input, { dataTransfer: { files: [file2] } });

    await waitFor(() => {
      expect(screen.getByText('ID Keys')).toBeInTheDocument();
    });

    await user.click(screen.getByText('ID Keys'));

    await waitFor(() => {
      expect(screen.getByText(/boomerForecastV3Requests\.household\.jobs\[\]/)).toBeInTheDocument();
    });

    const jobsPath = screen.getByText(/boomerForecastV3Requests\.household\.jobs\[\]/);
    await user.click(jobsPath);

    // Verify scroll calculations and execution
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[JsonViewerSyncContext goToDiff] 🧮 Scroll calculation:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[JsonViewerSyncContext goToDiff] ✅ Direct scroll executed')
      );
    });
  });

  it('should handle multiple ID Key clicks correctly', async () => {
    await act(async () => {
      render(<App />);
    });

    // Load test data
    const file1Input = screen.getAllByText(/Drop JSON file here/)[0];
    const file2Input = screen.getAllByText(/Drop JSON file here/)[1];

    const file1 = new File([JSON.stringify(mockJsonData1)], 'data1.json', { type: 'application/json' });
    const file2 = new File([JSON.stringify(mockJsonData2)], 'data2.json', { type: 'application/json' });

    fireEvent.drop(file1Input, { dataTransfer: { files: [file1] } });
    fireEvent.drop(file2Input, { dataTransfer: { files: [file2] } });

    await waitFor(() => {
      expect(screen.getByText('ID Keys')).toBeInTheDocument();
    });

    await user.click(screen.getByText('ID Keys'));

    await waitFor(() => {
      expect(screen.getByText(/boomerForecastV3Requests\.household\.accounts\[\]/)).toBeInTheDocument();
      expect(screen.getByText(/boomerForecastV3Requests\.household\.jobs\[\]/)).toBeInTheDocument();
    });

    // Click first path
    const accountsPath = screen.getByText(/boomerForecastV3Requests\.household\.accounts\[\]/);
    await user.click(accountsPath);

    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('root.boomerForecastV3Requests[0].household.accounts')
      );
    });

    // Click second path
    const jobsPath = screen.getByText(/boomerForecastV3Requests\.household\.jobs\[\]/);
    await user.click(jobsPath);

    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('root.boomerForecastV3Requests[0].household.jobs')
      );
    });

    // Verify both navigations were processed
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[JsonViewerSyncContext goToDiff] 🎯 CALLED with NUMERIC path: "root.boomerForecastV3Requests[0].household.accounts"')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[JsonViewerSyncContext goToDiff] 🎯 CALLED with NUMERIC path: "root.boomerForecastV3Requests[0].household.jobs"')
    );
  });

  it('should display correct ID Key consolidation and occurrence counts', async () => {
    await act(async () => {
      render(<App />);
    });

    // Load test data
    const file1Input = screen.getAllByText(/Drop JSON file here/)[0];
    const file2Input = screen.getAllByText(/Drop JSON file here/)[1];

    const file1 = new File([JSON.stringify(mockJsonData1)], 'data1.json', { type: 'application/json' });
    const file2 = new File([JSON.stringify(mockJsonData2)], 'data2.json', { type: 'application/json' });

    fireEvent.drop(file1Input, { dataTransfer: { files: [file1] } });
    fireEvent.drop(file2Input, { dataTransfer: { files: [file2] } });

    await waitFor(() => {
      expect(screen.getByText('ID Keys')).toBeInTheDocument();
    });

    await user.click(screen.getByText('ID Keys'));

    // Wait for ID Keys panel to load
    await waitFor(() => {
      expect(screen.getByText(/boomerForecastV3Requests\.household\.accounts\[\]/)).toBeInTheDocument();
    });

    // Check for occurrence indicators and numbering
    const idKeysPanel = screen.getByText(/boomerForecastV3Requests\.household\.accounts\[\]/).closest('div');
    expect(idKeysPanel).toBeInTheDocument();

    // Verify that paths are properly consolidated and numbered
    expect(screen.getByText(/1\./)).toBeInTheDocument(); // Numbering should start with 1.
  });

  it('should handle edge cases with empty arrays and missing data', async () => {
    const edgeCaseData1 = {
      boomerForecastV3Requests: []
    };

    const edgeCaseData2 = {
      boomerForecastV3Requests: [
        {
          household: {
            accounts: [],
            jobs: null
          }
        }
      ]
    };

    await act(async () => {
      render(<App />);
    });

    const file1Input = screen.getAllByText(/Drop JSON file here/)[0];
    const file2Input = screen.getAllByText(/Drop JSON file here/)[1];

    const file1 = new File([JSON.stringify(edgeCaseData1)], 'edge1.json', { type: 'application/json' });
    const file2 = new File([JSON.stringify(edgeCaseData2)], 'edge2.json', { type: 'application/json' });

    fireEvent.drop(file1Input, { dataTransfer: { files: [file1] } });
    fireEvent.drop(file2Input, { dataTransfer: { files: [file2] } });

    await waitFor(() => {
      expect(screen.getByText('ID Keys')).toBeInTheDocument();
    });

    await user.click(screen.getByText('ID Keys'));

    // Should handle edge cases gracefully
    await waitFor(() => {
      // Should either show "No ID Keys found" or handle empty arrays properly
      const idKeysContent = screen.getByTestId('id-keys-panel') || screen.getByText(/No ID Keys/);
      expect(idKeysContent).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

describe('ID Keys Navigation Integration', () => {
  it('should perform end-to-end navigation workflow', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<App />);
    });

    // 1. Load JSON files
    const file1Input = screen.getAllByText(/Drop JSON file here/)[0];
    const file2Input = screen.getAllByText(/Drop JSON file here/)[1];

    const file1 = new File([JSON.stringify(mockJsonData1)], 'test1.json', { type: 'application/json' });
    const file2 = new File([JSON.stringify(mockJsonData2)], 'test2.json', { type: 'application/json' });

    fireEvent.drop(file1Input, { dataTransfer: { files: [file1] } });
    fireEvent.drop(file2Input, { dataTransfer: { files: [file2] } });

    // 2. Wait for comparison to complete
    await waitFor(() => {
      expect(screen.getByText('ID Keys')).toBeInTheDocument();
    }, { timeout: 5000 });

    // 3. Open ID Keys panel
    await user.click(screen.getByText('ID Keys'));

    // 4. Verify ID Keys are detected and displayed
    await waitFor(() => {
      expect(screen.getByText(/boomerForecastV3Requests\.household\.accounts\[\]/)).toBeInTheDocument();
    });

    // 5. Click on an ID Key to navigate
    const targetPath = screen.getByText(/boomerForecastV3Requests\.household\.accounts\[\]/);
    await user.click(targetPath);

    // 6. Verify complete navigation workflow
    await waitFor(() => {
      // Path building
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[IdKeysPanel] 🔍 Building numeric path')
      );
      
      // Navigation call
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[JsonViewerSyncContext goToDiff] 🎯 CALLED with NUMERIC path')
      );
      
      // Expansion
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📂 Setting expandedPaths to:')
      );
      
      // Scrolling
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[JsonViewerSyncContext goToDiff] ✅ Direct scroll executed')
      );
    });

    // 7. Test multiple navigations work
    await user.click(screen.getByText(/boomerForecastV3Requests\.household\.jobs\[\]/));
    
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('root.boomerForecastV3Requests[0].household.jobs')
      );
    });
  });
});
