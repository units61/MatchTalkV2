/**
 * Performance Monitoring Utility
 * Tracks performance metrics for React Native
 */

import { Platform } from 'react-native';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
}

export type PerformanceCallback = (metric: PerformanceMetric) => void;

/**
 * Performance thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  LCP: {good: 2500, poor: 4000}, // Largest Contentful Paint
  FID: {good: 100, poor: 300}, // First Input Delay
  CLS: {good: 0.1, poor: 0.25}, // Cumulative Layout Shift
  FCP: {good: 1800, poor: 3000}, // First Contentful Paint
  TTFB: {good: 800, poor: 1800}, // Time to First Byte
} as const;

/**
 * Get performance rating based on threshold
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = PERFORMANCE_THRESHOLDS[name as keyof typeof PERFORMANCE_THRESHOLDS];
  if (!threshold) {
    return 'good';
  }

  if (value <= threshold.good) {
    return 'good';
  } else if (value <= threshold.poor) {
    return 'needs-improvement';
  } else {
    return 'poor';
  }
}

/**
 * Report Web Vitals (React Native compatible - no-op for now)
 * Can be extended with React Native performance APIs
 */
export function reportWebVitals(onPerfEntry?: PerformanceCallback): void {
  if (!onPerfEntry || Platform.OS !== 'web') {
    return;
  }

  // For web platform, web-vitals can be used if needed
  // For React Native, we skip this as web-vitals is web-only
  if (__DEV__) {
    console.log('[Performance] Web Vitals reporting skipped on native platform');
  }
}

/**
 * Measure function execution time
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T,
  callback?: (duration: number) => void
): T {
  const start = Date.now();
  const result = fn();
  const end = Date.now();
  const duration = end - start;

  if (__DEV__) {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  callback?.(duration);
  return result;
}

/**
 * Measure async function execution time
 */
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>,
  callback?: (duration: number) => void
): Promise<T> {
  const start = Date.now();
  const result = await fn();
  const end = Date.now();
  const duration = end - start;

  if (__DEV__) {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  callback?.(duration);
  return result;
}

/**
 * Create performance mark (React Native compatible)
 */
export function mark(name: string): void {
  if (__DEV__) {
    console.log(`[Performance] Mark: ${name}`);
  }
}

/**
 * Measure between two marks (React Native compatible)
 */
export function measure(measureName: string, startMark: string, endMark?: string): PerformanceEntry | null {
  if (__DEV__) {
    console.log(`[Performance] Measure: ${measureName} (${startMark} -> ${endMark || 'now'})`);
  }
  return null;
}

/**
 * Get all performance entries (React Native compatible)
 */
export function getPerformanceEntries(): PerformanceEntry[] {
  return [];
}

/**
 * Clear performance entries (React Native compatible)
 */
export function clearPerformanceEntries(): void {
  if (__DEV__) {
    console.log('[Performance] Performance entries cleared');
  }
}

/**
 * Track bundle size (for development)
 */
export function trackBundleSize(): void {
  if (__DEV__) {
    console.log('[Performance] Bundle size tracking not available on native platform');
  }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): void {
  if (__DEV__) {
    console.log('[Performance] Performance monitoring initialized');
    
    // Mark app start
    mark('app-start');
    
    // Track initial load time
    const loadTime = Date.now();
    console.log(`[Performance] Initial load time: ${loadTime}`);
  }
  
  // Web Vitals reporting is skipped on native platforms
  // Can be extended with React Native performance APIs if needed
}
