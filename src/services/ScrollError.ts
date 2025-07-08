export interface ScrollErrorContext {
  path?: string;
  element?: Element;
  viewer?: string;
  reason?: string;
  suggestions?: string[];
  availableElements?: Element[];
  nearMatches?: string[];
  containerInfo?: {
    found: boolean;
    selector: string;
    element?: Element;
  };
}

export class ScrollError extends Error {
  public readonly context: ScrollErrorContext;
  public readonly timestamp: number;
  public readonly operation: string;

  constructor(
    message: string, 
    context: ScrollErrorContext = {},
    operation: string = 'scroll'
  ) {
    super(message);
    this.name = 'ScrollError';
    this.context = context;
    this.timestamp = Date.now();
    this.operation = operation;

    // Ensure the error appears in stack traces
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ScrollError);
    }
  }

  /**
   * Get a detailed error report for debugging
   */
  getDetailedReport(): string {
    const lines = [
      `ScrollError: ${this.message}`,
      `Operation: ${this.operation}`,
      `Timestamp: ${new Date(this.timestamp).toISOString()}`,
    ];

    if (this.context.path) {
      lines.push(`Path: ${this.context.path}`);
    }

    if (this.context.viewer) {
      lines.push(`Viewer: ${this.context.viewer}`);
    }

    if (this.context.reason) {
      lines.push(`Reason: ${this.context.reason}`);
    }

    if (this.context.containerInfo) {
      lines.push(`Container: ${this.context.containerInfo.found ? 'Found' : 'Not Found'} (${this.context.containerInfo.selector})`);
    }

    if (this.context.availableElements?.length) {
      lines.push(`Available elements: ${this.context.availableElements.length}`);
    }

    if (this.context.nearMatches?.length) {
      lines.push(`Near matches: ${this.context.nearMatches.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Get suggestions for resolving the error
   */
  getSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.context.path) {
      suggestions.push(`Verify path format: ${this.context.path}`);
      
      if (this.context.nearMatches?.length) {
        suggestions.push(`Try similar paths: ${this.context.nearMatches.slice(0, 3).join(', ')}`);
      }
    }

    if (!this.context.containerInfo?.found) {
      suggestions.push('Check if scroll container is properly mounted');
      suggestions.push('Verify container has data-sync-scroll attribute');
    }

    if (this.context.availableElements?.length === 0) {
      suggestions.push('Element may not be expanded - try expanding parent containers first');
      suggestions.push('Check if element is rendered in DOM');
    }

    return suggestions;
  }

  /**
   * Create a user-friendly error for display
   */
  toUserMessage(): string {
    if (this.context.path) {
      return `Cannot navigate to "${this.context.path}". ${this.context.reason || 'Element not found.'}`;
    }
    
    return `Navigation failed. ${this.context.reason || this.message}`;
  }
}