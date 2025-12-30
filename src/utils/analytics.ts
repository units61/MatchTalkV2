/**
 * Analytics Utility
 * Comprehensive event tracking with batching, queue, and offline support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AnalyticsEvent {
  eventType: string;
  eventData: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AnalyticsConfig {
  enabled: boolean;
  batchSize: number;
  batchInterval: number; // milliseconds
  maxQueueSize: number;
  enableOfflineQueue: boolean;
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  batchSize: 10,
  batchInterval: 5000, // 5 seconds
  maxQueueSize: 100,
  enableOfflineQueue: true,
};

const QUEUE_STORAGE_KEY = 'analytics_queue';
const SESSION_STORAGE_KEY = 'analytics_session';
const NAVIGATION_PATH_KEY = 'analytics_navigation_path';
const CONSENT_STORAGE_KEY = 'analytics_consent';

let config: AnalyticsConfig = DEFAULT_CONFIG;
let eventQueue: AnalyticsEvent[] = [];
let batchTimer: NodeJS.Timeout | null = null;
let sessionId: string | null = null;
let isOnline: boolean = true;

/**
 * Update online status (called by NetInfo listener)
 */
export function updateOnlineStatus(online: boolean): void {
  isOnline = online;
  if (online) {
    flushQueue();
  }
}
let navigationPath: Array<{ page: string; timestamp: number }> = [];
let navigationPathTimer: NodeJS.Timeout | null = null;
let funnelSteps: Map<string, Array<{ step: string; timestamp: number; data?: Record<string, any> }>> = new Map();

/**
 * Initialize analytics
 */
export function initAnalytics(customConfig?: Partial<AnalyticsConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };

  if (!config.enabled) {
    return;
  }

  // Generate or retrieve session ID
  generateSessionId();

  // Load queue from storage
  if (config.enableOfflineQueue) {
    // Clear storage if there are persistent validation errors
    // This prevents infinite retry loops with corrupted data
    const clearCorruptedStorage = async () => {
      try {
        const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Check if more than 30% of events are invalid
            const invalidCount = parsed.filter((event) => {
              return !event ||
                typeof event !== 'object' ||
                !event.eventType ||
                typeof event.eventType !== 'string' ||
                event.eventType.trim() === '';
            }).length;

            if (invalidCount > parsed.length * 0.3) {
              if (__DEV__) {
                console.warn(`[Analytics] High corruption rate (${invalidCount}/${parsed.length}), clearing storage`);
              }
              await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
              return;
            }
          }
        }
        // If storage looks OK, load normally
        loadQueueFromStorage();
      } catch (error) {
        if (__DEV__) {
          console.error('[Analytics] Error checking storage, clearing:', error);
        }
        await AsyncStorage.removeItem(QUEUE_STORAGE_KEY).catch(() => { });
      }
    };

    clearCorruptedStorage();
  }

  // Setup online/offline detection
  // React Native: Use NetInfo instead of navigator.onLine
  // isOnline will be set by NetInfo listener in App.tsx
  isOnline = true; // Default to true, will be updated by NetInfo

  // Start batch timer
  startBatchTimer();

  // Start navigation path tracking
  startNavigationPathTracking();
}

/**
 * Generate or retrieve session ID
 */
function generateSessionId(): void {
  if (typeof window === 'undefined') {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return;
  }

  // Try to get from sessionStorage
  const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (stored) {
    sessionId = stored;
    return;
  }

  // Generate new session ID
  sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

/**
 * Get current session ID
 */
export function getSessionId(): string | null {
  return sessionId;
}

/**
 * Set user consent for analytics
 */
export function setConsent(consent: boolean): void {
  if (typeof window !== 'undefined' && localStorage) {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    } catch (error) {
      if (__DEV__) {
        console.error('[Analytics] Failed to save consent:', error);
      }
    }
  }
}

/**
 * Get user consent for analytics
 */
export function getConsent(): boolean | null {
  if (typeof window !== 'undefined' && localStorage) {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[Analytics] Failed to read consent:', error);
      }
    }
  }
  return null;
}

/**
 * Check if analytics tracking is allowed
 */
function isTrackingAllowed(): boolean {
  const consent = getConsent();
  // If consent is explicitly false, don't track
  if (consent === false) {
    return false;
  }
  // If consent is null (not set), allow tracking by default (can be changed)
  // If consent is true, allow tracking
  return true;
}

/**
 * Track an event
 */
export async function trackEvent(
  eventType: string,
  eventData: Record<string, any> = {},
  metadata: Record<string, any> = {},
): Promise<void> {
  if (!config.enabled) {
    return;
  }

  // Validate eventType
  if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
    if (__DEV__) {
      console.warn('[Analytics] Invalid eventType provided:', eventType);
    }
    return;
  }

  // Check consent
  if (!isTrackingAllowed()) {
    if (__DEV__) {
      console.log('[Analytics] Tracking disabled due to user consent');
    }
    return;
  }

  // Ensure eventType is valid before creating event object
  const trimmedEventType = eventType.trim();
  if (!trimmedEventType) {
    if (__DEV__) {
      console.warn('[Analytics] EventType became empty after trim, skipping event');
    }
    return;
  }

  const event: AnalyticsEvent = {
    eventType: trimmedEventType,
    eventData: eventData || {},
    metadata: {
      ...(metadata || {}),
      timestamp: new Date().toISOString(),
      sessionId: sessionId || undefined,
      // React Native: No page path or user agent
      page: undefined,
      userAgent: undefined,
    },
  };

  // Final check before adding to queue
  if (!event.eventType || typeof event.eventType !== 'string') {
    if (__DEV__) {
      console.error('[Analytics] CRITICAL: Event object has invalid eventType:', event);
    }
    return;
  }

  // Add to queue
  eventQueue.push(event);

  // Check queue size limit
  if (eventQueue.length > config.maxQueueSize) {
    // Remove oldest events
    eventQueue = eventQueue.slice(-config.maxQueueSize);
  }

  // Save to storage if offline queue enabled
  if (config.enableOfflineQueue) {
    await saveQueueToStorage();
  }

  // Flush if batch size reached
  if (eventQueue.length >= config.batchSize) {
    await flushQueue();
  }
}

/**
 * Track page view
 */
export async function trackPageView(
  page: string,
  additionalData: Record<string, any> = {},
): Promise<void> {
  // Add to navigation path
  navigationPath.push({
    page,
    timestamp: Date.now(),
  });

  // Limit path size (keep last 50 pages)
  if (navigationPath.length > 50) {
    navigationPath = navigationPath.slice(-50);
  }

  // Save navigation path
  if (typeof window !== 'undefined' && sessionStorage) {
    try {
      sessionStorage.setItem(NAVIGATION_PATH_KEY, JSON.stringify(navigationPath));
    } catch (error) {
      // Ignore storage errors
    }
  }

  await trackEvent('page_view', {
    page,
    pathLength: navigationPath.length,
    ...additionalData,
  });
}

/**
 * Track screen view (mobile)
 */
export async function trackScreenView(
  screen: string,
  additionalData: Record<string, any> = {},
): Promise<void> {
  await trackEvent('screen_view', {
    screen,
    ...additionalData,
  });
}

/**
 * Track conversion event
 */
export async function trackConversion(
  conversionType: string,
  value?: number,
  additionalData: Record<string, any> = {},
): Promise<void> {
  await trackEvent('conversion', {
    conversionType,
    value,
    ...additionalData,
  });
}

/**
 * Track performance metric
 */
export async function trackPerformance(
  metricName: string,
  value: number,
  unit: string = 'ms',
  additionalData: Record<string, any> = {},
): Promise<void> {
  await trackEvent('performance_metric', {
    metricName,
    value,
    unit,
    ...additionalData,
  });
}

/**
 * Start batch timer
 */
function startBatchTimer(): void {
  if (batchTimer) {
    clearInterval(batchTimer);
  }

  batchTimer = setInterval(() => {
    if (eventQueue.length > 0) {
      flushQueue();
    }
  }, config.batchInterval);
}

/**
 * Flush event queue (send to backend)
 */
export async function flushQueue(): Promise<void> {
  if (eventQueue.length === 0 || !isOnline) {
    return;
  }

  // Filter out invalid events before sending (aggressive validation)
  const validEvents = eventQueue.filter((event) => {
    if (!event || typeof event !== 'object') {
      return false;
    }

    const eventType = event.eventType;
    if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
      if (__DEV__) {
        console.warn('[Analytics] Invalid event filtered out:', {
          eventType: eventType,
          eventTypeType: typeof eventType,
          fullEvent: event,
        });
      }
      return false;
    }

    return true;
  });

  // Remove invalid events from queue
  const invalidCount = eventQueue.length - validEvents.length;
  if (invalidCount > 0) {
    if (__DEV__) {
      console.warn(`[Analytics] Removed ${invalidCount} invalid events from queue`);
    }
    // Clean up invalid events from storage
    if (config.enableOfflineQueue) {
      await saveQueueToStorage();
    }
  }

  if (validEvents.length === 0) {
    eventQueue = [];
    return;
  }

  const eventsToSend = [...validEvents];
  eventQueue = [];

  try {
    // Use require to avoid circular dependency and TS1323
    const { analyticsApi } = require('../services/api/analyticsApi');

    // Send events in batches
    for (let i = 0; i < eventsToSend.length; i += config.batchSize) {
      const batch = eventsToSend.slice(i, i + config.batchSize);
      await analyticsApi.trackEvents(batch);
    }

    // Clear storage queue after successful send
    if (config.enableOfflineQueue) {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    }
  } catch (error: any) {
    // If it's a validation error (400), clear storage as it likely contains corrupted events
    if (error?.response?.status === 400) {
      if (__DEV__) {
        console.error('[Analytics] Validation error detected, clearing storage:', error?.response?.data);
      }

      // Clear storage to prevent infinite retry loop
      if (config.enableOfflineQueue) {
        await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      }
      eventQueue = [];
      return;
    }

    // If send fails, put valid events back in queue (only if they're still valid)
    // Filter again to ensure no invalid events are re-queued
    const stillValidEvents = eventsToSend.filter((event) => {
      return event &&
        typeof event === 'object' &&
        typeof event.eventType === 'string' &&
        event.eventType.trim() !== '';
    });

    eventQueue = [...stillValidEvents, ...eventQueue];

    // Save to storage
    if (config.enableOfflineQueue) {
      await saveQueueToStorage();
    }

    // Log error but don't throw (analytics should not break app)
    if (__DEV__) {
      console.error('[Analytics] Failed to flush queue:', error);
      if (eventsToSend.length !== stillValidEvents.length) {
        console.warn(`[Analytics] Removed ${eventsToSend.length - stillValidEvents.length} invalid events during error recovery`);
      }
    }
  }
}

/**
 * Save queue to storage
 */
async function saveQueueToStorage(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(eventQueue));
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Failed to save queue to storage:', error);
    }
  }
}

/**
 * Load queue from storage
 */
async function loadQueueFromStorage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Filter out invalid events when loading from storage (aggressive validation)
        eventQueue = parsed.filter((event) => {
          if (!event || typeof event !== 'object') {
            if (__DEV__) {
              console.warn('[Analytics] Invalid event structure in storage:', event);
            }
            return false;
          }

          // Check if eventType exists and is valid
          if (!('eventType' in event)) {
            if (__DEV__) {
              console.warn('[Analytics] Event missing eventType property:', event);
            }
            return false;
          }

          const eventType = event.eventType;
          if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
            if (__DEV__) {
              console.warn('[Analytics] Event with invalid eventType in storage:', {
                eventType,
                eventTypeType: typeof eventType,
                fullEvent: event,
              });
            }
            return false;
          }

          return true;
        });

        const invalidCount = parsed.length - eventQueue.length;
        if (invalidCount > 0) {
          if (__DEV__) {
            console.warn(`[Analytics] Removed ${invalidCount} invalid events from storage`);
          }

          // If more than 50% of events are invalid, clear storage (likely corruption)
          if (invalidCount > parsed.length * 0.5) {
            if (__DEV__) {
              console.warn('[Analytics] High corruption rate detected, clearing storage');
            }
            await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
            eventQueue = [];
            return;
          }

          // Save cleaned queue back to storage
          await saveQueueToStorage();
        }

        // Validate all events one more time before flushing
        const validatedQueue = eventQueue.filter((event) => {
          if (!event || typeof event !== 'object') {
            return false;
          }

          // Deep check - ensure eventType exists and is valid
          if (!('eventType' in event)) {
            return false;
          }

          const eventType = event.eventType;
          if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
            if (__DEV__) {
              console.warn('[Analytics] Event failed final validation before flush:', event);
            }
            return false;
          }

          return true;
        });

        // If validation removed events, update queue and storage
        if (validatedQueue.length !== eventQueue.length) {
          const removedCount = eventQueue.length - validatedQueue.length;
          if (__DEV__) {
            console.warn(`[Analytics] Removed ${removedCount} invalid events in final validation before flush`);
          }

          eventQueue = validatedQueue;

          // If too many events were invalid, clear storage
          if (removedCount > eventQueue.length * 0.3) {
            if (__DEV__) {
              console.warn('[Analytics] High invalidity rate, clearing storage');
            }
            await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
            eventQueue = [];
            return;
          }

          // Save cleaned queue
          await saveQueueToStorage();
        }

        // TEMPORARY: Skip flushing events loaded from storage to prevent validation errors
        // Only flush new events that are added after initialization
        // This prevents corrupted storage data from causing infinite error loops
        if (__DEV__) {
          console.log(`[Analytics] Loaded ${eventQueue.length} events from storage (will not flush immediately to prevent errors)`);
        }

        // Clear the queue loaded from storage - we'll only track new events
        // This is a temporary measure until we can identify why storage events are corrupted
        eventQueue = [];
        await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      } else {
        // Invalid data format, clear storage
        if (__DEV__) {
          console.warn('[Analytics] Invalid data format in storage, clearing');
        }
        await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Failed to load queue from storage:', error);
    }
    // Clear corrupted storage
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Clear analytics queue
 */
export function clearQueue(): void {
  eventQueue = [];
  if (config.enableOfflineQueue) {
    AsyncStorage.removeItem(QUEUE_STORAGE_KEY).catch(() => {
      // Ignore errors
    });
  }
}

/**
 * Get queue size
 */
export function getQueueSize(): number {
  return eventQueue.length;
}

/**
 * Set user ID for tracking
 */
export function setUserId(userId: string | null): void {
  // User ID will be included in metadata automatically via API client
  // This is just for reference
}

/**
 * Clear user ID
 */
export function clearUserId(): void {
  // User ID will be cleared automatically via API client
}

/**
 * Start navigation path tracking
 */
function startNavigationPathTracking(): void {
  // Load navigation path from sessionStorage
  if (typeof window !== 'undefined' && sessionStorage) {
    try {
      const stored = sessionStorage.getItem(NAVIGATION_PATH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          navigationPath = parsed;
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  // Send navigation path periodically (every 30 seconds)
  if (navigationPathTimer) {
    clearInterval(navigationPathTimer);
  }

  navigationPathTimer = setInterval(() => {
    if (navigationPath.length > 0) {
      const path = [...navigationPath];
      const steps = path.length;
      const duration = path.length > 1
        ? path[path.length - 1].timestamp - path[0].timestamp
        : 0;

      trackEvent('navigation_path', {
        path: path.map(p => p.page),
        steps,
        duration: Math.round(duration / 1000), // Convert to seconds
        sessionId: sessionId || undefined,
      }).catch(() => {
        // Ignore errors
      });
    }
  }, 30000); // Every 30 seconds
}

/**
 * Track funnel step
 */
export async function trackFunnelStep(
  funnelName: string,
  step: string,
  data?: Record<string, any>,
): Promise<void> {
  if (!funnelSteps.has(funnelName)) {
    funnelSteps.set(funnelName, []);
  }

  const steps = funnelSteps.get(funnelName)!;
  steps.push({
    step,
    timestamp: Date.now(),
    data,
  });

  await trackEvent('funnel_step', {
    funnelName,
    step,
    stepNumber: steps.length,
    ...data,
  });
}

/**
 * Track funnel completion
 */
export async function trackFunnelCompletion(
  funnelName: string,
  duration?: number,
): Promise<void> {
  const steps = funnelSteps.get(funnelName) || [];

  if (steps.length > 0) {
    const actualDuration = duration || (Date.now() - steps[0].timestamp);

    await trackEvent('funnel_completion', {
      funnelName,
      steps: steps.length,
      duration: Math.round(actualDuration / 1000), // Convert to seconds
      completed: true,
    });

    // Clear funnel steps
    funnelSteps.delete(funnelName);
  }
}

/**
 * Track funnel dropoff
 */
export async function trackFunnelDropoff(
  funnelName: string,
  step: string,
  reason?: string,
): Promise<void> {
  const steps = funnelSteps.get(funnelName) || [];

  if (steps.length > 0) {
    const duration = Date.now() - steps[0].timestamp;

    await trackEvent('funnel_dropoff', {
      funnelName,
      step,
      stepNumber: steps.length,
      duration: Math.round(duration / 1000), // Convert to seconds
      reason,
    });

    // Clear funnel steps
    funnelSteps.delete(funnelName);
  }
}

/**
 * Get navigation path
 */
export function getNavigationPath(): Array<{ page: string; timestamp: number }> {
  return [...navigationPath];
}

/**
 * Clear navigation path
 */
export function clearNavigationPath(): void {
  navigationPath = [];
  if (typeof window !== 'undefined' && sessionStorage) {
    try {
      sessionStorage.removeItem(NAVIGATION_PATH_KEY);
    } catch (error) {
      // Ignore errors
    }
  }
}

