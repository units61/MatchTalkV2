/**
 * Error Tracking Utility
 * Prepared for integration with error tracking services (e.g., Sentry)
 */

import * as Sentry from '@sentry/react-native';
import { ErrorContext, ErrorSeverity } from './errorHandler';
import { config as appConfig } from '../lib/config';

export interface ErrorTrackingConfig {
  enabled: boolean;
  service?: 'sentry' | 'logrocket' | 'custom';
  dsn?: string;
  environment?: string;
  release?: string;
}

// Default configuration
const defaultConfig: ErrorTrackingConfig = {
  enabled: !__DEV__, // Production'da enabled
  environment: __DEV__ ? 'development' : 'production',
};

let trackingConfig: ErrorTrackingConfig = defaultConfig;

/**
 * Initialize error tracking service
 */
export function initErrorTracking(customConfig?: Partial<ErrorTrackingConfig>): void {
  // Wrap everything in try-catch to prevent crashes during initialization
  try {
    trackingConfig = { ...defaultConfig, ...customConfig };

    // Sentry zaten index.js'de init edilmiş - sadece config'i güncelle
    // Tekrar init etme, sadece trackingConfig'i güncelle
    if (__DEV__) {
      console.log('[ErrorTracking] Sentry already initialized in index.js, skipping re-init');
    }
    
    // Config'i güncelle
    const sentryDsn = customConfig?.dsn || appConfig.sentry.dsn;
    const isEnabled = trackingConfig.enabled && appConfig.sentry.enabled;
    
    if (!isEnabled || !sentryDsn || typeof sentryDsn !== 'string' || sentryDsn.trim() === '') {
      if (__DEV__) {
        console.log('[ErrorTracking] Sentry disabled or DSN not configured');
      }
      return;
    }
    
    // Sentry zaten init edilmiş, sadece config'i kaydet
    trackingConfig.enabled = isEnabled;
    trackingConfig.dsn = sentryDsn;
    
    if (__DEV__) {
      console.log('[ErrorTracking] Config updated, Sentry already initialized');
    }
  } catch (error) {
    // Top-level catch to prevent any crashes during error tracking setup
    if (__DEV__) {
      console.error('[ErrorTracking] Critical error during initialization:', error);
    }
  }
}

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
  if (!trackingConfig.enabled) {
    if (__DEV__) {
      console.log('[ErrorTracking] Message captured:', {
        message,
        severity,
        context,
      });
    }
    return;
  }

  // Send to Sentry - wrap in additional try-catch to prevent crashes
  try {
    if (!message || typeof message !== 'string') {
      if (__DEV__) {
        console.warn('[ErrorTracking] Invalid message:', message);
      }
      return;
    }

    const sentryLevel = severity === 'critical' ? 'fatal' : (severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info');

    // Safely convert context to tags
    const tags: Record<string, string> = {};
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
  if (!trackingConfig.enabled) {
    return;
  }

  // Set user context in Sentry
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
  if (!trackingConfig.enabled) {
    return;
  }

  // Clear user context in Sentry
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
  if (!trackingConfig.enabled) {
    return;
  }

  // Add breadcrumb to Sentry
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








