import { ScrollError } from './ScrollError';
import type {
  NavigationRequest,
  ScrollValidationResult,
  ScrollContainerInfo,
  ViewerId,
  ScrollBehavior,
  ScrollAlignment
} from '../types/ScrollTypes';
import type { ViewerPath } from '../utils/PathTypes';
import { createViewerPath, extractViewerId, viewerPathToGeneric, validateAndCreateNumericPath, isViewerPath } from '../utils/PathTypes';

/**
 * Unified ScrollService - Single source of truth for all scrolling operations
 * 
 * Replaces:
 * - SyncScroll manual synchronization
 * - goToDiffWithPaths navigation
 * - performSmartSyncAlignment
 * - JsonNode auto-scroll
 * - syncToCounterpart cross-viewer matching
 * - ID key navigation
 */
export class ScrollService {
  // Global sync state - replaces individual component refs
  private static isSyncEnabled = true;
  private static isSyncOperation = false;
  private static syncDebounceTimeout: NodeJS.Timeout | null = null;

  // Container selectors - unified across all components
  private static readonly SCROLL_CONTAINER_SELECTOR = '[data-sync-scroll]';
  private static readonly SYNC_GROUP_ATTRIBUTE = 'data-sync-scroll';

  /**
   * Main navigation entry point - replaces all navigation functions
   */
  static async navigate(request: NavigationRequest): Promise<void> {
    try {
      console.log('[ScrollService] Navigate request:', request);

      switch (request.type) {
        case 'path':
          if (!request.target || typeof request.target !== 'string') {
            throw new ScrollError('Path navigation requires string target', { 
              reason: 'Invalid target type',
              path: String(request.target)
            });
          }
          await this.navigateToPath(request.target, request);
          break;

        case 'element':
          if (!request.target || typeof request.target === 'string') {
            throw new ScrollError('Element navigation requires Element target', {
              reason: 'Invalid target type'
            });
          }
          await this.navigateToElement(request.target, request);
          break;

        case 'alignment':
          await this.performAlignment(request);
          break;

        default:
          throw new ScrollError(`Unknown navigation type: ${(request as any).type}`, {
            reason: 'Invalid navigation type'
          });
      }

      console.log('[ScrollService] Navigation completed successfully');
    } catch (error) {
      if (error instanceof ScrollError) {
        console.error('[ScrollService] Navigation failed:', error.getDetailedReport());
        throw error;
      } else {
        const scrollError = new ScrollError(
          `Navigation failed: ${error instanceof Error ? error.message : String(error)}`,
          { reason: 'Unexpected error' },
          'navigate'
        );
        console.error('[ScrollService] Unexpected error:', scrollError.getDetailedReport());
        throw scrollError;
      }
    }
  }

  /**
   * Navigate to a specific path (replaces goToDiff, goToDiffWithPaths)
   */
  private static async navigateToPath(path: string, request: NavigationRequest): Promise<void> {
    const viewer = request.viewer || 'both';
    
    // Convert generic path to ViewerPath format for proper element targeting
    const viewerPaths: ViewerPath[] = [];
    
    if (viewer === 'both' || viewer === 'left') {
      try {
        const numericPath = validateAndCreateNumericPath(path, 'ScrollService.navigateToPath.left');
        viewerPaths.push(createViewerPath('left', numericPath));
      } catch (error) {
        console.warn(`[ScrollService] Could not create left viewer path for ${path}:`, error);
      }
    }
    
    if (viewer === 'both' || viewer === 'right') {
      try {
        const numericPath = validateAndCreateNumericPath(path, 'ScrollService.navigateToPath.right');
        viewerPaths.push(createViewerPath('right', numericPath));
      } catch (error) {
        console.warn(`[ScrollService] Could not create right viewer path for ${path}:`, error);
      }
    }
    
    if (viewerPaths.length === 0) {
      throw new ScrollError(`Could not create ViewerPath for "${path}"`, {
        path,
        viewer: String(viewer),
        reason: 'Invalid path format for ViewerPath creation',
        suggestions: [
          'Ensure path is in numeric format (not ID-based)',
          'Check path syntax is correct'
        ]
      });
    }
    
    // Find elements immediately - fail fast if not found
    const foundElements: Element[] = [];
    for (const viewerPath of viewerPaths) {
      const element = this.findElementByViewerPath(viewerPath);
      if (element) {
        foundElements.push(element);
      }
    }
    
    if (foundElements.length === 0) {
      throw new ScrollError(`Element not found for path "${path}"`, {
        path,
        viewer: String(viewer),
        reason: 'Element not found in DOM - likely not expanded or does not exist',
        suggestions: [
          'Ensure parent containers are expanded before navigation',
          'Check if path is correct',
          'Verify element exists in the data',
          `Generated ViewerPaths: ${viewerPaths.join(', ')}`
        ]
      });
    }

    // Temporarily disable sync during navigation
    const wasEnabled = this.isSyncEnabled;
    if (wasEnabled) {
      this.disableSync();
    }

    try {
      // Scroll to all found targets
      const scrollPromises = foundElements.map(element => 
        this.scrollToElement(element, {
          scrollBehavior: request.scrollBehavior || 'smooth',
          alignment: request.alignment || 'center'
        })
      );

      await Promise.all(scrollPromises);

      // Re-enable sync immediately after navigation
      if (wasEnabled) {
        this.enableSync();
      }


    } catch (error) {
      // Re-enable sync on error
      if (wasEnabled) {
        this.enableSync();
      }
      throw error;
    }
  }

  /**
   * Navigate to a specific element (replaces scrollElementIntoView)
   */
  private static async navigateToElement(element: Element, request: NavigationRequest): Promise<void> {
    const validation = this.validateScrollTarget(element);
    if (!validation.success) {
      throw new ScrollError(`Cannot scroll to element: ${validation.reason}`, {
        element,
        reason: validation.reason
      });
    }

    await this.scrollToElement(element, {
      scrollBehavior: request.scrollBehavior || 'smooth',
      alignment: request.alignment || 'center'
    });
  }

  /**
   * Perform smart alignment between viewers (replaces performSmartSyncAlignment)
   */
  private static async performAlignment(_request: NavigationRequest): Promise<void> {
    const leftContainer = this.findScrollContainer('left');
    const rightContainer = this.findScrollContainer('right');

    if (!leftContainer || !rightContainer) {
      throw new ScrollError('Cannot perform alignment: containers not found', {
        containerInfo: {
          found: !!(leftContainer && rightContainer),
          selector: this.SCROLL_CONTAINER_SELECTOR
        }
      });
    }

    // Find target element in left viewer (highlighted or center)
    const targetElement = this.findAlignmentTarget(leftContainer);
    if (!targetElement) {
      throw new ScrollError('No alignment target found in left viewer', {
        reason: 'No highlighted or center element found'
      });
    }

    const targetPath = targetElement.getAttribute('data-path');
    if (!targetPath) {
      throw new ScrollError('Alignment target missing data-path attribute', {
        element: targetElement,
        reason: 'Missing data-path attribute'
      });
    }

    // Find corresponding element in right viewer
    const correspondingElement = rightContainer.querySelector(`[data-path="${targetPath}"]`);
    if (!correspondingElement) {
      throw new ScrollError(`No corresponding element found in right viewer for path: ${targetPath}`, {
        path: targetPath,
        reason: 'Corresponding element not found'
      });
    }

    // Scroll right viewer to align with left
    await this.scrollToElement(correspondingElement, {
      scrollBehavior: 'smooth',
      alignment: 'center'
    });
  }

  /**
   * Core scrolling function - replaces all scroll implementations
   */
  private static async scrollToElement(
    element: Element, 
    options: { scrollBehavior: ScrollBehavior; alignment: ScrollAlignment }
  ): Promise<void> {
    const container = this.findScrollContainerForElement(element);
    if (!container) {
      throw new ScrollError('No scroll container found for element', {
        element,
        containerInfo: {
          found: false,
          selector: this.SCROLL_CONTAINER_SELECTOR
        }
      });
    }

    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    let targetScrollTop: number;

    switch (options.alignment) {
      case 'center':
        targetScrollTop = container.scrollTop + 
          (elementRect.top + elementRect.height / 2) - 
          (containerRect.top + containerRect.height / 2);
        break;
      case 'top':
        targetScrollTop = container.scrollTop + elementRect.top - containerRect.top;
        break;
      case 'visible':
        // Only scroll if element is not visible
        const isVisible = elementRect.top >= containerRect.top && 
          elementRect.bottom <= containerRect.bottom;
        if (isVisible) return;
        targetScrollTop = container.scrollTop + elementRect.top - containerRect.top;
        break;
    }

    targetScrollTop = Math.max(0, Math.min(targetScrollTop, container.scrollHeight - container.clientHeight));


    return new Promise((resolve) => {
      container.scrollTo({
        top: targetScrollTop,
        behavior: options.scrollBehavior
      });

      // Wait for scroll to complete
      if (options.scrollBehavior === 'smooth') {
        setTimeout(resolve, 200);
      } else {
        resolve();
      }
    });
  }

  /**
   * Sync control - replaces CSS class and timeout management
   */
  static enableSync(): void {
    this.isSyncEnabled = true;
    const containers = document.querySelectorAll(this.SCROLL_CONTAINER_SELECTOR);
    containers.forEach(container => {
      container.classList.remove('temp-disable-sync');
    });
    console.log('[ScrollService] Sync enabled');
  }

  static disableSync(): void {
    this.isSyncEnabled = false;
    const containers = document.querySelectorAll(this.SCROLL_CONTAINER_SELECTOR);
    containers.forEach(container => {
      container.classList.add('temp-disable-sync');
    });
    console.log('[ScrollService] Sync disabled');
  }

  static get isSyncActive(): boolean {
    return this.isSyncEnabled && !this.isSyncOperation;
  }

  /**
   * Manual sync handling - replaces SyncScroll component logic
   */
  static handleManualScroll(sourceContainer: Element): void {
    if (!this.isSyncActive || this.isSyncOperation) {
      return;
    }

    if (sourceContainer.classList.contains('temp-disable-sync')) {
      return;
    }

    this.isSyncOperation = true;

    // Clear existing debounce
    if (this.syncDebounceTimeout) {
      clearTimeout(this.syncDebounceTimeout);
    }

    // Find all peer containers
    const syncGroup = sourceContainer.getAttribute(this.SYNC_GROUP_ATTRIBUTE);
    if (!syncGroup) return;

    const peerContainers = document.querySelectorAll(
      `${this.SCROLL_CONTAINER_SELECTOR}[${this.SYNC_GROUP_ATTRIBUTE}="${syncGroup}"]`
    );

    // Sync scroll position to peers
    peerContainers.forEach(container => {
      if (container !== sourceContainer) {
        container.scrollTop = sourceContainer.scrollTop;
        container.scrollLeft = sourceContainer.scrollLeft;
      }
    });

    // Reset sync operation flag after debounce
    this.syncDebounceTimeout = setTimeout(() => {
      this.isSyncOperation = false;
    }, 50);
  }

  /**
   * Validation and utility functions
   */
  static validateScrollTarget(element: Element): ScrollValidationResult {
    if (!element || !element.isConnected) {
      return {
        success: false,
        reason: 'Element not found or not connected to DOM'
      };
    }

    const container = this.findScrollContainerForElement(element);
    if (!container) {
      return {
        success: false,
        reason: 'No scroll container found for element',
        suggestions: ['Check if container has data-sync-scroll attribute']
      };
    }

    const viewer = this.getViewerFromContainer(container);
    if (!viewer) {
      return {
        success: false,
        reason: 'Cannot determine viewer for container'
      };
    }

    return {
      success: true,
      target: { element, container, viewer }
    };
  }

  static findScrollContainer(viewer: ViewerId): Element | null {
    return document.querySelector(`${this.SCROLL_CONTAINER_SELECTOR}[data-viewer="${viewer}"]`);
  }

  static findScrollContainerForElement(element: Element): Element | null {
    return element.closest(this.SCROLL_CONTAINER_SELECTOR);
  }

  static findElementByPath(path: string, viewer?: ViewerId): Element | null {
    const selector = viewer 
      ? `${this.SCROLL_CONTAINER_SELECTOR}[data-viewer="${viewer}"] [data-path="${path}"]`
      : `[data-path="${path}"]`;
    
    return document.querySelector(selector);
  }

  static findElementByViewerPath(viewerPath: ViewerPath): Element | null {
    // Validate ViewerPath format strictly
    if (!isViewerPath(viewerPath)) {
      throw new ScrollError(`Invalid ViewerPath format: "${viewerPath}"`, {
        reason: 'ViewerPath must start with "left_" or "right_"',
        suggestions: ['Use createViewerPath() to create valid ViewerPaths']
      });
    }
    
    // Extract viewer ID for container lookup
    const viewerId = extractViewerId(viewerPath);
    if (!viewerId) {
      throw new ScrollError(`Could not extract viewer ID from ViewerPath: ${viewerPath}`, {
        reason: 'Invalid ViewerPath format'
      });
    }
    
    // Use the specific viewer container to find the element
    const container = this.findScrollContainer(viewerId);
    if (!container) {
      throw new ScrollError(`No scroll container found for viewer: ${viewerId}`, {
        viewer: viewerId,
        reason: 'Container missing data-viewer attribute or not found'
      });
    }
    
    // Look for the element using the full ViewerPath
    // DOM elements have data-path in ViewerPath format: "left_root.path" or "right_root.path"
    const element = container.querySelector(`[data-path="${viewerPath}"]`);
    
    return element;
  }

  private static getViewerFromContainer(container: Element): ViewerId | null {
    const viewer = container.getAttribute('data-viewer');
    return (viewer === 'left' || viewer === 'right') ? viewer : null;
  }

  private static findAlignmentTarget(container: Element): Element | null {
    // First try highlighted elements
    let target = container.querySelector('.highlighted-node, .persistent-highlight');
    if (target) return target;

    // Fallback to center element
    const rect = container.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const elements = container.querySelectorAll('[data-path]');
    
    let closestElement: Element | null = null;
    let closestDistance = Infinity;

    elements.forEach(element => {
      const elementRect = element.getBoundingClientRect();
      const distance = Math.abs(elementRect.top + elementRect.height / 2 - centerY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestElement = element;
      }
    });

    return closestElement;
  }

  /**
   * Get container information for debugging
   */
  static getContainerInfo(viewer?: ViewerId): ScrollContainerInfo[] {
    const selector = viewer 
      ? `${this.SCROLL_CONTAINER_SELECTOR}[data-viewer="${viewer}"]`
      : this.SCROLL_CONTAINER_SELECTOR;
    
    const containers = document.querySelectorAll(selector);
    
    return Array.from(containers).map(container => {
      const viewerAttr = container.getAttribute('data-viewer');
      return {
        element: container,
        viewer: (viewerAttr === 'left' || viewerAttr === 'right') ? viewerAttr : 'left',
        scrollTop: container.scrollTop,
        scrollLeft: container.scrollLeft,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        clientWidth: container.clientWidth
      };
    });
  }
}