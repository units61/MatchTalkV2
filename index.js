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

// 🚨 CRITICAL: Override React Native's ExceptionsManager COMPLETELY
// This prevents crashes from com.facebook.react.ExceptionsManagerQueue
// Native tarafında çalıştığı için JavaScript override yeterli değil
// Bu yüzden hem JavaScript hem de native bridge'i override ediyoruz

// 1. JavaScript bridge override
if (global.__fbBatchedBridge) {
  try {
    // reportException'ı tamamen devre dışı bırak
    if (global.__fbBatchedBridge.reportException) {
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
                bypassed: 'true',
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
        return;
      };
    }
    
    // reportFatalError'ı da override et
    if (global.__fbBatchedBridge.reportFatalError) {
      global.__fbBatchedBridge.reportFatalError = function(error) {
        try {
          if (sentryInitialized) {
            Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
              level: 'fatal',
              tags: {
                source: 'reactNativeFatalError',
                bypassed: 'true',
              },
            });
          }
        } catch (e) {}
        return;
      };
    }
  } catch (e) {
    // Override hatası olsa bile devam et
  }
}

// 2. Native Modules exception handling'i override et
if (global.nativeCallSyncHook) {
  try {
    const originalNativeCallSyncHook = global.nativeCallSyncHook;
    global.nativeCallSyncHook = function(module, method, args) {
      try {
        return originalNativeCallSyncHook.call(this, module, method, args);
      } catch (error) {
        // Native call hatası - Sentry'ye gönder ama crash etme
        if (sentryInitialized) {
          Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
            level: 'error',
            tags: {
              source: 'nativeCallSyncHook',
              module: String(module),
              method: String(method),
            },
          });
        }
        // Exception'ı yeniden fırlatma - crash etme
        return null;
      }
    };
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

// 🚨 CRITICAL: Global error handler - Tüm hataları Sentry'ye gönder, crash etme
// React Native'in exception handling'ini tamamen bypass et
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
          bypassed: 'true',
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
  
  // 🚨 CRITICAL: Original handler'ı çağırma - hiçbir crash mekanizmasını çalıştırma
  // React Native'in ExceptionsManagerQueue'suna gitmesini engelle
  // Sadece Sentry'ye gönder, crash etme
});

// 🚨 CRITICAL: Promise rejection'ları da yakala
if (global.Promise) {
  const originalPromiseRejectionTracker = global.Promise;
  // Unhandled promise rejection'ları yakala
  if (typeof global.addEventListener === 'function') {
    global.addEventListener('unhandledrejection', (event) => {
      try {
        if (sentryInitialized) {
          Sentry.captureException(
            event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
            {
              level: 'error',
              tags: {
                source: 'unhandledPromiseRejection',
                bypassed: 'true',
              },
            }
          );
        }
      } catch (e) {}
      // Event'i prevent et - crash etme
      event.preventDefault();
    });
  }
}

// 🚨 CRITICAL: Native exception handling'i aktif et
// iOS native tarafında exception handling override'ı
try {
  // Native module'ü çağır (eğer mevcut ise)
  if (global.NativeModules && global.NativeModules.ExceptionsManagerFix) {
    global.NativeModules.ExceptionsManagerFix.setup();
  }
} catch (e) {
  // Native module yoksa devam et
  if (__DEV__) {
    console.log('[Native Exception Handling] Not available in this build');
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

