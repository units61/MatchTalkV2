import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens(true);

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import * as Sentry from '@sentry/react-native';

function App() {
  // 🚨 CRITICAL: App render edilmeden önce native exception handling'i aktif et
  React.useEffect(() => {
    try {
      // Native module'ü çağır (eğer mevcut ise)
      if (global.NativeModules && global.NativeModules.ExceptionsManagerFix) {
        global.NativeModules.ExceptionsManagerFix.setup();
      }
    } catch (e) {
      // Native module yoksa devam et
      Sentry.captureException(e instanceof Error ? e : new Error(String(e)), {
        level: 'warning',
        tags: { source: 'App.useEffect.nativeExceptionHandling' },
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <NavigationContainer
            onReady={() => {
              // Navigation hazır olduğunda Sentry'ye bildir
              Sentry.addBreadcrumb({
                category: 'navigation',
                message: 'NavigationContainer ready',
                level: 'info',
              });
            }}
            onStateChange={() => {
              // Navigation state değiştiğinde Sentry'ye bildir
              Sentry.addBreadcrumb({
                category: 'navigation',
                message: 'Navigation state changed',
                level: 'info',
              });
            }}>
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default App;
