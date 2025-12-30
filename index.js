import { registerRootComponent } from 'expo';
import App from './App';

// 🛡️ CRITICAL: Setup error handling BEFORE anything else
import { LogBox, ErrorUtils } from 'react-native';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Disable all warnings (production'da)
if (!__DEV__) {
  LogBox.ignoreAllLogs(true);
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
    Sentry.captureException(error, {
      level: isFatal ? 'fatal' : 'error',
      tags: {
        source: 'globalErrorHandler',
        isFatal: String(isFatal),
      },
    });
  } catch (sentryError) {
    // Sentry hatası olsa bile logla
    if (__DEV__) {
      console.error('[Sentry Capture Error]', sentryError);
    }
  }
  
  // Original handler'ı çağır (Expo'nun error recovery'sini engelleme)
  if (originalHandler && !error?.message?.includes('errorRecoveryQueue')) {
    try {
      originalHandler(error, isFatal);
    } catch (handlerError) {
      // Handler hatası olsa bile uygulama crash olmasın
      if (__DEV__) {
        console.error('[Original Handler Error]', handlerError);
      }
    }
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

