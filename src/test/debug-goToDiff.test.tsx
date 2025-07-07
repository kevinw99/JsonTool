import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../App';

describe('Debug GoToDiff Navigation', () => {
  it('should load sample data and check available diffs', async () => {
    render(<App />);

    // Load sample files
    const loadSamplesButton = screen.getByText('Load Sample Data');
    fireEvent.click(loadSamplesButton);

    // Wait for files to load and diffs to be calculated
    await waitFor(() => {
      const differencesText = screen.queryByText(/Differences/);
      if (differencesText) {
        console.log('Found differences text:', differencesText.textContent);
      }
      expect(screen.getByText(/Differences/)).toBeInTheDocument();
    }, { timeout: 10000 });

    // Check how many diffs were found
    const goToButtons = screen.queryAllByText(/Go To/);
    console.log('Number of Go To buttons found:', goToButtons.length);

    // Check if there are any difference items
    const diffItems = document.querySelectorAll('[class*="diff"]');
    console.log('Number of diff-related elements:', diffItems.length);

    // Check the actual differences section
    const differencesSection = document.querySelector('.diff-list-section, .tabbed-bottom-panel, [class*="difference"]');
    if (differencesSection) {
      console.log('Differences section HTML:', differencesSection.innerHTML.substring(0, 500));
    }

    // Check if files were loaded correctly
    const leftViewer = document.querySelector('[data-sync-group="json-viewers"]');
    const rightViewer = document.querySelectorAll('[data-sync-group="json-viewers"]')[1];
    
    console.log('Left viewer has content:', leftViewer?.textContent?.length || 0);
    console.log('Right viewer has content:', rightViewer?.textContent?.length || 0);

    // Look for any elements containing "boomerForecastV3Requests"
    const boomerElements = document.querySelectorAll('[data-path*="boomerForecastV3Requests"]');
    console.log('Number of boomerForecastV3Requests elements:', boomerElements.length);

    expect(true).toBe(true); // Always pass, this is just for debugging
  });
});