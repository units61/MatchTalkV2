/**
 * Error Tracking Utility
 * Sentry wrapper functions - Sentry is initialized in index.js
 */

import * as Sentry from '@sentry/react-native';
import { ErrorContext, ErrorSeverity } from './errorHandler';

// Sentry zaten index.js'de init edilmiş - bu dosya sadece wrapper fonksiyonlar sağlıyor

/**
 * Capture exception for error tracking
 */
export function captureException(
  error: Error,
  context?: ErrorContext,
  severity: ErrorSeverity = 'high'
): void {
  // Her zaman Sentry'ye gönder - trackingConfig.enabled kontrolü yapma
  // Çünkü Sentry zaten index.js'de init edilmiş ve her zaman aktif olmalı
  try {
    if (!error || typeof error !== 'object') {
      if (__DEV__) {
        console.warn('[ErrorTracking] Invalid error object:', error);
      }
      return;
    }

    const sentryLevel = severity === 'critical' ? 'fatal' : (severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info');

    // Safely convert context to tags
    const tags: Record<string, string> = {
      source: 'errorTracking',
      severity: String(severity),
    };
    if (context && typeof context === 'object') {
      Object.keys(context).forEach(key => {
        const value = context[key];
        if (value !== null && value !== undefined) {
          tags[key] = String(value);
        }
      });
    }

    // Sentry'ye gönder - her zaman
    Sentry.captureException(error, {
      level: sentryLevel as 'fatal' | 'error' | 'warning' | 'info' | 'debug',
      tags,
      extra: {
        context,
        severity,
      },
    });
  } catch (err) {
    // Silently fail - don't crash the app if Sentry capture fails
    if (__DEV__) {
      console.error('[ErrorTracking] Failed to capture exception:', err);
    }
  }
}

/**
 * Capture message for error tracking
 */
export function captureMessage(
  message: string,
  severity: ErrorSeverity = 'low',
  context?: ErrorContext
): void {
  // Her zaman Sentry'ye gönder
  try {
    if (!message || typeof message !== 'string') {
      if (__DEV__) {
        console.warn('[ErrorTracking] Invalid message:', message);
      }
      return;
    }

    const sentryLevel = severity === 'critical' ? 'fatal' : (severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info');

    // Safely convert context to tags
    const tags: Record<string, string> = {
      source: 'errorTracking',
      severity: String(severity),
    };
    if (context && typeof context === 'object') {
      Object.keys(context).forEach(key => {
        const value = context[key];
        if (value !== null && value !== undefined) {
          tags[key] = String(value);
        }
      });
    }

    Sentry.captureMessage(message, {
      level: sentryLevel as 'fatal' | 'error' | 'warning' | 'info' | 'debug',
      tags,
      extra: {
        context,
        severity,
      },
    });
  } catch (err) {
    // Silently fail - don't crash the app if Sentry capture fails
    if (__DEV__) {
      console.error('[ErrorTracking] Failed to capture message:', err);
    }
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, userData?: Record<string, unknown>): void {
  // Her zaman Sentry'ye gönder
  try {
    if (!userId || typeof userId !== 'string') {
      if (__DEV__) {
        console.warn('[ErrorTracking] Invalid userId:', userId);
      }
      return;
    }

    Sentry.setUser({
      id: userId,
      ...(userData && typeof userData === 'object' ? userData : {}),
    });
  } catch (err) {
    // Silently fail - don't crash the app
    if (__DEV__) {
      console.error('[ErrorTracking] Failed to set user context:', err);
    }
  }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  // Her zaman Sentry'ye gönder
  try {
    Sentry.setUser(null);
  } catch (err) {
    // Silently fail - don't crash the app
    if (__DEV__) {
      console.error('[ErrorTracking] Failed to clear user context:', err);
    }
  }
}

/**
 * Add breadcrumb for error tracking
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, unknown>
): void {
  // Her zaman Sentry'ye gönder
  try {
    if (!message || typeof message !== 'string') {
      if (__DEV__) {
        console.warn('[ErrorTracking] Invalid breadcrumb message:', message);
      }
      return;
    }

    Sentry.addBreadcrumb({
      message,
      category: category || 'default',
      level: level as 'fatal' | 'error' | 'warning' | 'info' | 'debug',
      data: data && typeof data === 'object' ? data : undefined,
    });
  } catch (err) {
    // Silently fail - don't crash the app
    if (__DEV__) {
      console.error('[ErrorTracking] Failed to add breadcrumb:', err);
    }
  }
}








