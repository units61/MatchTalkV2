import { registerRootComponent } from 'expo';
import App from './App';

// 🛡️ CRITICAL: Disable Expo error recovery BEFORE anything else
import { LogBox, ErrorUtils } from 'react-native';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Disable all warnings (production'da)
if (!__DEV__) {
  LogBox.ignoreAllLogs(true);
}

// 🚨 CRITICAL: Disable Expo's error recovery queue COMPLETELY
// This prevents SIGABRT crashes from expo.controller.errorRecoveryQueue
if (global.ErrorUtils) {
  const originalSetGlobalHandler = global.ErrorUtils.setGlobalHandler;
  global.ErrorUtils.setGlobalHandler = function(handler) {
    // Expo'nun error recovery handler'ını engelle
    if (handler && typeof handler === 'function') {
      const wrappedHandler = function(error, isFatal) {
        // Expo'nun error recovery queue'sunu bypass et
        if (error?.message?.includes('errorRecoveryQueue') || 
            error?.stack?.includes('errorRecoveryQueue') ||
            String(error).includes('errorRecoveryQueue')) {
          // Expo error recovery hatası - sadece Sentry'ye gönder, crash etme
          try {
            Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
              level: 'error',
              tags: {
                source: 'expoErrorRecovery',
                blocked: 'true',
              },
            });
          } catch (e) {
            // Sentry hatası olsa bile devam et
          }
          return; // Crash etme
        }
        // Diğer hatalar için normal handler'ı çağır
        try {
          handler(error, isFatal);
        } catch (e) {
          // Handler hatası olsa bile crash etme
        }
      };
      return originalSetGlobalHandler.call(this, wrappedHandler);
    }
    return originalSetGlobalHandler.call(this, handler);
  };
}

// Initialize Sentry FIRST before setting error handlers
try {
  const sentryDsn = Constants.expoConfig?.extra?.SENTRY_DSN;
  const sentryEnabled = Constants.expoConfig?.extra?.SENTRY_ENABLED === 'true';
  
  if (sentryEnabled && sentryDsn && typeof sentryDsn === 'string' && sentryDsn.trim() !== '') {
    Sentry.init({
      dsn: sentryDsn,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
      enableNative: true,
      enableNativeCrashHandling: true, // Native crash'leri de yakala
      debug: __DEV__,
      beforeSend(event, hint) {
        // Tüm hataları gönder
        return event;
      },
    });
  }
} catch (error) {
  // Sentry init hatası olsa bile uygulama çalışsın
  if (__DEV__) {
    console.error('[Sentry Init Error]', error);
  }
}

// Global error handler - Tüm hataları Sentry'ye gönder
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  try {
    // Sentry'ye gönder
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      level: isFatal ? 'fatal' : 'error',
      tags: {
        source: 'globalErrorHandler',
        isFatal: String(isFatal),
      },
      extra: {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
    });
  } catch (sentryError) {
    // Sentry hatası olsa bile logla
    if (__DEV__) {
      console.error('[Sentry Capture Error]', sentryError);
    }
  }
  
  // Original handler'ı çağırma - Expo'nun error recovery'sini tamamen bypass et
  // Sadece Sentry'ye gönder, crash etme
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

