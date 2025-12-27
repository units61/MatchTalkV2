/**
 * Analytics API Client
 * Handles communication with backend analytics endpoints
 */

import {apiClient} from '../../lib/apiClient';
import {AnalyticsEvent} from '../../utils/analytics';

export interface TrackEventRequest {
  eventType: string;
  eventData: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface TrackEventsRequest {
  events: TrackEventRequest[];
}

export const analyticsApi = {
  /**
   * Track a single event
   */
  async trackEvent(
    eventType: string,
    eventData: Record<string, any> = {},
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      // Analytics endpoint'leri data döndürmez, sadece success kontrolü yapılır
      await apiClient.post<void>('/analytics/track', {
        eventType,
        eventData,
        metadata,
      });
    } catch (error) {
      // Analytics errors should not break the app
      if (__DEV__) {
        console.error('[Analytics API] Failed to track event:', error);
      }
      throw error; // Re-throw for queue retry mechanism
    }
  },

  /**
   * Track multiple events in batch
   */
  async trackEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      // Filter out invalid events (missing eventType)
      const validEvents = events.filter((event) => {
        if (!event || typeof event.eventType !== 'string' || event.eventType.trim() === '') {
          if (__DEV__) {
            console.warn('[Analytics API] Skipping invalid event:', event);
          }
          return false;
        }
        return true;
      });

      if (validEvents.length === 0) {
        if (__DEV__) {
          console.warn('[Analytics API] No valid events to track');
        }
        return;
      }

      // Map events to requests, filtering out any that fail validation
      const requests: TrackEventRequest[] = validEvents
        .map((event): TrackEventRequest | null => {
          // Double-check eventType is valid (defensive programming)
          const eventType = event.eventType?.trim();
          if (!eventType) {
            if (__DEV__) {
              console.warn('[Analytics API] Skipping event with invalid eventType:', event);
            }
            return null; // Return null instead of throwing
          }
          
          return {
            eventType,
            eventData: event.eventData || {},
            metadata: event.metadata || {},
          };
        })
        .filter((req): req is TrackEventRequest => req !== null); // Filter out nulls

      // Don't send if all events were invalid
      if (requests.length === 0) {
        if (__DEV__) {
          console.warn('[Analytics API] All events were invalid, skipping send');
        }
        return;
      }

      // Final validation before sending - ensure no undefined eventType
      const finalRequests = requests.filter((req) => {
        if (!req.eventType || typeof req.eventType !== 'string' || req.eventType.trim() === '') {
          if (__DEV__) {
            console.error('[Analytics API] CRITICAL: Found invalid request after validation:', req);
          }
          return false;
        }
        return true;
      });

      if (finalRequests.length === 0) {
        if (__DEV__) {
          console.error('[Analytics API] CRITICAL: All requests failed final validation');
        }
        return;
      }

      if (finalRequests.length !== requests.length && __DEV__) {
        console.warn(`[Analytics API] Filtered out ${requests.length - finalRequests.length} invalid requests in final validation`);
      }

      // Log the request being sent (for debugging)
      if (__DEV__) {
        console.log('[Analytics API] Sending events:', {
          count: finalRequests.length,
          events: finalRequests.map(req => ({
            eventType: req.eventType,
            eventTypeType: typeof req.eventType,
            hasEventData: !!req.eventData,
            hasMetadata: !!req.metadata,
          })),
        });
        
        // Deep validation - check each request object structure
        finalRequests.forEach((req, index) => {
          if (!req.eventType || typeof req.eventType !== 'string') {
            console.error(`[Analytics API] CRITICAL: Request ${index} has invalid eventType:`, {
              request: req,
              eventType: req.eventType,
              eventTypeType: typeof req.eventType,
              keys: Object.keys(req),
            });
          }
        });
      }

      // One more final check - serialize and parse to catch any issues
      // Create a fresh array to avoid any reference issues
      const cleanRequests: TrackEventRequest[] = finalRequests.map((req) => {
        // Create a new object to ensure no hidden properties
        const cleanReq: TrackEventRequest = {
          eventType: String(req.eventType || '').trim(),
          eventData: req.eventData || {},
          metadata: req.metadata || {},
        };
        
        // Final validation
        if (!cleanReq.eventType || cleanReq.eventType === '') {
          throw new Error(`Invalid eventType in request: ${JSON.stringify(req)}`);
        }
        
        return cleanReq;
      }).filter((req): req is TrackEventRequest => {
        // Double-check after mapping
        return typeof req.eventType === 'string' && req.eventType.trim() !== '';
      });

      if (cleanRequests.length === 0) {
        if (__DEV__) {
          console.warn('[Analytics API] All requests were filtered out in final cleanup');
        }
        return;
      }

      if (cleanRequests.length !== finalRequests.length && __DEV__) {
        console.warn(`[Analytics API] Cleaned ${finalRequests.length - cleanRequests.length} requests in final cleanup`);
      }

      const requestBody = {
        events: cleanRequests,
      };

      // Analytics endpoint'leri data döndürmez, sadece success kontrolü yapılır
      await apiClient.post<void>('/analytics/track', requestBody);
    } catch (error) {
      // Analytics errors should not break the app
      if (__DEV__) {
        console.error('[Analytics API] Failed to track events:', error);
      }
      throw error; // Re-throw for queue retry mechanism
    }
  },

  /**
   * Delete user analytics data (GDPR)
   */
  async deleteUserData(userId: string): Promise<void> {
    try {
      await apiClient.delete(`/analytics/user/${userId}`);
    } catch (error) {
      if (__DEV__) {
        console.error('[Analytics API] Failed to delete user data:', error);
      }
      throw error;
    }
  },

  /**
   * Export user analytics data (GDPR)
   */
  async exportUserData(userId: string): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>(`/analytics/user/${userId}/export`);
      return response;
    } catch (error) {
      if (__DEV__) {
        console.error('[Analytics API] Failed to export user data:', error);
      }
      throw error;
    }
  },

  /**
   * Opt out from analytics tracking (GDPR)
   */
  async optOut(userId: string): Promise<void> {
    try {
      await apiClient.post(`/analytics/user/${userId}/opt-out`);
    } catch (error) {
      if (__DEV__) {
        console.error('[Analytics API] Failed to opt out:', error);
      }
      throw error;
    }
  },
};

