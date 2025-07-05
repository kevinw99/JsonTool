import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock sample data for tests
const mockSimple1 = {
  name: "Test Object 1",
  value: 100,
  items: [
    { id: "item1", name: "Item 1" },
    { id: "item2", name: "Item 2" }
  ]
};

const mockSimple2 = {
  name: "Test Object 2", 
  value: 200,
  items: [
    { id: "item1", name: "Item 1 Modified" },
    { id: "item3", name: "Item 3" }
  ]
};

// Mock real sample data
const mockSample1 = {
  outputType: "SEARCH",
  legacySavingsSlidersInputAccountIds: ["63610677::1"],
  legacySavingsSlidersResponse: {
    savingsSliders: [{
      accountId: "63610677::1",
      currentSavingsNotch: {
        employeeContribution: {
          totalContributionDollars: 2500.0,
          contributions: [
            { type: "PRETAX" },
            { type: "AFTERTAX" },
            { type: "ROTH" },
            { type: "PRETAX50PLUS" },
            { type: "ROTH50PLUS" }
          ]
        },
        accountId: "63610677::1"
      },
      savingsNotches: Array.from({ length: 25 }, (_, i) => ({
        employeeContribution: {
          contributions: [
            { type: "PRETAX" },
            { type: "AFTERTAX" },
            { type: "ROTH" },
            { type: "PRETAX50PLUS" },
            { type: "ROTH50PLUS" }
          ]
        }
      }))
    }]
  },
  boomerForecastV3Requests: [{
    household: {
      participant: { id: "63610677::1" },
      partner: { id: "63610677::2" },
      id: "2828637",
      jobs: [
        { id: "63610677::3" },
        { id: "63610677::1" }
      ],
      accounts: [
        { id: "63610677::1" },
        { id: "pseudoTaxableAccountForContributionSearch" }
      ]
    }
  }],
  userGUID: "5656A5E7-22C8-48A7-A142-1129DE1796A5",
  planningGoalId: "2828637"
};

const mockSample2 = {
  outputType: "SEARCH",
  legacySavingsSlidersInputAccountIds: ["63610677::1"],
  legacySavingsSlidersResponse: {
    savingsSliders: [{
      accountId: "63610677::1",
      currentSavingsNotch: {
        employeeContribution: {
          totalContributionDollars: 2500.0,
          contributions: [
            { type: "PRETAX" },
            { type: "AFTERTAX" },
            { type: "ROTH" },
            { type: "PRETAX50PLUS" },
            { type: "ROTH50PLUS" }
          ]
        },
        accountId: "63610677::1"
      },
      savingsNotches: Array.from({ length: 25 }, (_, i) => ({
        employeeContribution: {
          contributions: [
            { type: "PRETAX" },
            { type: "AFTERTAX" },
            { type: "ROTH" },
            { type: "PRETAX50PLUS" },
            { type: "ROTH50PLUS" }
          ]
        }
      }))
    }]
  },
  boomerForecastV3Requests: [{
    household: {
      participant: { id: "63610677::1" },
      partner: { id: "63610677::2" },
      id: "2828637",
      jobs: [
        { id: "63610677::3" },
        { id: "63610677::1" }
      ],
      accounts: [
        { id: "63610677::1" },
        { id: "pseudoTaxableAccountForContributionSearch" }
      ]
    }
  }],
  userGUID: "5656A5E7-22C8-48A7-A142-1129DE1796A5",
  planningGoalId: "2828637"
};

// Mock fetch for test environment
global.fetch = vi.fn((url) => {
  if (typeof url === 'string') {
    if (url.includes('simple1.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSimple1)
      } as Response);
    }
    if (url.includes('simple2.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSimple2)
      } as Response);
    }
    if (url.includes('sample1.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSample1)
      } as Response);
    }
    if (url.includes('sample2.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSample2)
      } as Response);
    }
  }
  
  // Default response for unhandled URLs
  return Promise.reject(new Error(`Unhandled URL in tests: ${url}`));
}) as any;

// Mock scroll functions
Object.defineProperty(Element.prototype, 'scrollTo', {
  value: function(options: any) {
    if (typeof options === 'object') {
      this.scrollTop = options.top || 0;
      this.scrollLeft = options.left || 0;
    }
  },
  writable: true
});

Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: function() {
    // Mock implementation
  },
  writable: true
});

// Mock getBoundingClientRect
Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  value: function() {
    return {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 400,
      height: 100,
      x: 0,
      y: 0,
      toJSON: function() {}
    };
  },
  writable: true
});

// Mock closest method
Object.defineProperty(Element.prototype, 'closest', {
  value: function(selector: string) {
    if (selector === '.json-viewer-scroll-container') {
      const mockContainer = document.createElement('div');
      mockContainer.className = 'json-viewer-scroll-container';
      
      // Define properties properly
      Object.defineProperties(mockContainer, {
        scrollTop: { value: 0, writable: true },
        scrollHeight: { value: 1000, writable: true },
        clientHeight: { value: 400, writable: true }
      });
      
      // Mock getBoundingClientRect for container
      mockContainer.getBoundingClientRect = () => ({
        top: 0,
        left: 0,
        right: 400,
        bottom: 400,
        width: 400,
        height: 400,
        x: 0,
        y: 0,
        toJSON: function() {}
      });
      
      return mockContainer;
    }
    return null;
  },
  writable: true
});
