import { registerRootComponent } from 'expo';
import App from './App';

// 🛡️ CRITICAL: Setup comprehensive error handling BEFORE anything else
import { LogBox, ErrorUtils } from 'react-native';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Disable all warnings (production'da)
if (!__DEV__) {
  LogBox.ignoreAllLogs(true);
}

// Initialize Sentry FIRST - before any other code runs
let sentryInitialized = false;
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
      attachStacktrace: true,
      maxBreadcrumbs: 100,
      debug: __DEV__,
      beforeSend(event, hint) {
        // Tüm hataları gönder - hiçbir şeyi filtreleme
        return event;
      },
      onReady: ({didCallNativeInit}) => {
        sentryInitialized = true;
        if (__DEV__) {
          console.log('[Sentry] Initialized successfully, native:', didCallNativeInit);
        }
      },
    });
    sentryInitialized = true;
  }
} catch (error) {
  // Sentry init hatası olsa bile uygulama çalışsın
  if (__DEV__) {
    console.error('[Sentry Init Error]', error);
  }
}

// 🚨 CRITICAL: Override React Native's ExceptionsManager
// This prevents crashes from com.facebook.react.ExceptionsManagerQueue
if (global.__fbBatchedBridge) {
  try {
    // Override reportException if it exists
    const originalReportException = global.__fbBatchedBridge.reportException;
    if (originalReportException && typeof originalReportException === 'function') {
      global.__fbBatchedBridge.reportException = function(error, isFatal) {
        try {
          // Sentry'ye gönder
          if (sentryInitialized) {
            Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
              level: isFatal ? 'fatal' : 'error',
              tags: {
                source: 'reactNativeExceptionsManager',
                isFatal: String(isFatal),
                queue: 'ExceptionsManagerQueue',
              },
              extra: {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
              },
            });
          }
        } catch (e) {
          // Sentry hatası olsa bile devam et
        }
        // Original handler'ı çağırma - crash etme
        // return originalReportException.call(this, error, isFatal);
      };
    }
  } catch (e) {
    // Override hatası olsa bile devam et
  }
}

// 🚨 CRITICAL: Override ErrorUtils.setGlobalHandler to intercept ALL error handlers
if (global.ErrorUtils) {
  const originalSetGlobalHandler = global.ErrorUtils.setGlobalHandler;
  global.ErrorUtils.setGlobalHandler = function(handler) {
    // Tüm handler'ları wrap et
    if (handler && typeof handler === 'function') {
      const wrappedHandler = function(error, isFatal) {
        try {
          // Önce Sentry'ye gönder
          if (sentryInitialized) {
            Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
              level: isFatal ? 'fatal' : 'error',
              tags: {
                source: 'wrappedGlobalHandler',
                isFatal: String(isFatal),
                handlerType: handler.name || 'anonymous',
              },
              extra: {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
              },
            });
          }
        } catch (e) {
          // Sentry hatası olsa bile devam et
        }
        
        // Expo error recovery queue'sunu bypass et
        if (error?.message?.includes('errorRecoveryQueue') || 
            error?.stack?.includes('errorRecoveryQueue') ||
            String(error).includes('errorRecoveryQueue')) {
          // Expo error recovery hatası - sadece Sentry'ye gönder, crash etme
          return;
        }
        
        // React Native ExceptionsManagerQueue'yu bypass et
        if (error?.message?.includes('ExceptionsManager') || 
            error?.stack?.includes('ExceptionsManager') ||
            String(error).includes('ExceptionsManager')) {
          // React Native exception manager hatası - sadece Sentry'ye gönder, crash etme
          return;
        }
        
        // Diğer hatalar için de original handler'ı çağırma - sadece Sentry'ye gönder
        // try {
        //   handler(error, isFatal);
        // } catch (e) {
        //   // Handler hatası olsa bile crash etme
        // }
      };
      return originalSetGlobalHandler.call(this, wrappedHandler);
    }
    return originalSetGlobalHandler.call(this, handler);
  };
}

// Global error handler - Tüm hataları Sentry'ye gönder, crash etme
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  try {
    // Sentry'ye gönder
    if (sentryInitialized) {
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
    }
  } catch (sentryError) {
    // Sentry hatası olsa bile logla
    if (__DEV__) {
      console.error('[Sentry Capture Error]', sentryError);
    }
  }
  
  // Original handler'ı çağırma - hiçbir crash mekanizmasını çalıştırma
  // Sadece Sentry'ye gönder, crash etme
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

