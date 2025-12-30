/**
 * Global Error Handler Utility
 * Provides centralized error handling, logging, and user-friendly error messages
 */

import * as Sentry from '@sentry/react-native';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additionalData?: Record<string, unknown>;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorInfo {
  message: string;
  originalError?: Error;
  severity: ErrorSeverity;
  context?: ErrorContext;
  timestamp: Date;
}

// User-friendly error message mappings
const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  'Network Error': 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.',
  'timeout': 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
  'Failed to fetch': 'Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.',
  
  // Authentication errors
  'Unauthorized': 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
  'Forbidden': 'Bu işlem için yetkiniz bulunmamaktadır.',
  'Token expired': 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
  
  // Validation errors
  'Validation error': 'Girdiğiniz bilgiler geçersiz. Lütfen kontrol edin.',
  'Invalid input': 'Girdiğiniz bilgiler geçersiz. Lütfen kontrol edin.',
  
  // Server errors
  'Internal Server Error': 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
  'Service Unavailable': 'Servis şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
  
  // WebSocket errors
  'WebSocket connection failed': 'Real-time bağlantı kurulamadı. Sayfayı yenileyin.',
  'Socket timeout': 'Bağlantı zaman aşımına uğradı. Sayfayı yenileyin.',
  
  // Default
  'default': 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
};

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error | string): string {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Check for exact matches first
  if (ERROR_MESSAGES[errorMessage]) {
    return ERROR_MESSAGES[errorMessage];
  }
  
  // Check for partial matches (case-insensitive)
  const lowerMessage = errorMessage.toLowerCase();
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return message;
    }
  }
  
  // Return default message
  return ERROR_MESSAGES.default;
}

/**
 * Determine error severity
 */
export function getErrorSeverity(error: Error | string, context?: ErrorContext): ErrorSeverity {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();
  
  // Critical errors
  if (
    lowerMessage.includes('critical') ||
    lowerMessage.includes('fatal') ||
    (context?.action === 'payment' && lowerMessage.includes('error'))
  ) {
    return 'critical';
  }
  
  // High severity errors
  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('token') ||
    lowerMessage.includes('authentication')
  ) {
    return 'high';
  }
  
  // Medium severity errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('server error') ||
    lowerMessage.includes('service unavailable')
  ) {
    return 'medium';
  }
  
  // Low severity (default)
  return 'low';
}

/**
 * Log error and send to Sentry
 */
export function logError(errorInfo: ErrorInfo): void {
  const {message, originalError, severity, context, timestamp} = errorInfo;
  
  // 404 hatalarını loglama (zaten kullanıcıya toast gösteriliyor)
  if (context?.additionalData?.status === 404 || message.includes('404') || message.includes('bulunamadı')) {
    // 404 hatalarını sessizce geç (gereksiz log spam'ini önle)
    return;
  }
  
  // Console logging (development)
  if (__DEV__) {
    console.error('[ErrorHandler]', {
      message,
      severity,
      context,
      timestamp: timestamp.toISOString(),
      originalError: originalError ? {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack,
      } : undefined,
    });
  }
  
  // Sentry'ye gönder
  try {
    const error = originalError || new Error(message);
    const sentryLevel = severity === 'critical' ? 'fatal' : (severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info');
    
    const tags: Record<string, string> = {
      source: 'errorHandler',
      severity: String(severity),
    };
    if (context) {
      if (context.component) tags.component = String(context.component);
      if (context.action) tags.action = String(context.action);
      if (context.userId) tags.userId = String(context.userId);
    }
    
    Sentry.captureException(error, {
      level: sentryLevel as 'fatal' | 'error' | 'warning' | 'info' | 'debug',
      tags,
      extra: {
        context,
        timestamp: timestamp.toISOString(),
      },
    });
  } catch (err) {
    // Sentry hatası olsa bile devam et
    if (__DEV__) {
      console.error('[ErrorHandler] Failed to send to Sentry:', err);
    }
  }
}

/**
 * Handle error and return user-friendly message
 */
export function handleError(
  error: Error | string,
  context?: ErrorContext
): {userMessage: string; severity: ErrorSeverity; shouldRetry: boolean} {
  const originalError = typeof error === 'string' ? new Error(error) : error;
  const userMessage = getUserFriendlyMessage(error);
  const severity = getErrorSeverity(error, context);
  
  const errorInfo: ErrorInfo = {
    message: originalError.message,
    originalError,
    severity,
    context,
    timestamp: new Date(),
  };
  
  logError(errorInfo);
  
  // Determine if error is retryable
  const shouldRetry = 
    severity === 'low' || 
    severity === 'medium' ||
    (typeof error === 'string' ? error : error.message).toLowerCase().includes('timeout') ||
    (typeof error === 'string' ? error : error.message).toLowerCase().includes('network');
  
  return {
    userMessage,
    severity,
    shouldRetry,
  };
}

/**
 * Create error handler function for specific context
 */
export function createErrorHandler(context: ErrorContext) {
  return (error: Error | string, additionalContext?: Partial<ErrorContext>) => {
    return handleError(error, {
      ...context,
      ...additionalContext,
    });
  };
}














