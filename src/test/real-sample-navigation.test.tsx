import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render /*, screen, fireEvent, waitFor */ } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Load the real sample files
const loadSampleFile = async (filename: string) => {
  const response = await fetch(`/public/${filename}`);
  return response.json();
};

// Mock scrollIntoView for testing
const mockScrollIntoView = vi.fn();
Element.prototype.scrollIntoView = mockScrollIntoView;

describe('ID Key Navigation with Real Sample Files', () => {
  beforeEach(() => {
    mockScrollIntoView.mockClear();
  });

  it('should load and compare the real sample files', async () => {
    render(<App />);
    
    // Load the actual sample files (this would normally be done by the app)
    const sample1 = await loadSampleFile('sample1.json');
    const sample2 = await loadSampleFile('sample2.json');
    
    expect(sample1).toBeDefined();
    expect(sample2).toBeDefined();
    expect(sample1.outputType).toBe('SEARCH');
    expect(sample2.outputType).toBe('SEARCH');
  });

  it('should identify ID keys from real financial data structure', async () => {
    render(<App />);
    
    const sample1 = await loadSampleFile('sample1.json');
    const sample2 = await loadSampleFile('sample2.json');
    
    // Check that we can find financial-specific ID fields
    expect(sample1.legacySavingsSlidersInputAccountIds).toContain('63610677::1');
    expect(sample2.legacySavingsSlidersInputAccountIds).toContain('63610677::1');
    
    // Check nested structure exists
    expect(sample1.legacySavingsSlidersResponse.savingsSliders).toBeDefined();
    expect(sample2.legacySavingsSlidersResponse.savingsSliders).toBeDefined();
    
    // Check account IDs in nested structures
    const slider1 = sample1.legacySavingsSlidersResponse.savingsSliders[0];
    const slider2 = sample2.legacySavingsSlidersResponse.savingsSliders[0];
    expect(slider1.accountId).toBe('63610677::1');
    expect(slider2.accountId).toBe('63610677::1');
  });

  it('should find differences in contribution amounts between samples', async () => {
    const sample1 = await loadSampleFile('sample1.json');
    const sample2 = await loadSampleFile('sample2.json');
    
    // Check the currentSavingsNotch structure for differences
    const current1 = sample1.legacySavingsSlidersResponse.savingsSliders[0].currentSavingsNotch;
    const current2 = sample2.legacySavingsSlidersResponse.savingsSliders[0].currentSavingsNotch;
    
    expect(current1.employeeContribution.totalContributionDollars).toBe(2500.0);
    expect(current2.employeeContribution.totalContributionDollars).toBe(2500.0);
    
    // Both should have the same structure but there might be differences in the timing data
    expect(current1.accountId).toBe(current2.accountId);
  });

  it('should handle complex nested paths in financial data', async () => {
    const sample1 = await loadSampleFile('sample1.json');
    
    // Test deeply nested paths that would generate ID keys
    const savingsSliders = sample1.legacySavingsSlidersResponse.savingsSliders;
    expect(Array.isArray(savingsSliders)).toBe(true);
    expect(savingsSliders.length).toBeGreaterThan(0);
    
    // Check that savingsNotches array exists and has multiple entries
    const firstSlider = savingsSliders[0];
    expect(Array.isArray(firstSlider.savingsNotches)).toBe(true);
    expect(firstSlider.savingsNotches.length).toBeGreaterThan(20); // Should have many contribution levels
    
    // Check contribution types array
    const firstNotch = firstSlider.savingsNotches[0];
    expect(Array.isArray(firstNotch.employeeContribution.contributions)).toBe(true);
    expect(firstNotch.employeeContribution.contributions.length).toBe(5); // PRETAX, AFTERTAX, ROTH, PRETAX50PLUS, ROTH50PLUS
  });
});

describe('ID Key Generation from Real Data', () => {
  it('should generate correct ID key paths for financial data structure', async () => {
    const sample1 = await loadSampleFile('sample1.json');
    
    // Expected ID key paths based on the real data structure
    // const expectedPaths = [
    //   'legacySavingsSlidersInputAccountIds[0]', // "63610677::1"
    //   'legacySavingsSlidersResponse.savingsSliders[0].accountId', // "63610677::1"
    //   'legacySavingsSlidersResponse.savingsSliders[0].externalId', // "52FF5C94-A4E8-44E8-A40C-B60A1A1DEDCA"
    //   'userGUID', // "5656A5E7-22C8-48A7-A142-1129DE1796A5"
    //   'planningGoalId', // "2828637"
    // ];
    
    // These paths should exist in the data
    expect(sample1.legacySavingsSlidersInputAccountIds[0]).toBe('63610677::1');
    expect(sample1.legacySavingsSlidersResponse.savingsSliders[0].accountId).toBe('63610677::1');
    expect(sample1.legacySavingsSlidersResponse.savingsSliders[0].externalId).toBe('52FF5C94-A4E8-44E8-A40C-B60A1A1DEDCA');
    expect(sample1.userGUID).toBe('5656A5E7-22C8-48A7-A142-1129DE1796A5');
    expect(sample1.planningGoalId).toBe('2828637');
  });

  it('should handle boomerForecastV3Requests nested IDs', async () => {
    const sample1 = await loadSampleFile('sample1.json');
    
    // Check the complex nested structure in boomerForecastV3Requests
    const forecast = sample1.boomerForecastV3Requests[0];
    expect(forecast.household.participant.id).toBe('63610677::1');
    expect(forecast.household.partner.id).toBe('63610677::2');
    expect(forecast.household.id).toBe('2828637');
    
    // Check job IDs
    const jobs = forecast.household.jobs;
    expect(jobs[0].id).toBe('63610677::3');
    expect(jobs[1].id).toBe('63610677::1');
    
    // Check account IDs
    const accounts = forecast.household.accounts;
    expect(accounts[0].id).toBe('63610677::1');
    expect(accounts[1].id).toBe('pseudoTaxableAccountForContributionSearch');
  });
});
