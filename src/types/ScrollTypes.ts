export type ViewerId = 'left' | 'right';
export type ScrollBehavior = 'instant' | 'smooth';
export type ScrollAlignment = 'center' | 'top' | 'visible';
export type ScrollReason = 'manual' | 'navigation' | 'sync' | 'highlight' | 'alignment';

export interface ScrollTarget {
  element: Element;
  container: Element;
  viewer: ViewerId;
}

export interface ScrollOperation {
  targetElement: Element;
  targetViewer: ViewerId | 'both';
  scrollBehavior: ScrollBehavior;
  alignment: ScrollAlignment;
  reason: ScrollReason;
}

export interface NavigationRequest {
  type: 'path' | 'element' | 'alignment';
  target?: string | Element;
  viewer?: ViewerId | 'both';
  highlight?: boolean;
  expand?: boolean;
  scrollBehavior?: ScrollBehavior;
  alignment?: ScrollAlignment;
}

export interface ScrollValidationResult {
  success: boolean;
  target?: ScrollTarget;
  reason?: string;
  suggestions?: string[];
  nearMatches?: Element[];
}

export interface ScrollContainerInfo {
  element: Element;
  viewer: ViewerId;
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  clientHeight: number;
  clientWidth: number;
}