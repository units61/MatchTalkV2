/**
 * Analytics React Hook
 * Provides easy access to analytics tracking functions
 */

import {useCallback} from 'react';
import {
  trackEvent,
  trackPageView,
  trackScreenView,
  trackConversion,
  trackPerformance,
  getSessionId,
} from '../utils/analytics';

export function useAnalytics() {
  const track = useCallback(
    (
      eventType: string,
      eventData: Record<string, any> = {},
      metadata?: Record<string, any>,
    ) => {
      trackEvent(eventType, eventData, metadata);
    },
    [],
  );

  const trackPage = useCallback(
    (page: string, additionalData: Record<string, any> = {}) => {
      trackPageView(page, additionalData);
    },
    [],
  );

  const trackScreen = useCallback(
    (screen: string, additionalData: Record<string, any> = {}) => {
      trackScreenView(screen, additionalData);
    },
    [],
  );

  const trackConv = useCallback(
    (
      conversionType: string,
      value?: number,
      additionalData: Record<string, any> = {},
    ) => {
      trackConversion(conversionType, value, additionalData);
    },
    [],
  );

  const trackPerf = useCallback(
    (
      metricName: string,
      value: number,
      unit: string = 'ms',
      additionalData: Record<string, any> = {},
    ) => {
      trackPerformance(metricName, value, unit, additionalData);
    },
    [],
  );

  return {
    track,
    trackPage,
    trackScreen,
    trackConversion: trackConv,
    trackPerformance: trackPerf,
    sessionId: getSessionId(),
  };
}








