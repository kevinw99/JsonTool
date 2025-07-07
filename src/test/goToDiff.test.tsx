import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../App';

// Mock the console methods to capture debug output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('GoToDiff Navigation Test', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
    // Reset any DOM state
    document.body.innerHTML = '';
  });

  it('should navigate to diff #8 and scroll target element into viewport with correct highlighting', async () => {
    render(<App />);

    // Load sample files first
    const loadSamplesButton = screen.getByText('Load Sample Data');
    fireEvent.click(loadSamplesButton);

    // Wait for files to load and diffs to be calculated
    await waitFor(() => {
      expect(screen.getByText(/Differences/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find diff #8 - should be for the contributions path
    const diffRows = screen.getAllByText(/Go To/);
    expect(diffRows.length).toBeGreaterThanOrEqual(8);

    // Click on the "Go To" button for diff #8 (index 7)
    const goToButton8 = diffRows[7]; // 8th diff (0-indexed)
    fireEvent.click(goToButton8);

    // Wait for navigation to complete
    await waitFor(() => {
      // Check that the target path exists in the DOM
      const targetElement = document.querySelector('[data-path*="contributions"][data-path*="45626988::2_prtcpnt-pre_0"]');
      expect(targetElement).toBeTruthy();
    }, { timeout: 3000 });

    // Verify the element is highlighted
    const targetElement = document.querySelector('[data-path*="contributions"][data-path*="45626988::2_prtcpnt-pre_0"]');
    if (targetElement) {
      // Check if element has highlighting styles
      const computedStyle = window.getComputedStyle(targetElement);
      // The highlighting should be applied via CSS classes or inline styles
      expect(targetElement.classList.contains('highlighted') || 
             computedStyle.border.includes('blue') ||
             computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)').toBe(true);

      // Verify element is in viewport
      const rect = targetElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isInViewport = rect.top >= 0 && rect.bottom <= viewportHeight;
      
      console.log('Target element position:', {
        top: rect.top,
        bottom: rect.bottom,
        viewportHeight,
        isInViewport
      });

      // Element should be visible in viewport (allowing some margin for centering)
      expect(rect.top).toBeGreaterThanOrEqual(-100); // Allow some offset above viewport
      expect(rect.bottom).toBeLessThanOrEqual(viewportHeight + 100); // Allow some offset below viewport
    }

    // Verify both left and right viewers show the target
    const leftViewer = document.querySelector('[data-sync-group="json-viewers"]');
    const rightViewer = document.querySelectorAll('[data-sync-group="json-viewers"]')[1];
    
    expect(leftViewer).toBeTruthy();
    expect(rightViewer).toBeTruthy();

    // Check scroll positions are reasonable (not at top)
    if (leftViewer && rightViewer) {
      expect(leftViewer.scrollTop).toBeGreaterThan(0);
      expect(rightViewer.scrollTop).toBeGreaterThan(0);
      
      console.log('Scroll positions:', {
        left: leftViewer.scrollTop,
        right: rightViewer.scrollTop
      });
    }
  });

  it('should verify the specific path from the console logs', async () => {
    render(<App />);

    // Load sample files
    const loadSamplesButton = screen.getByText('Load Sample Data');
    fireEvent.click(loadSamplesButton);

    await waitFor(() => {
      expect(screen.getByText(/Differences/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Test the specific path transformation from the console logs
    // ID-based: boomerForecastV3Requests[0].parameters.accountParams[id=45626988::2].contributions[id=45626988::2_prtcpnt-pre_0].contributions[0]  
    // Should convert to numeric paths like:
    // LEFT: boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1].contributions[0]
    // RIGHT: boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2].contributions[0]

    const expectedLeftPath = 'root.boomerForecastV3Requests[0].parameters.accountParams[1].contributions[1].contributions[0]';
    const expectedRightPath = 'root.boomerForecastV3Requests[0].parameters.accountParams[1].contributions[2].contributions[0]';

    // After clicking diff #8, these paths should exist
    const diffRows = screen.getAllByText(/Go To/);
    fireEvent.click(diffRows[7]);

    await waitFor(() => {
      const leftElement = document.querySelector(`[data-path="${expectedLeftPath}"]`);
      const rightElement = document.querySelector(`[data-path="${expectedRightPath}"]`);
      
      expect(leftElement).toBeTruthy();
      expect(rightElement).toBeTruthy();
    }, { timeout: 3000 });
  });
});